/**
 * AI 여행 플래너 클라이언트 스크립트 (app.js)
 * - 좌측 1 : 우측 1.5 메인 레이아웃 (우측 상단 여행지 가이드 카드 상시/실시간 연동)
 * - 광범위한 균등 확률 랜덤 여행플랜 (인기/비인기 소도시 및 해외 총 48개 균등 추첨)
 * - 상단 순위 및 랜덤 클릭 시 우측 안내 카드 즉각 렌더링
 * - 일정 생성하기 버튼 클릭 시 여행 일정표 카드 노출 및 스트리밍 생성
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

    // 기타 관심사 직접 입력
    const customInterestToggleBtn = document.getElementById('custom-interest-toggle-btn');
    const customInterestBox = document.getElementById('custom-interest-box');
    const customInterestInput = document.getElementById('custom-interest-input');

    // 우측 패널 관련 DOM (안내 카드 & 일정표)
    const guideCard = document.getElementById('guide-panel-card');
    const guidePlaceholder = document.getElementById('guide-placeholder');
    const guideContentBox = document.getElementById('guide-content-box');
    const facilityTitle = document.getElementById('facility-title');
    const facilityLodging = document.getElementById('facility-lodging');
    const facilityTransport = document.getElementById('facility-transport');
    const facilityMain = document.getElementById('facility-main');

    const resultCard = document.getElementById('result-card');
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
    // 광범위한 여행지 데이터베이스 (인기 & 비인기 소도시 & 해외 48선)
    // ==========================================
    const allDestinationsDB = [
        // 국내 인기 & 소도시 & 숨은 명소 25선
        { name: '제주도 서귀포 & 애월', key: 'jeju', lodging: '중문관광단지(호텔), 애월·한림(오션뷰 펜션), 제주시청(가성비)', transport: '공항 렌터카 셔틀(렌트 최우선 권장), 급행버스 101/102번', main: '제주국제공항, 공항 내 짐보관소, 제주대병원 응급실, 하나로마트' },
        { name: '부산 해운대 & 기장', key: 'busan', lodging: '해운대·광안리(오션뷰), 서면(교통 중심), 영도(감성 숙소)', transport: '도시철도 1·2호선 및 동해선 전철, 해운대 블루라인파크 해변열차', main: '부산역(KTX·SRT), 김해공항, 부산역 짐캐리(짐배송), 해운대백병원' },
        { name: '강원도 강릉 & 속초', key: 'gangneung', lodging: '경포대·안목해변(바다전망 펜션), 속초 해수욕장(오션뷰 리조트), 교동(가성비)', transport: '렌터카 권장(해안도로 드라이브), 강릉역 KTX 및 시내버스', main: '강릉역(KTX), 속초고속버스터미널, 강릉아산병원, 속초관광수산시장' },
        { name: '경주 황리단길 & 불국사', key: 'gyeongju', lodging: '황리단길 인근(전통 한옥 스테이), 보문관광단지(호수 리조트·호텔)', transport: '전동스쿠터·자전거 대여 추천(평지 코스), 시내 순환버스 10/11번', main: '신경주역(KTX), 경주고속버스터미널, 동국대 경주병원, 황리단길 보관함' },
        { name: '전남 여수 밤바다 & 오동도', key: 'yeosu', lodging: '돌산도(풀빌라·오션뷰 펜션), 여수엑스포역 주변(관광호텔)', transport: '렌터카 또는 카카오택시(명소 간 10~15분 거리), 해상케이블카', main: '여수엑스포역(KTX), 여수공항, 여수전남병원, 엑스포역 물품보관함' },
        { name: '전남 담양 대나무숲 & 곡성', key: 'damyang', lodging: '담양 메타프로방스(감성 펜션), 한옥 게스트하우스, 곡성 기차마을 스테이', transport: '자차·렌터카 추천, 광주 송정역에서 렌트 또는 농어촌버스', main: '담양공용버스터미널, 곡성역(KTX 일부), 담양사랑병원, 하나로마트' },
        { name: '강원 영월 동강 & 정선 아리랑', key: 'yeongwol', lodging: '동강변 글램핑·리조트, 정선 하이원리조트, 동강 힐링 펜션', transport: '렌터카 필수(산악 도로 이동), 태백선 무궁화호/정선아리랑열차', main: '영월역, 정선버스터미널, 영월의료원, 정선아리랑시장' },
        { name: '충북 단양 도담삼봉 & 제천 청풍호', key: 'danyang', lodging: '남한강변 펜션, 소백산 자락 한옥스테이, 제천 리솜포레스트', transport: '렌터카 권장(패러글라이딩 이동), 단양역 KTX-이음, 청풍호 유람선', main: '단양역, 제천역(KTX), 단양구경시장, 단양군보건소' },
        { name: '경남 남해 다랭이마을 & 통영', key: 'namhae', lodging: '남해 독일마을·빛담촌(스파 펜션), 통영 강구안(바다전망 호텔)', transport: '렌터카 필수(해안 절경 드라이브), 통영 케이블카 및 도선', main: '통영종합버스터미널, 진주역(KTX 후 렌트), 통영서울병원, 통영중앙시장' },
        { name: '전남 순천만습지 & 보성 녹차밭', key: 'suncheon', lodging: '순천역 인근(가성비 호텔), 순천만 인근(생태 펜션), 보성 리조트', transport: 'KTX 순천역 거점 이동, 순천 시티투어버스, 보성행 직행버스', main: '순천역(KTX), 순천종합버스터미널, 순천한국병원, 순천만안내소' },
        { name: '경북 안동 하회마을 & 영주', key: 'andong', lodging: '하회마을 고택 스테이, 안동댐 구름에 리조트, 영주 선비촌 한옥', transport: '안동역 KTX-이음, 렌터카 권장, 하회마을 210번 시내버스', main: '안동역(KTX), 안동터미널, 안동병원(응급실), 안동구시장 찜닭골목' },
        { name: '전북 군산 근대골목 & 부안 변산반도', key: 'gunsan', lodging: '군산 월명동(적산가옥 게스트하우스), 부안 변산 모항(오션뷰 펜션)', transport: '군산 시내 도보·자전거 투어, 부안 방면 자차/렌터카 드라이브', main: '군산역, 군산시외버스터미널, 군산의료원, 이성당 본점' },
        { name: '충남 태안 꽃지해변 & 안면도', key: 'taean', lodging: '꽃지해수욕장 펜션타운, 안면도 자연휴양림 통나무집, 글램핑장', transport: '자차·렌터카 권장(갯벌 체험 및 해안 이동), 태안 시내버스', main: '태안공용버스터미널, 안면버스터미널, 태안군보건의료원, 백사장항 수산시장' },
        { name: '경북 울릉도 나리분지 & 독도', key: 'ulleung', lodging: '도동·저동항 인근(호텔·모텔), 북면 코스모스 리조트, 힐링 펜션', transport: '여객선(포항/울진 후포 출발), 울릉 일주도로 버스, 렌터카', main: '도동여객선터미널, 저동항 물품보관소, 울릉군보건의료원, 여객선 선착장' },
        { name: '강원 철원 한탄강 주상절리', key: 'cheorwon', lodging: '한탄강변 스파 펜션, 고석정 인근 호텔, 자연휴양림', transport: '자차·렌터카 필수(DMZ 평화관광 이동), 철원 DMZ 투어 셔틀', main: '동송시외버스터미널, 와수리터미널, 철원병원, 고석정 관광안내소' },
        { name: '전남 목포 유달산 & 신안 퍼플섬', key: 'mokpo', lodging: '목포 평화광장(호텔타운), 유달산 자락 감성 게스트하우스, 신안 리조트', transport: '목포역 KTX 거점, 해상케이블카, 신안 천사대교 자차 이동', main: '목포역(KTX), 목포종합버스터미널, 목포한국병원, 목포동부시장' },
        { name: '경북 포항 영일대 & 울진 금강송', key: 'pohang', lodging: '영일대 해수욕장(오션뷰 호텔), 구룡포 풀빌라, 울진 덕구온천 리조트', transport: '포항역 KTX, 영일만 해안도로 자차/렌트, 스페이스워크 도보', main: '포항역(KTX), 포항고속버스터미널, 포항성모병원, 죽도시장' },
        { name: '충남 부여 백제유적 & 공주 공산성', key: 'buyeo', lodging: '부여 롯데리조트, 백제문화단지 한옥스테이, 공주 제민천 게스트하우스', transport: '공주역 KTX 또는 시외버스, 유적지 자전거 대여, 렌터카', main: '공주종합버스터미널, 부여시외버스터미널, 공주의료원, 궁남지 안내소' },
        { name: '경남 하동 십리벚꽃길 & 구례 지리산', key: 'hadong', lodging: '하동 악양 평사리 한옥, 화개장터 인근 펜션, 구례 지리산 롯지', transport: '렌터카 필수(지리산 노고단 및 섬진강 드라이브), 경전선 하동역', main: '구례구역(KTX), 하동버스터미널, 구례병원, 화개장터' },
        { name: '전북 전주 한옥마을 & 완주', key: 'jeonju', lodging: '전주 한옥마을 한옥 스테이, 서학동 예술마을 게스트하우스, 완주 힐스테이', transport: '전주역 KTX, 한옥마을 일대 도보 중심 투어, 완주 방면 렌트카', main: '전주역(KTX), 전주고속버스터미널, 전북대병원, 남부시장 청년몰' },
        { name: '강원 춘천 남이섬 & 가평 북한강', key: 'chuncheon', lodging: '의암호 카누 글램핑, 북한강 풀빌라 펜션, 춘천 명동 가성비 호텔', transport: 'ITX-청춘 열차, 경춘선 전철, 삼악산 호수케이블카, 시내 자전거', main: '남춘천역, 춘천역, 강원대병원, 춘천 낭만시장, 남이섬 선착장' },

        // 해외 인기 & 이색 도시 23선
        { name: '일본 오사카 & 교토', key: 'osaka', lodging: '난바·도톤보리·우메다(시내 중심), 교토 가와라마치·기온(전통 료칸)', transport: '간사이공항 하루카 특급열차, 오사카 메트로 엔조이패스, 한큐전철', main: '간사이국제공항, 신오사카역(신칸센), 난바역 락커, 다이마루 백화점' },
        { name: '일본 후쿠오카 & 유후인', key: 'fukuoka', lodging: '하카타역(교통 요충지), 텐진(쇼핑·포차), 유후인(온천 료칸)', transport: '지하철 공항선(공항~시내 5분), JR 산큐패스, 유후인노모리 열차', main: '후쿠오카공항, 하카타역 짐보관소, 텐진 지하상가, 유후인 역전 안내소' },
        { name: '일본 도쿄 시부야 & 긴자', key: 'tokyo', lodging: '신주쿠·시부야(번화가), 긴자·도쿄역(치안·교통 최고), 아사쿠사(가성비)', transport: '도쿄 서브웨이 24/48/72시간 패스, JR 야마노테선 순환열차', main: '나리타/하네다 공항, 도쿄역 대형 물품보관소, 성루카 국제병원' },
        { name: '일본 삿포로 & 오타루 운하', key: 'sapporo', lodging: '스스키노(미식·나이트라이프), 삿포로역(교통 편리), 조잔케이(온천 료칸)', transport: '신치토세공항 JR 쾌속에어포트, 삿포로 시영지하철, 노면전차', main: '신치토세공항, 삿포로역 지하상가, 오타루 오르골당, 삿포로시립병원' },
        { name: '일본 나고야 & 시라카와고', key: 'nagoya', lodging: '사카에·나고야역 인근(호텔), 다카야마 전통 갓쇼즈쿠리 민박', transport: '메이테츠 특급열차, 쇼류도 고속버스 패스, 나고야 지하철', main: '주부국제공항, 나고야역 메이테츠 백화점, 다카야마 버스터미널' },
        { name: '베트남 다낭 & 호이안', key: 'danang', lodging: '미케비치(해변 리조트), 한시장(시내 호텔), 호이안 올드타운(부티크 리조트)', transport: '그랩(Grab) 택시 앱 필수, 호이안 방면 기사 포함 프라이빗 차량 대절', main: '다낭국제공항, 한시장(환전·쇼핑), 롯데마트(선물 배송), 빈멕 국제병원' },
        { name: '베트남 나트랑 & 달랏', key: 'nhatrang', lodging: '나트랑 해변가(가성비 5성급 리조트), 달랏 호수 인근(프렌치 빌라 호텔)', transport: '시내 도보 및 그랩(Grab), 나트랑~달랏 리무진 버스, 케이블카', main: '깜라인국제공항, 담시장, 나트랑 롯데마트, 빈멕 나트랑병원' },
        { name: '베트남 푸꾸옥 선셋사우스', key: 'phuquoc', lodging: '즈엉동 야시장 인근(가성비), 북부 빈펄 리조트, 남부 선셋타운', transport: '빈버스 무료 셔틀(전기버스), 그랩 택시, 리조트 공항 픽업 차량', main: '푸꾸옥국제공항, 킹콩마트, 그랜드월드 안내센터, 빈멕 푸꾸옥병원' },
        { name: '태국 방콕 & 아유타야', key: 'bangkok', lodging: '수쿰빗·아속(도심 5성급 호텔), 짜오프라야 강변(럭셔리 호캉스 리조트)', transport: 'BTS 지상철, MRT 지하철, 볼트(Bolt)/그랩(Grab) 앱, 수상보트', main: '수완나품국제공항, 아이콘시암(대형 복합몰), 센트럴월드 락커, 범룽랏 국제병원' },
        { name: '태국 치앙마이 님만해민', key: 'chiangmai', lodging: '올드시티(감성 게스트하우스), 님만해민(트렌디 부티크 호텔/에어비앤비)', transport: '볼트(Bolt)/그랩 앱, 썽태우(빨간 미니버스), 도보 및 스쿠터 렌트', main: '치앙마이국제공항, 마야몰, 러스틱마켓, 방콕치앙마이병원' },
        { name: '대만 타이베이 & 지우펀', key: 'taipei', lodging: '시먼딩(쇼핑·젊음의 거리), 타이베이 메인역(공항철도 직결), 융캉제', transport: '타이베이 MRT 지하철(이지카드), 공항 MRT 급행, 예스진지 택시투어', main: '타오위안/송산 공항, 타이베이 메인역 물품보관함, 국립대만대학병원' },
        { name: '인도네시아 발리 스미냑 & 우붓', key: 'bali', lodging: '스미냑·짱구(비치클럽 풀빌라), 우붓(정글 숲속 힐링 리조트)', transport: '고젝(Gojek)/그랩 차량, 일일 프라이빗 가이드 차량 대절', main: '응우라라이(덴파사르) 공항, 우붓 왕궁 안내소, BIMC 국제병원' },
        { name: '싱가포르 마리나베이', key: 'singapore', lodging: '마리나베이 샌즈 및 강변 호텔, 오차드로드(쇼핑가), 클락키(야경 명소)', transport: '싱가포르 MRT(신용카드 컨택리스 탑승), 그랩 택시', main: '창이국제공항(쥬얼창이), 마리나베이샌즈몰, 래플스 병원' },
        { name: '필리핀 세부 막탄 & 보홀', key: 'cebu', lodging: '막탄 섬(해변 프라이빗 비치 리조트), 보홀 팡라오 알로나비치(휴양 호텔)', transport: '오션젯 고속페리(세부~보홀 2시간), 그랩 차량, 호핑투어 보트', main: '막탄세부국제공항, 아얄라몰 짐보관소, 청화병원(Chong Hua Hospital)' },
        { name: '이탈리아 로마 & 피렌체', key: 'rome', lodging: '테르미니역 인근(교통 편리), 트레비분수 주변(도보 관광), 피렌체 두오모 광장', transport: '이탈로(Italo)/트랜이탈리아 고속열차, 로마 지하철 A·B선', main: '레오나르도 다빈치(피우미치노) 공항, 테르미니역 코인락커, 산타마리아노벨라역' },
        { name: '체코 프라하 올드타운', key: 'prague', lodging: '구시가지 광장 인근(역사적 건물 호텔), 블타바 강변(카를교 전망 펜션)', transport: '프라하 트램 및 메트로(1일권/3일권 교통패스), 도보 관광', main: '바츨라프 하벨 공항, 프라하 중앙역 짐보관소, 모토 병원' },
        { name: '스페인 바르셀로나 고딕지구', key: 'barcelona', lodging: '에이샴플레(가우디 건축 인근 치안 우수), 카탈루냐 광장(공항버스 직결)', transport: '바르셀로나 T-casual 지하철/버스 10회권, 공항버스(Aerobus)', main: '엘프라트 공항, 카탈루냐 광장 락커, 산파우 병원, 보케리아 시장' },
        { name: '프랑스 파리 에펠탑 & 루브르', key: 'paris', lodging: '1~8구 시내 중심(안전한 치안), 마레지구(트렌디 부티크), 에펠탑 전망 호텔', transport: '파리 메트로(나비고 이지 교통카드), RER 교외선, 바토무슈 유람선', main: '샤를드골/오를리 공항, 파리 북역/리옹역 물품보관소, 아메리칸 호스피탈' },
        { name: '미국 하와이 오아후 와이키키', key: 'hawaii', lodging: '와이키키 비치프론트 리조트, 알라모아나 인근(쇼핑 편리), 카일루아 에어비앤비', transport: '렌터카 권장(오아후 섬 일주 드라이브), 와이키키 트롤리 버스', main: '호놀룰루 다니엘 K. 이노우에 공항, 알라모아나 센터, 스트라우브 메디컬센터' },
        { name: '호주 시드니 오페라하우스', key: 'sydney', lodging: '서큘러키·달링하버(하버뷰 호텔), CBD 시내 중심(쇼핑·대중교통 접근성)', transport: '오팔(Opal) 카드 / 컨택리스 카드, 시드니 페리(하버 크루즈), 라이트레일', main: '시드니 킹스포드 스미스 공항, 센트럴역 보관함, 세인트 빈센트 병원' }
    ];

    // ==========================================
    // 2. 우측 안내 카드 렌더링 함수
    // ==========================================
    function renderGuideCard(destName, key = null) {
        if (!destName || !destName.trim()) {
            guidePlaceholder.style.display = 'block';
            guideContentBox.style.display = 'none';
            facilityTitle.textContent = '선택 여행지 거점 및 편의시설 가이드';
            return;
        }

        // DB에서 매칭 항목 찾기
        let match = null;
        if (key) {
            match = allDestinationsDB.find(d => d.key === key);
        }
        if (!match) {
            match = allDestinationsDB.find(d => 
                destName.toLowerCase().includes(d.key) ||
                d.name.toLowerCase().includes(destName.toLowerCase()) ||
                destName.toLowerCase().split(' ')[0].includes(d.key)
            );
        }

        guidePlaceholder.style.display = 'none';
        guideContentBox.style.display = 'block';

        if (match) {
            facilityTitle.textContent = `${match.name} 추천 거점 및 주요 시설 가이드`;
            facilityLodging.textContent = match.lodging;
            facilityTransport.textContent = match.transport;
            facilityMain.textContent = match.main;
        } else {
            // 커스텀 입력 여행지에 대한 스마트 시설 가이드 템플릿
            facilityTitle.textContent = `${destName} 주요 거점 및 편의시설 가이드`;
            facilityLodging.textContent = `도심 중심가 및 주요 랜드마크 인근 숙소 구역 권장 (교통편 및 이동 동선 최우선 고려)`;
            facilityTransport.textContent = `현지 도착 후 공항/역 렌터카 센터 또는 주요 대중교통 1일 정기권 활용 추천`;
            facilityMain.textContent = `중앙역/공항 종합 관광안내소, 물품보관소(코인락커), 지역 종합병원 응급실 위치 사전 체크`;
        }

        // 시각적 강조 애니메이션
        guideCard.style.borderColor = '#3b82f6';
        guideCard.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.2)';
        setTimeout(() => {
            guideCard.style.borderColor = 'rgba(226, 232, 240, 0.95)';
            guideCard.style.boxShadow = 'var(--shadow-card)';
        }, 500);
    }

    // ==========================================
    // 3. 날짜 선택 및 기간(박/일) 자동 계산
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
    // 4. 관심사 대주제 탭 & 세부항목 선택 & 기타 입력
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

    const defaultChips = ['유명 대표 맛집', '감성 카페 & 디저트', '오션뷰 & 해변 산책'];
    chipBtns.forEach(chip => {
        if (defaultChips.includes(chip.getAttribute('data-val'))) {
            chip.classList.add('active');
        }
    });
    updateSelectedInterestsText();

    // ==========================================
    // 5. 인원 슬라이더 & 단일 선택 버튼 그룹
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
    // 6. 상단 인기 여행지 순위 클릭 이벤트 (즉시 우측 안내 카드 렌더링!)
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
                destinationInput.focus();
                destinationInput.style.backgroundColor = '#eff6ff';
                setTimeout(() => {
                    destinationInput.style.backgroundColor = '#ffffff';
                }, 400);

                // [중요 요구사항] 상단 순위 버튼 클릭 시 우측 안내 카드 즉시 실시간 렌더링!
                renderGuideCard(selectedDest, destKey);
            }
        });
    });

    destinationInput.addEventListener('input', () => {
        renderGuideCard(destinationInput.value.trim());
    });

    // ==========================================
    // 7. 🎲 광범위 균등 확률 랜덤 여행플랜 기능 (인기/비인기/소도시 포함)
    // ==========================================
    const allBudgets = ['10만원', '20만원', '30만원', '40만원', '50만원', '60만원', '70만원', '80만원', '90만원', '100만원', '150만원', '200만원', '250만원', '300만원'];

    if (randomPlanBtn) {
        randomPlanBtn.addEventListener('click', () => {
            // 1) 전체 48개 국내외 여행지 중 균등 랜덤 추첨
            const randItem = allDestinationsDB[Math.floor(Math.random() * allDestinationsDB.length)];
            destinationInput.value = randItem.name;

            // [중요 요구사항] 랜덤 클릭 시에도 해당 여행지의 우측 안내 카드 즉시 렌더링!
            renderGuideCard(randItem.name, randItem.key);

            // 2) 랜덤 날짜
            const randDaysLater = Math.floor(Math.random() * 14) + 2;
            const randDuration = Math.floor(Math.random() * 4) + 1; // 1~4박
            const randStart = new Date();
            randStart.setDate(randStart.getDate() + randDaysLater);
            const randEnd = new Date(randStart);
            randEnd.setDate(randEnd.getDate() + randDuration);

            startDateInput.value = randStart.toISOString().slice(0, 10);
            endDateInput.value = randEnd.toISOString().slice(0, 10);
            calculateDuration();

            // 3) 전체 예산 옵션 중 균등 랜덤 선택
            budgetSelect.value = allBudgets[Math.floor(Math.random() * allBudgets.length)];

            // 4) 관심사 20개 중 2~4개 무작위 조합 균등 선택
            chipBtns.forEach(c => c.classList.remove('active'));
            const allChipsArr = Array.from(chipBtns);
            const shuffled = allChipsArr.sort(() => 0.5 - Math.random());
            const pickCount = Math.floor(Math.random() * 3) + 2; // 2~4개
            shuffled.slice(0, pickCount).forEach(c => c.classList.add('active'));
            if (customInterestInput) customInterestInput.value = '';
            updateSelectedInterestsText();

            // 5) 인원 1~6명 및 관계 균등 선택
            const randCount = Math.floor(Math.random() * 6) + 1;
            companionRange.value = randCount;
            companionBadge.textContent = `${randCount}명`;

            const relBtns = document.querySelectorAll('#relation-btn-group .choice-btn');
            relBtns.forEach(b => b.classList.remove('active'));
            relBtns[Math.floor(Math.random() * relBtns.length)].classList.add('active');

            // 6) 이동수단 균등 선택
            const transBtns = document.querySelectorAll('#transport-btn-group .choice-btn');
            transBtns.forEach(b => b.classList.remove('active'));
            transBtns[Math.floor(Math.random() * transBtns.length)].classList.add('active');

            // 7) 숙소 (노숙, 무박 포함 전체 6개 중 균등 선택)
            const lodgeBtns = document.querySelectorAll('#lodging-btn-group .choice-btn');
            lodgeBtns.forEach(b => b.classList.remove('active'));
            lodgeBtns[Math.floor(Math.random() * lodgeBtns.length)].classList.add('active');

            // 8) 여행 스타일 (추천 8종 중 균등 선택)
            const styleBtns = document.querySelectorAll('#style-choice-group .style-card-btn');
            styleBtns.forEach(b => b.classList.remove('active'));
            styleBtns[Math.floor(Math.random() * styleBtns.length)].classList.add('active');

            destinationInput.style.backgroundColor = '#f0fdf4';
            setTimeout(() => {
                destinationInput.style.backgroundColor = '#ffffff';
            }, 500);
        });
    }

    // 기본 초기 화면 안내 카드 가동
    if (destinationInput.value) {
        renderGuideCard(destinationInput.value.trim());
    }

    // ==========================================
    // 8. 폼 제출 및 [여행 일정 생성하기] 클릭 후 일정표 카드 노출
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

        // [중요 요구사항] 사용자가 '여행 일정 생성하기'를 누른 뒤에 우측 일정표 카드 노출!
        if (resultCard) {
            resultCard.style.display = 'block';
        }

        // 우측 안내 카드 최신화
        renderGuideCard(destination);

        setLoadingState(true, '일정을 준비하는 중...', '서버와 연결하고 있습니다.');

        // 일정표 영역으로 부드럽게 스크롤
        if (resultCard) {
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

    // 9. 클립보드 복사
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

    // 10. Markdown(.md) 파일 다운로드
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
        apiErrorBox.style.display = 'none';

        if (typeof marked !== 'undefined') {
            renderedMarkdown.innerHTML = marked.parse(markdownText);
        } else {
            renderedMarkdown.innerHTML = `<pre>${markdownText}</pre>`;
        }

        resultContentWrapper.style.display = 'block';
        resultActions.style.display = 'flex';
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
