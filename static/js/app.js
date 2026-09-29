/**
 * AI 여행 플래너 클라이언트 스크립트 (app.js)
 * - 폼 제출 및 유효성 검증
 * - 실시간 스트리밍 상태 수신 ([웹 검색중입니다.] -> [일정 설계 중])
 * - Markdown 렌더링, 클립보드 복사, .md 다운로드 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 캐싱
    const travelForm = document.getElementById('travel-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const formError = document.getElementById('form-error');

    // 결과 표시 관련 DOM
    const placeholderBox = document.getElementById('placeholder-box');
    const loadingBox = document.getElementById('loading-box');
    const loadingTitle = document.getElementById('loading-title');
    const loadingDesc = document.getElementById('loading-desc');
    const apiErrorBox = document.getElementById('api-error-box');
    const resultContentWrapper = document.getElementById('result-content-wrapper');
    const renderedMarkdown = document.getElementById('rendered-markdown');
    const resultActions = document.getElementById('result-actions');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');

    let currentRawPlan = '';
    let currentDestination = '여행지';

    // 2. 폼 제출 이벤트 리스너
    travelForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 2-1. 입력값 가져오기
        const destination = document.getElementById('destination').value.trim();
        const duration = document.getElementById('duration').value.trim();
        const budget = document.getElementById('budget').value.trim();
        const interests = document.getElementById('interests').value.trim();
        const companions = document.getElementById('companions').value.trim();
        const transportation = document.getElementById('transportation').value.trim();
        const accommodation = document.getElementById('accommodation').value.trim();
        const promptTypeRadio = document.querySelector('input[name="prompt_type"]:checked');
        const promptType = promptTypeRadio ? promptTypeRadio.value : 'A';

        // 2-2. 유효성 검증 (7가지 필수 항목 체크)
        const missingFields = [];
        if (!destination) missingFields.push('1. 여행지');
        if (!duration) missingFields.push('2. 여행 기간');
        if (!budget) missingFields.push('3. 여행 예산');
        if (!interests) missingFields.push('4. 관심사 및 선호 활동');
        if (!companions) missingFields.push('5. 동행자');
        if (!transportation) missingFields.push('6. 선호 이동수단');
        if (!accommodation) missingFields.push('7. 숙소 선호 스타일');

        if (missingFields.length > 0) {
            showFormError(`필수 입력 항목이 비어있습니다:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        hideFormError();

        // 2-3. 로딩 상태 시작 (기본 문구 설정)
        setLoadingState(true, '일정을 준비하는 중...', '서버와 연결하고 있습니다.');

        try {
            // 2-4. 백엔드 스트리밍 API 호출
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    destination,
                    duration,
                    budget,
                    interests,
                    companions,
                    transportation,
                    accommodation,
                    prompt_type: promptType
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `서버 오류 (HTTP ${response.status})`);
            }

            // 2-5. 스트리밍 응답(NDJSON) 순차 처리
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let isCompleted = false;
            let serverError = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // 미완성 조각은 다음 청크를 위해 버퍼에 남김
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    let message;
                    try {
                        message = JSON.parse(trimmedLine);
                    } catch (e) {
                        console.warn('JSON 조각 대기 중:', trimmedLine);
                        continue;
                    }

                    // 상태별 처리
                    if (message.status === 'searching') {
                        setLoadingState(true, message.title, message.desc);
                    } else if (message.status === 'generating') {
                        setLoadingState(true, message.title, message.desc);
                    } else if (message.status === 'done') {
                        isCompleted = true;
                        currentRawPlan = message.plan;
                        currentDestination = destination;
                        displayResult(currentRawPlan);
                    } else if (message.status === 'error') {
                        serverError = message.error;
                    }
                }
            }

            // 남은 버퍼 처리
            if (buffer.trim()) {
                try {
                    const message = JSON.parse(buffer.trim());
                    if (message.status === 'done') {
                        isCompleted = true;
                        currentRawPlan = message.plan;
                        currentDestination = destination;
                        displayResult(currentRawPlan);
                    } else if (message.status === 'error') {
                        serverError = message.error;
                    }
                } catch (e) {
                    // 무시
                }
            }

            if (serverError) {
                throw new Error(serverError);
            }

            if (!isCompleted && !currentRawPlan) {
                throw new Error('일정 생성 도중 연결이 끊어졌거나 결과를 수신하지 못했습니다.');
            }

        } catch (error) {
            console.error('API Error:', error);
            showApiError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    // 3. 클립보드 복사 기능
    copyBtn.addEventListener('click', async () => {
        if (!currentRawPlan) return;

        try {
            await navigator.clipboard.writeText(currentRawPlan);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '복사 완료!';
            copyBtn.classList.add('btn-success');

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('btn-success');
            }, 2000);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert('클립보드 복사에 실패했습니다.');
        }
    });

    // 4. Markdown(.md) 파일 다운로드 기능
    downloadBtn.addEventListener('click', () => {
        if (!currentRawPlan) return;

        const blob = new Blob([currentRawPlan], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const today = new Date().toISOString().slice(0, 10);
        const safeDestination = currentDestination.replace(/[\\/:*?"<>|]/g, '_');
        const filename = `${safeDestination}_여행일정_${today}.md`;

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    });

    // --- [도움 헬퍼 함수들] ---

    // 로딩 상태 및 실시간 안내 문구 제어
    function setLoadingState(isLoading, titleText = '', descText = '') {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = '일정을 계획하는 중...';
            placeholderBox.style.display = 'none';
            resultContentWrapper.style.display = 'none';
            apiErrorBox.style.display = 'none';
            resultActions.style.display = 'none';
            loadingBox.style.display = 'block';

            if (titleText && loadingTitle) loadingTitle.textContent = titleText;
            if (descText && loadingDesc) loadingDesc.textContent = descText;
        } else {
            submitBtn.disabled = false;
            btnText.textContent = '여행 일정 생성하기';
            loadingBox.style.display = 'none';
        }
    }

    // 결과 화면 렌더링 함수
    function displayResult(markdownText) {
        placeholderBox.style.display = 'none';
        apiErrorBox.style.display = 'none';

        if (typeof marked !== 'undefined') {
            renderedMarkdown.innerHTML = marked.parse(markdownText);
        } else {
            renderedMarkdown.innerHTML = `<pre>${markdownText}</pre>`;
        }

        resultContentWrapper.style.display = 'block';
        resultActions.style.display = 'flex';

        if (window.innerWidth <= 960) {
            resultContentWrapper.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 폼 검증 에러 표시
    function showFormError(message) {
        formError.textContent = message;
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideFormError() {
        formError.style.display = 'none';
        formError.textContent = '';
    }

    // API 에러 표시
    function showApiError(message) {
        placeholderBox.style.display = 'none';
        resultContentWrapper.style.display = 'none';
        resultActions.style.display = 'none';

        apiErrorBox.innerHTML = `<strong>오류 안내:</strong><br>${message}`;
        apiErrorBox.style.display = 'block';
    }
});

// ==========================================
// PWA (Progressive Web App) 기능 로직
// ==========================================
let deferredInstallPrompt = null;
const pwaInstallBtn = document.getElementById('pwa-install-btn');

// 1. 브라우저 설치 가능 이벤트(beforeinstallprompt) 캡처
window.addEventListener('beforeinstallprompt', (e) => {
    // 기본 브라우저 배너 방지
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] 앱 설치 이벤트 감지됨');

    // 화면 우측 상단의 [앱 설치하기] 버튼 표시
    if (pwaInstallBtn) {
        pwaInstallBtn.style.display = 'inline-block';
    }
});

// 2. [앱 설치하기] 버튼 클릭 시 공식 설치 창 띄우기
if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            alert('브라우저 설정 메뉴(점 3개)에서 [홈 화면에 추가] 또는 [앱 설치]를 선택하실 수도 있습니다.');
            return;
        }

        // 설치 프롬프트 실행
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`[PWA] 사용자 응답: ${outcome}`);

        if (outcome === 'accepted') {
            pwaInstallBtn.style.display = 'none';
        }
        deferredInstallPrompt = null;
    });
}

// 3. 앱 설치 완료 이벤트
window.addEventListener('appinstalled', () => {
    console.log('[PWA] 앱 설치가 성공적으로 완료되었습니다.');
    if (pwaInstallBtn) {
        pwaInstallBtn.style.display = 'none';
    }
});

// 4. 서비스 워커 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.log('[PWA] 서비스 워커 등록 성공 (Scope:', registration.scope, ')');
            })
            .catch((err) => {
                console.error('[PWA] 서비스 워커 등록 실패:', err);
            });
    });
}
