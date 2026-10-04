/**
 * AI 여행 플래너 클라이언트 스크립트 (app.js)
 * - 버튼 기반 직관적 인터페이스 (날짜 선택, 총 예산, 관심사 칩 + 기타 입력, 인원 슬라이더, 추천 스타일 8종)
 * - 인기 추천 여행지 선택 시 거점 숙소/차량/주요시설 안내 카드 연동
 * - 생성 버튼 클릭 시 결과 영역 표시 전환 (레이아웃 전환)
 * - 실시간 스트리밍 상태 수신 ([웹 검색중입니다.] -> [일정 설계 중])
 * - PWA, 복사, 다운로드 지원
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 캐싱
    const mainLayout = document.getElementById('main-layout');
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

    // 기타 관심사 직접 입력 관련 DOM
    const customInterestToggleBtn = document.getElementById('custom-interest-toggle-btn');
    const customInterestBox = document.getElementById('custom-interest-box');
    const customInterestInput = document.getElementById('custom-interest-input');

    // 결과 표시 관련 DOM
    const resultSection = document.getElementById('result-section');
    const facilityBox = document.getElementById('recommended-spot-facility-box');
    const facilityTitle = document.getElementById('facility-title');
    const facilityLodging = document.getElementById('facility-lodging');
    const facilityTransport = document.getElementById('facility-transport');
    const facilityMain = document.getElementById('facility-main');

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
    let currentFacilityKey = null;

    // ==========================================
    // 추천 여행지 주요 시설 및 숙소/차량 데이터베이스
    // ==========================================
    const destinationFacilityData = {
        jeju: {
            title: '제주도 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '서귀포 중문관광단지(호텔·리조트), 애월·한림(오션뷰 감성 펜션), 제주시청 인근(가성비 비즈니스)',
            transport: '제주공항 렌터카 셔틀 이용(자차·렌트 최우선 권장), 주요 거점 간 급행버스(101/102번)',
            main: '제주국제공항, 공항 내 짐보관소, 제주대학교병원(응급실), 대형 하나로마트(바베큐 장보기)'
        },
        busan: {
            title: '부산 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '해운대·광안리(오션뷰 호텔·에어비앤비), 서면(교통 요충지), 남포동·영도(감성 숙소)',
            transport: '부산 도시철도 1·2호선 및 동해선 전철(대중교통 접근성 최상), 해운대 블루라인파크 해변열차',
            main: '부산역(KTX·SRT), 김해국제공항, 부산역 짐캐리(숙소 짐배송 서비스), 인제대 해운대백병원'
        },
        gangneung: {
            title: '강릉·속초 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '경포대·안목해변(바다전망 펜션), 속초 해수욕장 인근(리조트·호텔), 교동 택지(가성비)',
            transport: '렌터카 권장(해안도로 드라이브 코스 최적), 강릉역 KTX 및 시내버스(202, 302번)',
            main: '강릉역(KTX), 속초고속버스터미널, 강릉아산병원, 속초 중앙시장 공영주차장'
        },
        gyeongju: {
            title: '경주 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '황리단길 인근(전통 한옥 스테이), 보문관광단지(호수 전망 리조트·호텔)',
            transport: '전동스쿠터·자전거 대여 추천(평지 코스), 시내버스 10/11번 순환선, 주요 명소 도보 이동 용이',
            main: '신경주역(KTX), 경주고속버스터미널, 동국대학교 경주병원, 황리단길 물품보관함'
        },
        yeosu: {
            title: '여수 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '돌산도(풀빌라·인피니티풀 펜션), 여수엑스포역 주변(관광호텔), 낭만포차 거리 인근(게스트하우스)',
            transport: '렌터카 또는 카카오택시(명소 간 이동거리 10~15분 내외), 해상케이블카',
            main: '여수엑스포역(KTX), 여수공항, 여수전남병원, 엑스포역 물품보관소'
        },
        osaka: {
            title: '오사카·교토 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '난바·도톤보리·우메다(오사카 쇼핑·미식 중심), 교토 가와라마치·기온(전통 감성 료칸)',
            transport: '간사이공항 하루카 특급열차, 오사카 메트로(엔조이 에코카드), 한큐/게이한 전철',
            main: '간사이국제공항, 신오사카역(신칸센), 난바역 대형 코인락커, 다이마루 백화점 면세 카운터'
        },
        fukuoka: {
            title: '후쿠오카 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '하카타역 인근(근교 이동 최적), 텐진(쇼핑·야타이 포차), 유후인(전통 온천 료칸)',
            transport: '후쿠오카 지하철 공항선(공항~시내 5분 컷), JR 산큐패스, 유후인노모리 관광열차',
            main: '후쿠오카공항(시내 근접), 하카타역 짐보관소, 텐진 지하상가, 유후인 역전 안내소'
        },
        tokyo: {
            title: '도쿄 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '신주쿠·시부야(번화가 나이트라이프), 긴자·도쿄역(치안·교통 최고), 아사쿠사(가성비 호스텔)',
            transport: '도쿄 서브웨이 티켓(24/48/72시간 무제한권), JR 야마노테 순환선',
            main: '나리타/하네다 공항(스카이라이너/모노레일), 도쿄역 물품보관소, 성루카 국제병원(영어 진료)'
        },
        danang: {
            title: '다낭 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '미케비치 해변가(가성비 오션뷰 호텔/리조트), 한시장 시내(도보 투어), 호이안 올드타운(부티크 리조트)',
            transport: '그랩(Grab) 앱 필수(저렴한 택시 호출), 렌트카(기사 포함 일일 프라이빗 대절)',
            main: '다낭국제공항, 한시장(환전·쇼핑 필수 거점), 롯데마트(기념품 배달), 빈멕 국제병원'
        },
        bangkok: {
            title: '방콕 추천 거점 숙소 & 차량/주요 시설 가이드',
            lodging: '수쿰빗·아속·사톤(도심 5성급 호텔), 짜오프라야 강변(럭셔리 호캉스 리조트)',
            transport: 'BTS 지상철, MRT 지하철, 볼트(Bolt)/그랩(Grab) 앱, 짜오프라야 수상보트',
            main: '수완나품국제공항, 아이콘시암(대형 복합몰), 센트럴월드 짐보관소, 범룽랏 국제병원'
        }
    };

    // ==========================================
    // 1. 날짜 선택 및 기간(박/일) 자동 계산
    // ==========================================
    const todayStr = new Date().toISOString().slice(0, 10);
    startDateInput.min = todayStr;
    endDateInput.min = todayStr;

    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 7);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 2);

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
    // 2. 관심사 대주제 탭 & 세부항목 선택 & 기타 입력
    // ==========================================
    const categoryBtns = document.querySelectorAll('.category-btn:not(#custom-interest-toggle-btn)');
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

    // 기타(직접 입력) 토글 버튼
    if (customInterestToggleBtn) {
        customInterestToggleBtn.addEventListener('click', () => {
            customInterestToggleBtn.classList.toggle('active');
            if (customInterestBox.style.display === 'none') {
                customInterestBox.style.display = 'block';
                customInterestInput.focus();
            } else {
                customInterestBox.style.display = 'none';
            }
            updateSelectedInterestsText();
        });
    }

    if (customInterestInput) {
        customInterestInput.addEventListener('input', updateSelectedInterestsText);
    }

    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            updateSelectedInterestsText();
        });
    });

    function getSelectedInterests() {
        const activeChips = Array.from(document.querySelectorAll('.chip-btn.active'));
        const list = activeChips.map(c => c.getAttribute('data-val'));
        if (customInterestInput && customInterestInput.value.trim()) {
            list.push(`기타: ${customInterestInput.value.trim()}`);
        }
        return list;
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

    // 기본 관심사 활성화
    const defaultChips = ['유명 대표 맛집', '감성 카페 & 디저트', '오션뷰 & 해변 산책'];
    chipBtns.forEach(chip => {
        if (defaultChips.includes(chip.getAttribute('data-val'))) {
            chip.classList.add('active');
        }
    });
    updateSelectedInterestsText();

    // ==========================================
    // 3. 인원 수 슬라이더 & 단일 선택 버튼 그룹
    // ==========================================
    companionRange.addEventListener('input', () => {
        companionBadge.textContent = `${companionRange.value}명`;
    });

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
    // 4. 인기 여행지 순위 탭 & 원클릭 입력 & 시설 가이드 매칭
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
            const destKey = item.getAttribute('data-key');
            if (destinationInput && selectedDest) {
                destinationInput.value = selectedDest;
                currentFacilityKey = destKey;
                destinationInput.focus();
                destinationInput.style.backgroundColor = '#eff6ff';
                setTimeout(() => {
                    destinationInput.style.backgroundColor = '#ffffff';
                }, 400);
            }
        });
    });

    // 텍스트 직접 입력 시에도 주요 도시 키워드 자동 감지
    destinationInput.addEventListener('input', () => {
        const val = destinationInput.value.toLowerCase();
        if (val.includes('제주')) currentFacilityKey = 'jeju';
        else if (val.includes('부산')) currentFacilityKey = 'busan';
        else if (val.includes('강릉') || val.includes('속초')) currentFacilityKey = 'gangneung';
        else if (val.includes('경주')) currentFacilityKey = 'gyeongju';
        else if (val.includes('여수')) currentFacilityKey = 'yeosu';
        else if (val.includes('오사카') || val.includes('교토')) currentFacilityKey = 'osaka';
        else if (val.includes('후쿠오카') || val.includes('유후인')) currentFacilityKey = 'fukuoka';
        else if (val.includes('도쿄')) currentFacilityKey = 'tokyo';
        else if (val.includes('다낭') || val.includes('호이안')) currentFacilityKey = 'danang';
        else if (val.includes('방콕')) currentFacilityKey = 'bangkok';
        else currentFacilityKey = null;
    });

    // ==========================================
    // 5. 🎲 랜덤 여행플랜 짜기 기능
    // ==========================================
    const randomDestList = [
        { name: '제주도 서귀포 & 애월', key: 'jeju' },
        { name: '부산 해운대 & 광안리', key: 'busan' },
        { name: '강릉 & 속초', key: 'gangneung' },
        { name: '경주 황리단길 & 불국사', key: 'gyeongju' },
        { name: '여수 밤바다 & 오동도', key: 'yeosu' },
        { name: '일본 오사카 & 교토', key: 'osaka' },
        { name: '일본 후쿠오카 & 유후인', key: 'fukuoka' },
        { name: '일본 도쿄 시부야 & 긴자', key: 'tokyo' },
        { name: '베트남 다낭 & 호이안', key: 'danang' },
        { name: '태국 방콕 & 아유타야', key: 'bangkok' }
    ];
    const budgetOptions = ['40만원', '60만원', '80만원', '100만원', '150만원', '200만원', '300만원'];

    if (randomPlanBtn) {
        randomPlanBtn.addEventListener('click', () => {
            const randItem = randomDestList[Math.floor(Math.random() * randomDestList.length)];
            destinationInput.value = randItem.name;
            currentFacilityKey = randItem.key;

            const randDaysLater = Math.floor(Math.random() * 12) + 3;
            const randDuration = Math.floor(Math.random() * 3) + 1;
            const randStart = new Date();
            randStart.setDate(randStart.getDate() + randDaysLater);
            const randEnd = new Date(randStart);
            randEnd.setDate(randEnd.getDate() + randDuration);

            startDateInput.value = randStart.toISOString().slice(0, 10);
            endDateInput.value = randEnd.toISOString().slice(0, 10);
            calculateDuration();

            budgetSelect.value = budgetOptions[Math.floor(Math.random() * budgetOptions.length)];

            chipBtns.forEach(c => c.classList.remove('active'));
            const allChipsArr = Array.from(chipBtns);
            const shuffled = allChipsArr.sort(() => 0.5 - Math.random());
            shuffled.slice(0, 3).forEach(c => c.classList.add('active'));
            if (customInterestInput) customInterestInput.value = '';
            updateSelectedInterestsText();

            const randCount = Math.floor(Math.random() * 4) + 1;
            companionRange.value = randCount;
            companionBadge.textContent = `${randCount}명`;

            const relBtns = document.querySelectorAll('#relation-btn-group .choice-btn');
            relBtns.forEach(b => b.classList.remove('active'));
            relBtns[Math.floor(Math.random() * relBtns.length)].classList.add('active');

            const transBtns = document.querySelectorAll('#transport-btn-group .choice-btn');
            transBtns.forEach(b => b.classList.remove('active'));
            transBtns[Math.floor(Math.random() * transBtns.length)].classList.add('active');

            const lodgeBtns = document.querySelectorAll('#lodging-btn-group .choice-btn');
            lodgeBtns.forEach(b => b.classList.remove('active'));
            lodgeBtns[Math.floor(Math.random() * lodgeBtns.length)].classList.add('active');

            const styleBtns = document.querySelectorAll('#style-choice-group .style-card-btn');
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns[Math.floor(Math.random() * styleBtns.length)].classList.add('active');

            destinationInput.style.backgroundColor = '#f0fdf4';
            setTimeout(() => {
                destinationInput.style.backgroundColor = '#ffffff';
            }, 600);
        });
    }

    // ==========================================
    // 6. 폼 제출 및 생성 버튼 클릭 후 결과창 표시
    // ==========================================
    travelForm.addEventListener('submit', async (e) => {
        e.preventDefault();

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
        const promptType = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : '알찬 핵심 코스';

        // 유효성 검사
        const missingFields = [];
        if (!destination) missingFields.push('1. 여행지');
        if (!duration) missingFields.push('2. 여행 기간 (시작일/종료일)');
        if (!budget) missingFields.push('3. 총 여행 예산');
        if (selectedInterests.length === 0) missingFields.push('4. 관심사 및 선호 활동 (최소 1개 이상 선택)');
        if (!transportation) missingFields.push('6. 선호 이동수단');
        if (!accommodation) missingFields.push('7. 숙소 선호 스타일');

        if (missingFields.length > 0) {
            showFormError(`필수 입력 항목이 비어있습니다:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        hideFormError();

        // [중요 요구사항] 사용자가 '여행 일정 생성하기'를 누른 뒤에 결과창 나타나게 처리
        if (resultSection) {
            resultSection.style.display = 'block';
        }
        if (mainLayout) {
            mainLayout.classList.add('has-result');
        }

        // 추천 여행지 편의시설 안내 카드 렌더링
        if (currentFacilityKey && destinationFacilityData[currentFacilityKey]) {
            const data = destinationFacilityData[currentFacilityKey];
            facilityTitle.textContent = data.title;
            facilityLodging.textContent = data.lodging;
            facilityTransport.textContent = data.transport;
            facilityMain.textContent = data.main;
            facilityBox.style.display = 'block';
        } else {
            facilityBox.style.display = 'none';
        }

        setLoadingState(true, '일정을 준비하는 중...', '서버와 연결하고 있습니다.');

        // 모바일/태블릿 화면에서는 결과창으로 부드럽게 스크롤
        if (window.innerWidth <= 960 && resultSection) {
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }

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

    // 헬퍼 함수들
    function setLoadingState(isLoading, titleText = '', descText = '') {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = '일정을 계획하는 중...';
            if (placeholderBox) placeholderBox.style.display = 'none';
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
        if (placeholderBox) placeholderBox.style.display = 'none';
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
        if (placeholderBox) placeholderBox.style.display = 'none';
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
