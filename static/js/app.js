/**
 * AI 여행 플래너 클라이언트 스크립트 (app.js)
 * - 인터랙티브 버튼형 폼 컨트롤 (날짜 선택, 예산, 관심사 칩, 인원 슬라이더, 스타일 등)
 * - 랜덤 여행플랜 짜기 자동완성 기능
 * - 실시간 스트리밍 상태 수신 ([웹 검색중입니다.] -> [일정 설계 중])
 * - Markdown 렌더링, 클립보드 복사, .md 다운로드 및 PWA 설치 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 캐싱
    const travelForm = document.getElementById('travel-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const formError = document.getElementById('form-error');

    // 입력 필드 관련 DOM
    const destinationInput = document.getElementById('destination');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const durationBadge = document.getElementById('duration-calc-badge');
    const budgetSelect = document.getElementById('budget');
    const companionRange = document.getElementById('companion-count');
    const companionBadge = document.getElementById('companion-count-badge');
    const randomPlanBtn = document.getElementById('random-plan-btn');

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

    // ==========================================
    // 1. 날짜 선택 및 기간(박/일) 자동 계산
    // ==========================================
    const todayStr = new Date().toISOString().slice(0, 10);
    startDateInput.min = todayStr;
    endDateInput.min = todayStr;

    // 기본값 설정 (오늘부터 2박 3일)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 7); // 일주일 뒤
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 2); // 2박 3일

    startDateInput.value = defaultStart.toISOString().slice(0, 10);
    endDateInput.value = defaultEnd.toISOString().slice(0, 10);
    calculateDuration();

    function calculateDuration() {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value;

        if (!startVal || !endVal) {
            durationBadge.textContent = '날짜를 모두 선택해 주세요.';
            durationBadge.style.color = '#64748b';
            return '';
        }

        const start = new Date(startVal);
        const end = new Date(endVal);

        if (end < start) {
            endDateInput.value = startVal;
            durationBadge.textContent = '당일치기 (1일)';
            durationBadge.style.color = '#1e40af';
            return '당일치기';
        }

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const resultText = `당일치기 (${startVal})`;
            durationBadge.textContent = resultText;
            durationBadge.style.color = '#1e40af';
            return resultText;
        } else {
            const nights = diffDays;
            const days = diffDays + 1;
            const resultText = `${nights}박 ${days}일 (${startVal} ~ ${endVal})`;
            durationBadge.textContent = resultText;
            durationBadge.style.color = '#1e40af';
            return resultText;
        }
    }

    startDateInput.addEventListener('change', () => {
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
        endDateInput.min = startDateInput.value;
        calculateDuration();
    });

    endDateInput.addEventListener('change', calculateDuration);

    // ==========================================
    // 2. 관심사 대주제 탭 & 세부항목 다중 선택
    // ==========================================
    const categoryBtns = document.querySelectorAll('.category-btn');
    const subGroups = document.querySelectorAll('.sub-interest-group');
    const selectedInterestsText = document.getElementById('selected-interests-text');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-cat');
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            subGroups.forEach(group => {
                if (group.getAttribute('data-cat') === cat) {
                    group.classList.add('active');
                } else {
                    group.classList.remove('active');
                }
            });
        });
    });

    // 세부 항목 칩 다중 선택 토글
    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            updateSelectedInterestsText();
        });
    });

    function getSelectedInterests() {
        const activeChips = Array.from(document.querySelectorAll('.chip-btn.active'));
        return activeChips.map(c => c.getAttribute('data-val'));
    }

    function updateSelectedInterestsText() {
        const selected = getSelectedInterests();
        if (selected.length === 0) {
            selectedInterestsText.textContent = '선택된 항목이 없습니다.';
            selectedInterestsText.style.color = '#94a3b8';
        } else {
            selectedInterestsText.textContent = selected.join(', ');
            selectedInterestsText.style.color = '#1e40af';
        }
    }

    // 기본 관심사 몇 개 선택 활성화
    const defaultChips = ['유명 대표 맛집', '감성 카페 & 디저트', '오션뷰 & 해변 산책'];
    chipBtns.forEach(chip => {
        if (defaultChips.includes(chip.getAttribute('data-val'))) {
            chip.classList.add('active');
        }
    });
    updateSelectedInterestsText();

    // ==========================================
    // 3. 인원 수 슬라이더 바 & 단일 선택 버튼 그룹
    // ==========================================
    companionRange.addEventListener('input', () => {
        companionBadge.textContent = `${companionRange.value}명`;
    });

    // 버튼 그룹 단일 선택 헬퍼 함수
    function setupSingleChoiceGroup(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const buttons = container.querySelectorAll('.choice-btn, .style-card-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    setupSingleChoiceGroup('relation-btn-group');
    setupSingleChoiceGroup('transport-btn-group');
    setupSingleChoiceGroup('lodging-btn-group');
    setupSingleChoiceGroup('style-choice-group');

    // ==========================================
    // 4. 인기 여행지 순위 탭 & 원클릭 입력
    // ==========================================
    const rankingTabBtns = document.querySelectorAll('.ranking-tab-btn');
    const rankingLists = {
        domestic: document.getElementById('ranking-list-domestic'),
        overseas: document.getElementById('ranking-list-overseas')
    };

    rankingTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.getAttribute('data-tab');
            rankingTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (rankingLists.domestic && rankingLists.overseas) {
                rankingLists.domestic.classList.remove('active');
                rankingLists.overseas.classList.remove('active');
                if (rankingLists[tabKey]) {
                    rankingLists[tabKey].classList.add('active');
                }
            }
        });
    });

    const rankingItems = document.querySelectorAll('.ranking-item');
    rankingItems.forEach(item => {
        item.addEventListener('click', () => {
            const selectedDest = item.getAttribute('data-dest');
            if (destinationInput && selectedDest) {
                destinationInput.value = selectedDest;
                destinationInput.focus();
                destinationInput.style.backgroundColor = '#eff6ff';
                setTimeout(() => {
                    destinationInput.style.backgroundColor = '#ffffff';
                }, 400);
            }
        });
    });

    // ==========================================
    // 5. 🎲 랜덤 여행플랜 짜기 기능
    // ==========================================
    const randomDestinations = [
        '제주도 서귀포 & 애월', '부산 해운대 & 기장', '강릉 & 속초', 
        '경주 황리단길 & 불국사', '여수 밤바다 & 오동도', '일본 오사카 & 교토', 
        '일본 후쿠오카 & 유후인', '일본 도쿄 시부야 & 긴자', '베트남 다낭 & 호이안', 
        '태국 방콕 & 아유타야', '강원도 춘천 & 가평', '전북 전주 한옥마을'
    ];
    const budgetOptions = ['30만원', '50만원', '80만원', '100만원', '150만원', '200만원'];

    if (randomPlanBtn) {
        randomPlanBtn.addEventListener('click', () => {
            // 1) 랜덤 여행지
            const randDest = randomDestinations[Math.floor(Math.random() * randomDestinations.length)];
            destinationInput.value = randDest;

            // 2) 랜덤 날짜 (내일부터 3~14일 후 시작, 1~3박)
            const randDaysLater = Math.floor(Math.random() * 12) + 3;
            const randDuration = Math.floor(Math.random() * 3) + 1; // 1~3박
            const randStart = new Date();
            randStart.setDate(randStart.getDate() + randDaysLater);
            const randEnd = new Date(randStart);
            randEnd.setDate(randEnd.getDate() + randDuration);

            startDateInput.value = randStart.toISOString().slice(0, 10);
            endDateInput.value = randEnd.toISOString().slice(0, 10);
            calculateDuration();

            // 3) 랜덤 예산
            const randBudget = budgetOptions[Math.floor(Math.random() * budgetOptions.length)];
            budgetSelect.value = randBudget;

            // 4) 랜덤 관심사 (전체 칩 중 2~3개 랜덤 활성화)
            chipBtns.forEach(c => c.classList.remove('active'));
            const allChipsArr = Array.from(chipBtns);
            const shuffledChips = allChipsArr.sort(() => 0.5 - Math.random());
            shuffledChips.slice(0, 3).forEach(c => c.classList.add('active'));
            updateSelectedInterestsText();

            // 5) 랜덤 인원 (1~4명) & 관계
            const randCount = Math.floor(Math.random() * 4) + 1;
            companionRange.value = randCount;
            companionBadge.textContent = `${randCount}명`;

            const relationBtns = document.querySelectorAll('#relation-btn-group .choice-btn');
            relationBtns.forEach(b => b.classList.remove('active'));
            const randRelBtn = relationBtns[Math.floor(Math.random() * relationBtns.length)];
            randRelBtn.classList.add('active');

            // 6) 랜덤 이동수단
            const transportBtns = document.querySelectorAll('#transport-btn-group .choice-btn');
            transportBtns.forEach(b => b.classList.remove('active'));
            transportBtns[Math.floor(Math.random() * transportBtns.length)].classList.add('active');

            // 7) 랜덤 숙소
            const lodgingBtns = document.querySelectorAll('#lodging-btn-group .choice-btn');
            lodgingBtns.forEach(b => b.classList.remove('active'));
            lodgingBtns[Math.floor(Math.random() * lodgingBtns.length)].classList.add('active');

            // 8) 랜덤 여행 스타일
            const styleBtns = document.querySelectorAll('#style-choice-group .style-card-btn');
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns[Math.floor(Math.random() * styleBtns.length)].classList.add('active');

            // 시각적 피드백
            destinationInput.style.backgroundColor = '#f0fdf4';
            setTimeout(() => {
                destinationInput.style.backgroundColor = '#ffffff';
            }, 600);
        });
    }

    // ==========================================
    // 6. 폼 제출 및 API 통신
    // ==========================================
    travelForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 6-1. 입력값 취합
        const destination = destinationInput.value.trim();
        const duration = calculateDuration();
        const budget = budgetSelect.value;
        const selectedInterests = getSelectedInterests();
        const interests = selectedInterests.join(', ');

        const companionCount = companionRange.value;
        const activeRelationBtn = document.querySelector('#relation-btn-group .choice-btn.active');
        const relation = activeRelationBtn ? activeRelationBtn.getAttribute('data-relation') : '친구';
        const companions = `${companionCount}명 (${relation})`;

        const activeTransportBtn = document.querySelector('#transport-btn-group .choice-btn.active');
        const transportation = activeTransportBtn ? activeTransportBtn.getAttribute('data-val') : '대중교통';

        const activeLodgingBtn = document.querySelector('#lodging-btn-group .choice-btn.active');
        const accommodation = activeLodgingBtn ? activeLodgingBtn.getAttribute('data-val') : '가성비 호텔';

        const activeStyleBtn = document.querySelector('#style-choice-group .style-card-btn.active');
        const promptType = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : 'A';

        // 6-2. 프론트엔드 유효성 검증
        const missingFields = [];
        if (!destination) missingFields.push('1. 여행지');
        if (!duration) missingFields.push('2. 여행 기간 (시작일/종료일)');
        if (!budget) missingFields.push('3. 여행 예산');
        if (selectedInterests.length === 0) missingFields.push('4. 관심사 및 선호 활동 (최소 1개 이상 선택)');
        if (!transportation) missingFields.push('6. 선호 이동수단');
        if (!accommodation) missingFields.push('7. 숙소 선호 스타일');

        if (missingFields.length > 0) {
            showFormError(`필수 입력 항목이 비어있습니다:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        hideFormError();
        setLoadingState(true, '일정을 준비하는 중...', '서버와 연결하고 있습니다.');

        try {
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
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    let message;
                    try {
                        message = JSON.parse(trimmedLine);
                    } catch (e) {
                        continue;
                    }

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
                } catch (e) {}
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

    // 7. 클립보드 복사
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
            alert('클립보드 복사에 실패했습니다.');
        }
    });

    // 8. Markdown(.md) 파일 다운로드
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

    // 도움 헬퍼 함수들
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

    function showFormError(message) {
        formError.textContent = message;
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideFormError() {
        formError.style.display = 'none';
        formError.textContent = '';
    }

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
const installModal = document.getElementById('install-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const confirmModalBtn = document.getElementById('confirm-modal-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] 앱 설치 준비 완료 (beforeinstallprompt 감지됨)');
});

if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log(`[PWA] 사용자 설치 선택: ${outcome}`);
            if (outcome === 'accepted') {
                deferredInstallPrompt = null;
            }
        } else {
            if (installModal) {
                installModal.style.display = 'flex';
            }
        }
    });
}

function closeInstallModal() {
    if (installModal) {
        installModal.style.display = 'none';
    }
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeInstallModal);
if (confirmModalBtn) confirmModalBtn.addEventListener('click', closeInstallModal);
if (installModal) {
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) closeInstallModal();
    });
}

window.addEventListener('appinstalled', () => {
    console.log('[PWA] 앱 설치가 성공적으로 완료되었습니다.');
    if (pwaInstallBtn) {
        pwaInstallBtn.textContent = '설치 완료';
        pwaInstallBtn.disabled = true;
        pwaInstallBtn.style.opacity = '0.7';
    }
});

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
