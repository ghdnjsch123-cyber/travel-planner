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
    const spotFilterTabs = document.getElementById('spot-filter-tabs');
    const spotCardsGrid = document.getElementById('spot-cards-grid');
    const spotTabs = document.querySelectorAll('.spot-tab');

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

    // 이정도면 얼마지? 모달 관련 DOM
    const calcEstimateBtn = document.getElementById('calc-estimate-btn');
    const estimateModal = document.getElementById('estimate-modal');
    const closeEstimateBtn = document.getElementById('close-estimate-btn');
    const applyEstimateBudgetBtn = document.getElementById('apply-estimate-budget-btn');
    const receiptDestName = document.getElementById('receipt-dest-name');
    const receiptSummaryChips = document.getElementById('receipt-summary-chips');
    const receiptNightsCount = document.getElementById('receipt-nights-count');
    const receiptPeopleCount = document.getElementById('receipt-people-count');
    const receiptStayCost = document.getElementById('receipt-stay-cost');
    const receiptTransportCost = document.getElementById('receipt-transport-cost');
    const receiptFoodCost = document.getElementById('receipt-food-cost');
    const receiptActivityCost = document.getElementById('receipt-activity-cost');
    const receiptTotalAmount = document.getElementById('receipt-total-amount');
    const receiptPerPerson = document.getElementById('receipt-per-person');

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
    // 2. 15선 이상 실제 스팟(숙소·차량·관광지) 데이터베이스 & 가이드 카드 렌더링
    // ==========================================

    // 카테고리 태그 명칭 매핑
    const typeLabelMap = {
        stay: '추천 숙소',
        transport: '차량·교통',
        spot: '주요 관광지'
    };

    // 주요 10대 인기 여행지 실제 15선 이상 상세 데이터베이스 (사진, 실명, 실제 예상금액)
    const curatedSpotsDB = {
        jeju: [
            // 숙소 5선
            { type: 'stay', name: '신라호텔 제주', price: '1박 약 340,000원~', desc: '중문관광단지 위치, 야외 사계절 온수풀 및 럭셔리 라운지', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '그랜드 조선 제주', price: '1박 약 270,000원~', desc: '루프탑 성인 전용 인피니티풀과 감각적인 부티크 인테리어', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '파르나스 호텔 제주', price: '1박 약 380,000원~', desc: '110m 국내 최장 오션 인피니티풀과 중문 절벽 파노라마 바다 뷰', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '애월 한담 독채 풀빌라', price: '1박 약 220,000원~', desc: '애월 바다 일몰이 눈앞에 펼쳐지는 프라이빗 독채 감성 숙소', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호텔 시리우스 제주', price: '1박 약 95,000원~', desc: '제주공항 5분 거리, 가성비 뛰어난 비즈니스 호텔 및 실내 수영장', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '롯데렌터카 아이오닉5 전기차', price: '24시간 약 58,000원~', desc: '공항 셔틀 직결, 최신 충전비 지원 및 완전자차 보험 포함', img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: 'SK렌터카 더올뉴 아반떼 CN7', price: '24시간 약 42,000원~', desc: '커플·소규모 제주 여행 인기 1위 실속형 가성비 세단', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '카니발 9인승 패밀리 밴', price: '24시간 약 85,000원~', desc: '가족 및 다인원 여행에 최적화된 넓은 실내 공간과 트렁크', img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '제주 급행버스 101/102번', price: '1회 3,000원', desc: '제주국제공항에서 동·서부 주요 해안 거점을 잇는 쾌속 버스', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 검증된 명소 사진)
            { type: 'spot', name: '성산일출봉 유네스코 지질명소', price: '성인 5,000원', desc: '푸른 동해 바다 위 웅장하게 솟아오른 천연 분화구 정상 트레킹', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Seongsan_Ilchulbong_from_the_air.jpg/500px-Seongsan_Ilchulbong_from_the_air.jpg' },
            { type: 'spot', name: '협재 해수욕장 & 비양도 뷰', price: '무료입장', desc: '에메랄드빛 투명한 바다와 하얀 모래사장, 환상적인 일몰 포토존', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Hyeopjae_Beach.jpg/500px-Hyeopjae_Beach.jpg' },
            { type: 'spot', name: '카멜리아힐 동백 수목원', price: '성인 10,000원', desc: '동양 최대 규모 동백꽃 정원과 피톤치드 가득한 감성 숲길', img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '섭지코지 해안 절경 산책로', price: '무료입장', desc: '붉은 화산송이 언덕과 쪽빛 바다가 어우러진 해안 비경', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Seopjikoji-ro%2C_Seongsan-eup%2C_Seogwipo-si%2C_Jeju-do%2C_South_Korea_-_panoramio.jpg/500px-Seopjikoji-ro%2C_Seongsan-eup%2C_Seogwipo-si%2C_Jeju-do%2C_South_Korea_-_panoramio.jpg' },
            { type: 'spot', name: '사려니숲길 삼나무 원시림', price: '무료입장', desc: '울창한 삼나무 피톤치드를 온몸으로 느끼는 힐링 산책로', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Saryeoni_Forest_Path.jpg/500px-Saryeoni_Forest_Path.jpg' },
            { type: 'spot', name: '오설록 티뮤지엄 & 녹차밭', price: '입장 무료', desc: '끝없이 펼쳐진 초록빛 유기농 차밭과 시그니처 말차 아이스크림', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Green_tea_field_in_Jeju.jpg/500px-Green_tea_field_in_Jeju.jpg' }
        ],
        busan: [
            // 숙소 5선
            { type: 'stay', name: '시그니엘 부산 해운대', price: '1박 약 430,000원~', desc: '해운대 엘시티 타워 럭셔리 오션뷰 & 인피니티풀 5성급 호텔', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '파크 하얏트 부산 마린시티', price: '1박 약 390,000원~', desc: '광안대교 파노라마 야경 뷰가 환상적인 럭셔리 부티크 호텔', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '아난티 코브 & 힐튼 기장', price: '1박 약 360,000원~', desc: '기장 바다 절벽 위 워터하우스 온천 & 아난티 타운 휴양 리조트', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '광안리 감성 오션스테이 에어비앤비', price: '1박 약 180,000원~', desc: '거실 통창 가득 광안리 해변 드론쇼가 직관되는 오션뷰 숙소', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '페어필드 바이 메리어트 송도', price: '1박 약 110,000원~', desc: '송도 해수욕장 케이블카 앞 가성비 뛰어난 메리어트 계열 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '해운대 블루라인파크 해변열차', price: '1인 왕복 12,000원~', desc: '미포~청사포~송정 동해남부선 해안 절경 레일 투어 열차', img: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '쏘카 더뉴 K5 렌터카', price: '24시간 약 49,000원~', desc: '부산역/서면역 픽업, 부산 전역 및 기장 해안 드라이브 최적', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '부산 시티투어버스 (레드라인)', price: '1일권 15,000원', desc: '부산역~광안리~해운대~용호만 주요 거점 무제한 자유 승하차', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '다이아몬드베이 럭셔리 요트 투어', price: '1인 약 25,000원~', desc: '광안대교 아래에서 노을과 야경을 즐기는 낭만 요트 세일링', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 부산 랜드마크 사진)
            { type: 'spot', name: '광안리 해수욕장 & 광안대교', price: '무료입장', desc: '반짝이는 광안대교 LED 야경과 주말 밤 펼쳐지는 드론 라이트쇼', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Gwangan_Bridge1.jpg/500px-Gwangan_Bridge1.jpg' },
            { type: 'spot', name: '해운대 해수욕장 & 동백섬 산책로', price: '무료입장', desc: '대한민국 대표 해변과 울창한 동백나무 숲길, APEC 누리마루', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Haeundae_Beach_in_Busan.jpg/500px-Haeundae_Beach_in_Busan.jpg' },
            { type: 'spot', name: '감천문화마을 알록달록 골목', price: '무료 (지도 2,000원)', desc: '계단식 파스텔톤 집들과 어린왕자 조각상 인기 포토스팟', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Colorful_houses_in_Gamcheon_Culture_Village_at_sunset_in_Busan_South_Korea.jpg/500px-Colorful_houses_in_Gamcheon_Culture_Village_at_sunset_in_Busan_South_Korea.jpg' },
            { type: 'spot', name: '영도 흰여울문화마을', price: '무료입장', desc: '바다 절벽을 따라 조성된 한국의 산토리니 감성 해안 골목길', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Huinnyeoul_Culture_Village.jpg/500px-Huinnyeoul_Culture_Village.jpg' },
            { type: 'spot', name: '기장 해동용궁사 해안 사찰', price: '무료입장', desc: '푸른 파도가 부딪히는 바위 절벽 바로 위에 세워진 신비로운 수상 사찰', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Haedong_Yonggungsa_Temple.jpg/500px-Haedong_Yonggungsa_Temple.jpg' },
            { type: 'spot', name: '자갈치시장 & BIFF 광장 먹거리', price: '자유 탐방', desc: '싱싱한 활어회와 바삭한 씨앗호떡, 비빔당면 등 부산 로컬 미식 성지', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Jagalchi_Market_Busan_01.jpg/500px-Jagalchi_Market_Busan_01.jpg' }
        ],
        gangneung: [
            // 숙소 5선
            { type: 'stay', name: '세인트존스 호텔 강릉', price: '1박 약 160,000원~', desc: '강문해변 솔밭 앞 초대형 인피니티풀과 쾌적한 오션뷰 객실', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '씨마크 호텔 강릉 경포', price: '1박 약 450,000원~', desc: '경포 해변 절벽 위 백색 건축미와 럭셔리 온수 인피니티풀 5성급', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '롯데리조트 속초', price: '1박 약 260,000원~', desc: '3면이 동해 바다로 둘러싸인 워터파크와 전 객실 파노라마 오션뷰', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '안목해변 감성 오션스테이', price: '1박 약 140,000원~', desc: '커피거리 바로 앞, 테라스에서 동해 일출을 직관하는 감성 펜션', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '속초 체스터톤스 레지던스', price: '1박 약 90,000원~', desc: '청초호 인근 사계절 온천수 온수 수영장과 극가성비 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: 'KTX-이음 강릉선 고속열차', price: '편도 27,600원', desc: '서울역/청량리에서 강릉역까지 1시간 40분 만에 주파하는 준고속열차', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Korail_EMU-260_Gangneung_Station.jpg/500px-Korail_EMU-260_Gangneung_Station.jpg' },
            { type: 'transport', name: '그린카 투싼 올뉴 SUV 렌트', price: '24시간 약 62,000원~', desc: '강릉역/터미널 바로 앞 픽업, 7번 국도 낭만 해안 드라이브', img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '정동진 바다부채길 셔틀버스', price: '1회 약 1,500원', desc: '정동진 썬크루즈와 심곡항을 잇는 천연 해안단구 탐방 셔틀', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '속초 대포항 해상 유람선', price: '대인 약 18,000원', desc: '설악산과 속초 해안선을 바다 위에서 한눈에 조망하는 크루즈', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 강릉/속초 명소 사진)
            { type: 'spot', name: '안목해변 커피거리', price: '무료 (커피 6,000원~)', desc: '푸른 바다를 내려다보며 명품 핸드드립 커피와 디저트를 즐기는 명소', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Anmok_Beach_20220430_011.jpg/500px-Anmok_Beach_20220430_011.jpg' },
            { type: 'spot', name: '강릉 아르떼뮤지엄', price: '성인 17,000원', desc: '영원한 자연을 주제로 한 빛과 소리의 환상적인 몰입형 미디어아트관', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '경포호 자전거 둘레길 & 경포대', price: '무료입장', desc: '잔잔한 호수 둘레길 자전거 산책과 탁 트인 경포 해수욕장 백사장', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Gyeongpo_Beach_1.jpg/500px-Gyeongpo_Beach_1.jpg' },
            { type: 'spot', name: '속초관광수산시장 (중앙시장)', price: '자유 (닭강정 2만원~)', desc: '만석닭강정, 오징어순대, 씨앗호떡 등 동해안 최고의 먹거리 천국', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '속초 영금정 해상정자', price: '무료입장', desc: '바위에 부딪히는 거문고 소리 같은 파도와 동해 일출의 명소', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Yeonggeumjeong_20221209_016.jpg/500px-Yeonggeumjeong_20221209_016.jpg' },
            { type: 'spot', name: '정동진 썬크루즈 조각공원', price: '대인 5,000원', desc: '해안 절벽 위에 올려진 초대형 유람선과 끝없는 동해 수평선 포토존', img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80' }
        ],
        gyeongju: [
            // 숙소 5선
            { type: 'stay', name: '라한셀렉트 경주', price: '1박 약 210,000원~', desc: '보문호수 정면 파노라마 뷰, 감성 북스토어 & 온수 수영장 완비', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '힐튼 경주', price: '1박 약 240,000원~', desc: '보문관광단지 중심 5성급 호텔, 실내외 풀장과 우양미술관 인접', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '황리단길 한옥스테이 소담', price: '1박 약 170,000원~', desc: '고즈넉한 서까래와 잔디 마당이 있는 황리단길 감성 전통 한옥 독채', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '소설재 황리단길점', price: '1박 약 140,000원~', desc: '모던한 편의시설과 단아한 전통미가 조화된 부티크 한옥 게스트하우스', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '더케이호텔 경주', price: '1박 약 110,000원~', desc: '황룡사 9층 목탑 뷰와 천연 온천 사우나를 갖춘 합리적 가성비 호텔', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '황리단길 전동스쿠터 & 삼륜바이크', price: '1시간 약 15,000원~', desc: '대릉원, 첨성대, 교촌마을 일대를 시원하게 누비는 전동 모빌리티', img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '신경주역 쏘카 카셰어링 아반떼', price: '24시간 약 45,000원~', desc: 'KTX 신경주역 주차장에서 즉시 픽업하여 경주 전역 자유 여행', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '경주 시내 순환 10번/11번 버스', price: '1회 1,600원', desc: '경주역, 황리단길, 보문단지, 불국사를 원형으로 연결하는 핵심 버스', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '보문호수 전동 오리배 & 모터보트', price: '30분 약 25,000원', desc: '잔잔하고 넓은 보문호를 가로지르며 호수 풍경을 즐기는 힐링 보트', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 경주 역사문화 랜드마크 사진)
            { type: 'spot', name: '첨성대 & 핑크뮬리 야생화단지', price: '무료입장', desc: '동양 최고의 천문대 유적과 계절마다 만개하는 야생화 및 핑크뮬리 꽃밭', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Cheomseongdae-1.jpg/500px-Cheomseongdae-1.jpg' },
            { type: 'spot', name: '동궁과 월지 (안압지) 궁궐 야경', price: '성인 3,000원', desc: '달빛 아래 잔잔한 연못에 비치는 신라 별궁의 황홀한 반영 야경', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Water_reflection_of_Donggung_Palace_in_Wolji_Pond_at_blue_hour_in_Gyeongju_South_Korea.jpg/500px-Water_reflection_of_Donggung_Palace_in_Wolji_Pond_at_blue_hour_in_Gyeongju_South_Korea.jpg' },
            { type: 'spot', name: '불국사 & 다보탑·석가탑', price: '무료입장 (국가유산)', desc: '유네스코 세계문화유산, 정교한 신라 불교 석조 건축의 위대한 걸작', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Lotus_Flower_Bridge_and_Seven_Treasure_Bridge_at_Bulguksa_in_Gyeongju%2C_Korea.jpg/500px-Lotus_Flower_Bridge_and_Seven_Treasure_Bridge_at_Bulguksa_in_Gyeongju%2C_Korea.jpg' },
            { type: 'spot', name: '대릉원 고분군 & 목련 포토존', price: '대릉원 무료 (천마총 3,000원)', desc: '거대한 신라 고분들이 모여있는 신비로운 숲길과 천마총 내부 관람', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Daereungwon_Tomb_Complex.jpg/500px-Daereungwon_Tomb_Complex.jpg' },
            { type: 'spot', name: '황리단길 감성 카페 & 디저트 거리', price: '자유 탐방', desc: '전통 한옥을 리모델링한 트렌디한 카페, 십원빵, 소품샵 핫플레이스', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '국립경주박물관 & 성덕대왕신종', price: '무료입장', desc: '신라 천년의 황금 금관과 에밀레종의 은은한 종소리를 만나는 박물관', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' }
        ],
        yeosu: [
            // 숙소 5선
            { type: 'stay', name: '소노캄 여수 (구 엠블호텔)', price: '1박 약 230,000원~', desc: '오동도 입구에 우뚝 솟은 전 객실 바다전망 여수 랜드마크 5성급', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '라마다프라자 바이 윈덤 여수', price: '1박 약 150,000원~', desc: '옥상에서 출발하는 해상 짚트랙과 바다를 굽어보는 인피니티풀 호텔', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '르그랑블루 풀빌라 리조트', price: '1박 약 320,000원~', desc: '돌산도 해안 절벽 위 국내 최고 수준의 사계절 온수 인피니티풀', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '슈가브리움 오션 리조트', price: '1박 약 360,000원~', desc: '발리 감성의 이국적 풀빌라 인테리어와 플로팅 조식 체험', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '유탑 마리나 호텔 & 리조트', price: '1박 약 130,000원~', desc: '여수엑스포역 인근, 요트 투어 연계 혜택과 가성비 뛰어난 오션뷰 룸', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '여수 해상케이블카 (크리스탈 캐빈)', price: '왕복 대인 22,000원', desc: '바닥이 투명 유리로 된 바다 위를 가로지르는 아찔한 공중 횡단', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Yeosu_cable_car.jpg/500px-Yeosu_cable_car.jpg' },
            { type: 'transport', name: '롯데렌터카 코나 하이브리드', price: '24시간 약 52,000원~', desc: '여수엑스포역 KTX 하차 직결 픽업, 돌산도 해안도로 드라이브', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '오동도 동백열차', price: '편도 1,000원', desc: '방파제 길을 건너 동백섬 안쪽 입구까지 편안하게 연결하는 꼬마열차', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '여수 밤바다 이사부 크루즈', price: '대인 약 25,000원~', desc: '돌산대교와 거북선대교를 지나는 낭만 야경 투어와 선상 불꽃쇼', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 여수 바다 및 명소 사진)
            { type: 'spot', name: '오동도 동백나무 숲길 산책로', price: '무료입장', desc: '기암절벽과 붉은 동백꽃 터널이 이어지는 여수 제1경의 아름다운 섬', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Yeosu_Odongdo_20180929_002.jpg/500px-Yeosu_Odongdo_20180929_002.jpg' },
            { type: 'spot', name: '향일암 일출 해상 사찰', price: '무료입장', desc: '거대한 바위 틈을 지나 남해 수평선이 아득하게 펼쳐지는 최고의 일출지', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/The_Namhae_sea_through_the_Temple_of_Hyangiram_20091205.JPG/500px-The_Namhae_sea_through_the_Temple_of_Hyangiram_20091205.JPG' },
            { type: 'spot', name: '낭만포차 거리 & 하멜등대', price: '메뉴당 3~4만원대', desc: '빨간 하멜등대 앞 바다 바람을 맞으며 맛보는 돌문어해물삼합과 버스킹', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '고소동 1004 벽화마을', price: '무료입장', desc: '언덕 위 아기자기한 감성 벽화들과 바다가 한눈에 내려다보이는 루프탑 카페', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '아쿠아플라넷 여수 & 벨루가', price: '대인 약 33,400원', desc: '귀여운 흰고래 벨루가와 대형 메인수조 해양 생태계 체험관', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '돌산공원 전망대 & 돌산대교 야경', price: '무료입장', desc: '화려한 오색 조명으로 빛나는 돌산대교와 여수항 밤바다의 전경', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Dolsan_Bridge2.jpg/500px-Dolsan_Bridge2.jpg' }
        ],
        osaka: [
            // 숙소 5선
            { type: 'stay', name: '스위소텔 난카이 오사카 (난바)', price: '1박 약 310,000원~', desc: '난카이 난바역 직결, 도톤보리 도보 5분 5성급 럭셔리 호텔', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호텔 한큐 레스파이어 오사카', price: '1박 약 190,000원~', desc: '우메다역 요도바시 카메라 건물 상층, 뛰어난 쇼핑 접근성과 쾌적한 룸', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '콘래드 오사카', price: '1박 약 580,000원~', desc: '페스티벌 타워 40층 파노라마 시티 스카이라인 뷰를 자랑하는 최고급 호텔', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '교토 기온 료칸 야치요', price: '1박 약 390,000원~', desc: '전통 일본식 정원과 정통 가이세키 코스 요리를 맛볼 수 있는 온천 료칸', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호텔 더 미츠이 교토', price: '1박 약 750,000원~', desc: '니조성 정문 앞 천연 온천 수영 스파를 품은 세계적인 럭셔리 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '간사이공항 특급 라피트 열차', price: '편도 약 13,000원', desc: '공항에서 난바역까지 38분 만에 쾌속으로 연결하는 레트로 미래형 특급', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Nankai_50000_series_at_Kishi-Wada_Station.jpg/500px-Nankai_50000_series_at_Kishi-Wada_Station.jpg' },
            { type: 'transport', name: '오사카 주유패스 (Amazing Pass)', price: '1일권 약 28,000원~', desc: '오사카 시영 메트로 전 노선 무제한 탑승 + 40여 개 주요 관광지 무료 입장', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '한큐 투어리스트 1일 패스', price: '1인 약 7,000원', desc: '오사카 우메다에서 교토 가와라마치 및 고베까지 한큐 전철 무제한 이용', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: 'JR 간사이 와이드 레일패스', price: '5일권 약 105,000원', desc: '오사카, 교토, 나라, 고베, 오카야마 신칸센까지 커버하는 실속형 레일패스', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 오사카 & 교토 랜드마크 사진)
            { type: 'spot', name: '도톤보리 & 글리코상 포토존', price: '무료 탐방', desc: '화려한 네온사인과 타코야키, 오코노미야키를 즐기는 오사카의 심장부', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Dotombori_neon_signs.JPG/500px-Dotombori_neon_signs.JPG' },
            { type: 'spot', name: '오사카성 천수각 & 성곽공원', price: '천수각 약 5,500원', desc: '황금빛 장식의 웅장한 천수각과 거대한 해자가 어우러진 역사 랜드마크', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Osaka_Castle_02bs3200.jpg/500px-Osaka_Castle_02bs3200.jpg' },
            { type: 'spot', name: '유니버설 스튜디오 재팬 (USJ)', price: '1일권 약 86,000원~', desc: '슈퍼 닌텐도 월드 마리오 카트와 위저딩 월드 오브 해리포터 테마파크', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '교토 후시미 이나리 신사 (여우신사)', price: '무료입장', desc: '산등성이를 따라 붉은 천 개의 토리이 터널이 끝없이 이어지는 신비로운 장관', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Fushimi_Inari_Taisha_Senbon_Torii.jpg/500px-Fushimi_Inari_Taisha_Senbon_Torii.jpg' },
            { type: 'spot', name: '교토 기요미즈데라 (청수사)', price: '입장료 약 3,600원', desc: '깎아지른 절벽 위 못을 쓰지 않고 지은 목조 본당과 교토 시내 전경', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Kiyomizu-dera_in_Kyoto-r.jpg/500px-Kiyomizu-dera_in_Kyoto-r.jpg' },
            { type: 'spot', name: '교토 아라시야마 대나무숲 (치쿠린)', price: '무료입장', desc: '바람에 서걱이는 대나무 잎 소리와 자연의 정취를 만끽하는 산책 명소', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Arashiyama_Bamboo_Grove.jpg/500px-Arashiyama_Bamboo_Grove.jpg' }
        ],
        fukuoka: [
            // 숙소 5선
            { type: 'stay', name: '미야코 호텔 하카타', price: '1박 약 250,000원~', desc: '하카타역 지하 직결, 루프탑 야외 온천 스파 수영장을 갖춘 최고 입지', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '그랜드 하얏트 후쿠오카', price: '1박 약 320,000원~', desc: '캐널시티 쇼핑몰 중심부와 바로 연결된 고품격 5성급 럭셔리 호텔', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '유후인 바이엔 가든 리조트 료칸', price: '1박 약 420,000원~', desc: '만 평 규모의 자연 숲속 노천온천과 최고급 소고기 가이세키 정식', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '유후인 무소엔 노천온천 료칸', price: '1박 약 480,000원~', desc: '유후다케 산봉우리를 정면으로 바라보는 일본 최대 규모의 초대형 노천탕', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호텔 몬테레 후쿠오카', price: '1박 약 150,000원~', desc: '텐진역 인근, 투숙객 전용 천연 온천수 대욕장과 사우나 완비 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '후쿠오카 지하철 1일 승차권', price: '1인 약 5,800원', desc: '공항선(공항에서 하카타 5분) 및 나나쿠마선 하루 종일 무제한 탑승', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: 'JR 북큐슈 레일패스 (3일권)', price: '1인 약 105,000원', desc: '하카타에서 유후인, 벳푸, 구마모토까지 특급 열차 및 신칸센 무제한', img: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '특급 유후인노모리 관광열차', price: '편도 약 45,000원', desc: '원목 클래식 인테리어와 에키벤 도시락을 즐기는 초인기 온천 관광열차', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/JNR_KiHa_71_Yufuin_no_Mori_20100613.jpg/500px-JNR_KiHa_71_Yufuin_no_Mori_20100613.jpg' },
            { type: 'transport', name: '후쿠오카 오픈톱 시티투어 버스', price: '대인 약 15,000원', desc: '지붕 없는 2층 버스로 도심 하이웨이와 해안 도로를 달리는 투어 버스', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 후쿠오카 & 큐슈 랜드마크 사진)
            { type: 'spot', name: '유후인 긴린코 호수 & 유노츠보 거리', price: '무료입장', desc: '온천수가 솟아올라 신비로운 아침 물안개가 피어오르는 호수와 디저트 거리', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Lake_Kinrin_in_Yufuin%2C_Oita_-_Aug_24%2C_2018_%281%29.jpg/500px-Lake_Kinrin_in_Yufuin%2C_Oita_-_Aug_24%2C_2018_%281%29.jpg' },
            { type: 'spot', name: '다자이후 텐만구 학문의 신사', price: '무료입장', desc: '학문의 신을 모신 유서 깊은 신사와 갓 구운 우메가에모찌(매화떡)', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/20100719_Dazaifu_Tenmangu_Shrine_3328.jpg/500px-20100719_Dazaifu_Tenmangu_Shrine_3328.jpg' },
            { type: 'spot', name: '씨사이드 모모치 해변 & 후쿠오카 타워', price: '타워 전망대 약 7,500원', desc: '이국적인 인공 해변과 234m 타워에서 바라보는 하카타만 360도 석양', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Momochi_Tower_ESE_from_Fukuoka_City_Museum_Reflecting_Pool_Momochi-hama_1-ch%C5%8Dme_Sawara-ku_Fukuoka_20240111.jpg/500px-Momochi_Tower_ESE_from_Fukuoka_City_Museum_Reflecting_Pool_Momochi-hama_1-ch%C5%8Dme_Sawara-ku_Fukuoka_20240111.jpg' },
            { type: 'spot', name: '나카스 강변 야타이(포장마차) 거리', price: '라멘 약 8,000원~', desc: '강변을 따라 늘어선 포장마차에서 진한 하카타 돈코츠 라멘과 하이볼 한잔', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '캐널시티 하카타 음악 분수쇼', price: '무료 관람', desc: '곡선형 복합 쇼핑몰 중심 운하에서 매시 정각 웅장하게 펼쳐지는 분수쇼', img: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '벳푸 가마도 지옥온천 순례', price: '입장료 약 4,000원', desc: '신비로운 코발트블루 온천수와 온천 증기로 쪄낸 달걀 및 사이다 맛보기', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80' }
        ],
        tokyo: [
            // 숙소 5선
            { type: 'stay', name: '도쿄 에디션 도라노몬', price: '1박 약 720,000원~', desc: '도쿄타워가 눈앞에 펼쳐지는 감각적인 정원 콘셉트의 하이엔드 럭셔리', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호텔 그레이서리 신주쿠', price: '1박 약 220,000원~', desc: '신주쿠 가부키초 중심, 실물 크기 거대 고질라 헤드가 반기는 랜드마크', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '미츠이 가든 호텔 긴자 프리미어', price: '1박 약 280,000원~', desc: '16층 고층 로비에서 긴자 스카이라인 조망과 세련된 바를 갖춘 인기 호텔', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '아사쿠사 뷰 호텔', price: '1박 약 180,000원~', desc: '도쿄 스카이트리와 유서 깊은 센소지 사원의 뷰가 한눈에 들어오는 객실', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '렘 롯폰기 호텔', price: '1박 약 160,000원~', desc: '롯폰기역 도보 1분, 전 객실 최고급 안마의자를 구비한 실속형 호텔', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '도쿄 서브웨이 72시간 패스', price: '1인 약 13,500원', desc: '도쿄 메트로 & 도에이 지하철 전 13개 노선을 3일간 무제한 탑승', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '케이세이 스카이라이너 급행', price: '편도 약 21,000원', desc: '나리타공항에서 닛포리/우에노까지 시속 160km로 36분 만에 주파', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Keisei_Skyliner_AE01_20100717.jpg/500px-Keisei_Skyliner_AE01_20100717.jpg' },
            { type: 'transport', name: '나리타 익스프레스 (N\'EX) 왕복', price: '외국인 왕복 약 45,000원', desc: '나리타공항에서 도쿄역, 신주쿠, 시부야까지 갈아탐 없이 직통 연결', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '유리카모메 무인 모노레일', price: '1일권 약 7,400원', desc: '레인보우 브릿지를 건너 오다이바 해상 인공섬을 감상하는 모노레일', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 도쿄 랜드마크 사진)
            { type: 'spot', name: '시부야 스카이 전망대 & 스크램블', price: '입장권 약 20,000원~', desc: '지상 229m 옥상 루프탑에서 즐기는 360도 도쿄 전경과 교차로 인파', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg/500px-Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg' },
            { type: 'spot', name: '아사쿠사 센소지 사원 & 카미나리몬', price: '무료입장', desc: '붉은 카미나리몬 제등과 전통 간식(당고, 멜론빵)이 늘어선 도쿄 최고 사찰', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Tokyo-metro-Kaminarimon-Sensoji-District-Gate.jpg/500px-Tokyo-metro-Kaminarimon-Sensoji-District-Gate.jpg' },
            { type: 'spot', name: '도쿄타워 전망대 & 야경', price: '대인 약 14,000원', desc: '도쿄의 상징이자 붉은 조명으로 물드는 낭만적인 클래식 랜드마크', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Tokyo_Tower_and_around_Skyscrapers.jpg/500px-Tokyo_Tower_and_around_Skyscrapers.jpg' },
            { type: 'spot', name: '메이지 신궁 & 하라주쿠 다케시타', price: '무료입장', desc: '도심 속 거대한 원시림 숲길과 일본 10대 유행 발신지 골목의 반전 매력', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '신주쿠 교엔 황실 정원', price: '대인 500엔 (약 4,500원)', desc: '전통 일본식 정원과 프랑스식 정원이 조화된 애니메이션 감성 도심 오아시스', img: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '팀랩 플래닛 도쿄 (토요스)', price: '입장권 약 36,000원~', desc: '맨발로 물속을 걸으며 온몸으로 체험하는 환상적인 빛과 인터랙티브 미디어아트', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80' }
        ],
        danang: [
            // 숙소 5선
            { type: 'stay', name: '인터컨티넨탈 다낭 선 페닌슐라', price: '1박 약 650,000원~', desc: '손짜 반도 열대 정글과 프라이빗 비치를 품은 세계적인 럭셔리 리조트', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '하얏트 리젠시 다낭 리조트 & 스파', price: '1박 약 290,000원~', desc: '미케비치 앞 대형 키즈풀과 캠프 하얏트를 갖춘 가족 휴양 특화 리조트', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '프리미어 빌리지 다낭 리조트', price: '1박 약 450,000원~', desc: '전 객실 프라이빗 개인 수영장과 풀 키친을 갖춘 럭셔리 풀빌라', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '호이안 벨 마리나 리조트 & 스파', price: '1박 약 120,000원~', desc: '호이안 올드타운 도보 5분 거리, 강변 인피니티풀과 뛰어난 가성비', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: 'TMS 호텔 다낭 비치', price: '1박 약 90,000원~', desc: '미케비치 도보 1분, 25층 환상적인 루프탑 오션풀 가성비 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: '다낭~호이안 전담 기사 포함 일일 렌트', price: '1일(10시간) 약 55,000원', desc: '에어컨 완비 전용 SUV 차량으로 바나힐, 호이안까지 자유롭게 투어', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '그랩 (Grab) 택시 호출 서비스', price: '1회 약 3,000~8,000원', desc: '바가지 걱정 없이 정찰제로 시내와 해변을 편리하게 이동하는 필수 앱', img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '바나힐 왕복 리무진 셔틀버스', price: '1인 왕복 약 12,000원', desc: '시내 호텔에서 바나힐 케이블카 승강장까지 편안하게 이동하는 셔틀', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '호이안 투본강 목선 소원배', price: '1척(2~3인) 약 10,000원', desc: '형형색색의 등불을 켜고 강물에 소원초를 띄우는 낭만적인 나룻배', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 다낭 & 호이안 랜드마크 사진)
            { type: 'spot', name: '썬월드 바나힐 골든브릿지 (신의 손)', price: '입장권 약 48,000원', desc: '해발 1,400m 구름 위 거대한 바위 손이 받치고 있는 금빛 다리 랜드마크', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Golden_Bridge_at_Ba_Na_Hills_20250718.jpg/500px-Golden_Bridge_at_Ba_Na_Hills_20250718.jpg' },
            { type: 'spot', name: '호이안 올드타운 유네스코 역사거리', price: '거리 티켓 약 6,500원', desc: '노란빛 프랑스-베트남풍 건물들과 밤마다 빛나는 환상적인 오색 등불', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Hoi_An_lanterns_at_night.jpg/500px-Hoi_An_lanterns_at_night.jpg' },
            { type: 'spot', name: '미케비치 해변 & 휴양 비치', price: '무료 (코코넛 2,000원)', desc: '포브스 선정 세계 6대 해변, 백사장과 야자수가 이어지는 휴양 성지', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '다낭 대성당 (핑크성당)', price: '무료입장', desc: '프랑스 식민지 시절 세워진 파스텔 핑크빛 고딕 양식 건축물과 포토존', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Da_Nang_Cathedral_20181023.jpg/500px-Da_Nang_Cathedral_20181023.jpg' },
            { type: 'spot', name: '손짜 린응사 (영흥사) 해수관음상', price: '무료입장', desc: '다낭 바다를 굽어보는 67m 높이의 동양 최대 백옥 해수관음보살상', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '안방비치 & 덱하우스 레스토랑', price: '자유 (식사 1~2만원대)', desc: '푸른 파도를 바라보며 시원한 수제 버거와 망고 스무디를 즐기는 비치클럽', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' }
        ],
        bangkok: [
            // 숙소 5선
            { type: 'stay', name: '카펠라 방콕 (차오프라야 강변)', price: '1박 약 850,000원~', desc: '전 객실 차오프라야 리버뷰, 미쉐린 스타 다이닝을 갖춘 최상급 럭셔리', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '포시즌스 호텔 방콕 앳 차오프라야', price: '1박 약 620,000원~', desc: '계단식 강변 수영장과 아트 갤러리가 공존하는 세계적인 5성급 리조트', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '방콕 메리어트 마르퀴스 퀸즈파크', price: '1박 약 210,000원~', desc: '프롬퐁역 도보 거리, 벤자시리 공원 전망과 초대형 인터내셔널 뷔페', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '반얀트리 방콕', price: '1박 약 240,000원~', desc: '럭셔리 스파 시설과 61층 문바(Moon Bar) 루프탑을 보유한 특급 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
            { type: 'stay', name: '이스틴 그랜드 호텔 파야타이', price: '1박 약 180,000원~', desc: '공항철도 파야타이역 직결, 2개의 야외 인피니티풀을 갖춘 초인기 호텔', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
            // 차량·교통 4선
            { type: 'transport', name: 'BTS 스카이트레인 1일 무제한 패스', price: '1인 150바트 (약 6,000원)', desc: '방콕 도심 지상철 전 노선을 하루 종일 트래픽 잼 없이 무제한 탑승', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '차오프라야 투어리스트 보트 홉온홉오프', price: '1일권 150바트 (약 6,000원)', desc: '왕궁, 왓 아룬, 아이콘시암 등 주요 강변 관광지를 오가는 수상 크루즈', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '볼트 (Bolt) / 그랩 (Grab) 차량 호출', price: '1회 약 3,000~9,000원', desc: '교통 체증 심한 방콕에서 바가지 없이 정찰제로 승차하는 필수 앱', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
            { type: 'transport', name: '수완나품 국제공항 프라이빗 VIP 밴', price: '편도 약 32,000원', desc: '공항 입국장 피켓 미팅 후 호텔 로비까지 짐 싣고 직행하는 쾌적한 이동', img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
            // 주요 명소 6선 (실제 방콕 랜드마크 사진)
            { type: 'spot', name: '왓 아룬 (새벽사원) & 전통의상 스냅', price: '입장료 약 4,000원', desc: '도자기 타일로 장식된 화려한 불탑과 강 건너로 지는 환상적인 일몰 뷰', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Templo_Wat_Arun%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_30.jpg/500px-Templo_Wat_Arun%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_30.jpg' },
            { type: 'spot', name: '아이콘시암 복합 쇼핑몰 (쑥시암)', price: '무료 관람 (간식 1,500원~)', desc: '실내에 그대로 재현된 태국 수상시장 먹거리와 세계적 명품 브랜드 타운', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '왓 프라깨우 (에메랄드 사원) & 방콕 왕궁', price: '입장료 약 20,000원', desc: '태국 최고의 국보인 에메랄드 불상을 모신 찬란한 황금빛 왕실 사원', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg/500px-A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg' },
            { type: 'spot', name: '짜뚜짝 주말시장 벼룩시장', price: '자유 탐방', desc: '15,000개 이상의 상점이 밀집한 동남아 최대 규모의 야외 쇼핑 마켓', img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '티츄카 (Tichuca) 루프탑 바', price: '칵테일 약 20,000원~', desc: '거대한 발광 해파리 조형물과 46층에서 바라보는 360도 방콕 도시 야경', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
            { type: 'spot', name: '아시아티크 더 리버프론트 야시장', price: '무료입장', desc: '강변 대관람차와 시원한 강바람을 맞으며 즐기는 쇼핑 및 라이브 펍 거리', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' }
        ]
    };

    // 그 외 국내/해외 소도시 및 커스텀 여행지를 위한 지능형 15선 스팟 생성기
    function generateDynamicSpots(destName, key = '') {
        const cleanName = destName.replace(/[\[\]\(\)\{\}]/g, '').split(' ')[0] || destName;
        const isOverseas = ['rome', 'prague', 'barcelona', 'paris', 'hawaii', 'sydney', 'bali', 'singapore', 'cebu', 'sapporo', 'nagoya', 'nhatrang', 'phuquoc', 'chiangmai', 'taipei'].includes(key) ||
            /유럽|미국|이탈리아|프랑스|스페인|체코|호주|하와이|발리|싱가포르|일본|대만|베트남|태국|필리핀|영국|독일|스위스|오스트리아|터키/.test(destName);
        
        const isCoastal = /해변|바다|도|섬|남해|통영|군산|목포|포항|울진|태안|울릉|여수|부산|제주|동해|서해/.test(destName);

        if (isOverseas) {
            return [
                // 숙소 5선
                { type: 'stay', name: `${cleanName} 중심가 5성급 럭셔리 호텔`, price: '1박 약 380,000원~', desc: `${cleanName} 랜드마크 전망과 전용 스파, 최상급 컨시어지 서비스`, img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 역사지구 부티크 호텔`, price: '1박 약 240,000원~', desc: '고풍스러운 건축미와 도보 관광에 최적화된 편리한 입지', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 감성 뷰 에어비앤비 독채`, price: '1박 약 190,000원~', desc: '현지인처럼 살아보는 독립 주방 및 멋진 테라스 뷰를 갖춘 숙소', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 리조트 & 인피니티풀`, price: '1박 약 310,000원~', desc: '이국적인 휴양을 위한 야외 수영장과 풀사이드 라운지 바', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 역세권 실속형 시티 호텔`, price: '1박 약 120,000원~', desc: '대중교통 이동이 편리하고 가성비 뛰어난 현대식 비즈니스 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
                // 차량·교통 4선
                { type: 'transport', name: `${cleanName} 공항 익스프레스 직통열차`, price: '편도 약 18,000원', desc: '국제공항에서 도심 중앙역까지 쾌속으로 연결하는 직통 급행', img: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: `${cleanName} 시티 메트로 & 트램 3일 패스`, price: '3일권 약 29,000원', desc: '도시 내 지하철, 트램, 시내버스를 자유롭게 무제한 탑승', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: '현지 렌터카 SUV (네비 & 보험 포함)', price: '24시간 약 78,000원~', desc: '근교 소도시 및 절경 드라이브를 위한 안전한 렌터카 서비스', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: `${cleanName} 홉온홉오프 2층 관광버스`, price: '1일권 약 35,000원', desc: '도시 대표 명소만을 순환하며 한국어 오디오 가이드 지원', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
                // 주요 명소 6선
                { type: 'spot', name: `${cleanName} 대표 광장 & 랜드마크 대성당`, price: '무료입장 (탑 약 1만원)', desc: `수백 년 역사의 건축 예술과 ${cleanName}의 상징적인 중심 광장`, img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 국립 미술관 & 박물관`, price: '입장료 약 22,000원', desc: '세계적인 거장들의 회화 및 고대 조각 작품 소장 예술 성지', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 구시가지 전통 골목 산책로`, price: '무료입장', desc: '조약돌 바닥과 아기자기한 현지 부티크 상점들이 이어진 감성 거리', img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 파노라마 시티 전망대`, price: '성인 약 25,000원', desc: `가장 높은 전망대에서 내려다보는 ${cleanName}의 황홀한 360도 일몰과 야경`, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 중앙 전통시장 & 푸드홀`, price: '자유 (메뉴 1~2만원)', desc: '현지 로컬 식재료와 갓 조리된 전통 미식을 맛보는 활기찬 마켓', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 강변/해변 리버크루즈 & 산책로`, price: '탑승료 약 28,000원', desc: '노을 지는 강변을 따라 흐르는 낭만적인 음악과 야경 감상 코스', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' }
            ];
        } else {
            // 국내 소도시 및 힐링/자연 명소
            return [
                // 숙소 5선
                { type: 'stay', name: `${cleanName} 프리미엄 감성 독채 풀빌라`, price: '1박 약 260,000원~', desc: isCoastal ? '탁 트인 오션뷰와 사계절 온수 개인풀 감성 스테이' : '피톤치드 숲속 자연과 자쿠지가 어우러진 힐링 독채 펜션', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 전통 한옥스테이 & 고택`, price: '1박 약 150,000원~', desc: '따뜻한 온돌방과 고즈넉한 처마 끝 풍경을 즐기는 전통 숙소', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 호텔 & 온천 스파 리조트`, price: '1박 약 180,000원~', desc: '지역 대표 랜드마크 휴양 호텔, 사우나 및 조식 뷔페 제공', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 럭셔리 마운틴/리버 글램핑`, price: '1박 약 170,000원~', desc: '호텔식 침구와 바비큐 그릴, 불멍을 즐길 수 있는 낭만 글램핑', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
                { type: 'stay', name: `${cleanName} 시내 가성비 비즈니스 호텔`, price: '1박 약 85,000원~', desc: '터미널/KTX역 인근 깔끔하고 조용한 실속형 현대식 호텔', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
                // 차량·교통 4선
                { type: 'transport', name: '현지 렌터카 아반떼/K5 (완전자차)', price: '24시간 약 46,000원~', desc: `${cleanName} 전역의 숨은 드라이브 코스와 맛집 탐방에 필수`, img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: `${cleanName} KTX/고속버스 연계 셔틀`, price: '1회 1,500원', desc: '중앙역과 터미널에서 주요 관광단지를 빠르게 잇는 교통편', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: `${cleanName} 레저 전동바이크 & 자전거 대여`, price: '1시간 약 10,000원', desc: '호수 및 강변 자전거 전용도로를 따라 달리는 힐링 라이딩', img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80' },
                { type: 'transport', name: `${cleanName} 해상/호수 관광 유람선`, price: '대인 약 16,000원', desc: isCoastal ? '바다 절경과 기암괴석을 감상하는 시원한 유람선' : '잔잔한 호수를 가로지르는 청풍 유람선 코스', img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80' },
                // 주요 명소 6선
                { type: 'spot', name: `${cleanName} 대표 자연생태 명소 & 출렁다리`, price: '성인 3,000원~무료', desc: `천혜의 자연 비경과 스릴 넘치는 스카이워크 및 전망대`, img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 역사문화 유적 & 전통마을`, price: '무료입장', desc: '선조들의 숨결이 깃든 고즈넉한 돌담길과 문화재 탐방로', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 대표 테마 식물원 & 수목원`, price: '성인 약 9,000원', desc: '사계절 아름다운 꽃과 푸른 수목들이 가득한 힐링 산책 정원', img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 전통 5일장 & 향토 야시장`, price: '자유 (먹거리 5,000원~)', desc: '지역 명물 먹거리(닭강정, 전병, 막걸리)와 인정 넘치는 시장', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 감성 뷰 카페거리 & 베이커리`, price: '커피 5,500원~', desc: '탁 트인 전망과 시그니처 베이커리를 즐기는 SNS 인기 카페', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80' },
                { type: 'spot', name: `${cleanName} 일출/일몰 파노라마 전망대`, price: '무료입장', desc: `${cleanName}의 산과 물길이 한눈에 펼쳐지는 감동적인 노을 포인트`, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' }
            ];
        }
    }

    // 카드 1개 HTML 템플릿 빌더
    function createSpotCardHTML(spot) {
        const typeBadgeText = typeLabelMap[spot.type] || '추천스팟';
        return `
            <div class="spot-card" data-type="${spot.type}">
                <div class="spot-card-img-wrap">
                    <img src="${spot.img}" alt="${spot.name}" class="spot-card-img" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'">
                    <span class="spot-type-badge ${spot.type}">${typeBadgeText}</span>
                    <span class="spot-price-badge">${spot.price}</span>
                </div>
                <div class="spot-card-body">
                    <div class="spot-card-title" title="${spot.name}">${spot.name}</div>
                    <div class="spot-card-desc" title="${spot.desc}">${spot.desc}</div>
                </div>
            </div>
        `;
    }

    // 필터 탭 클릭 이벤트 리스너 등록
    let currentSpotFilter = 'all';
    spotTabs.forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            spotTabs.forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            currentSpotFilter = tabBtn.getAttribute('data-filter') || 'all';
            applyFilterToCards();
        });
    });

    function applyFilterToCards() {
        const allCards = spotCardsGrid.querySelectorAll('.spot-card');
        allCards.forEach(card => {
            const cardType = card.getAttribute('data-type');
            if (currentSpotFilter === 'all' || cardType === currentSpotFilter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 우측 안내 카드 15선 이상 렌더링 함수
    function renderGuideCard(destName, key = null) {
        if (!destName || !destName.trim()) {
            guidePlaceholder.style.display = 'block';
            guideContentBox.style.display = 'none';
            spotFilterTabs.style.display = 'none';
            facilityTitle.textContent = '선택 여행지 주요 스팟 & 숙소·차량 가이드';
            return;
        }

        const trimmedDest = destName.trim();

        // 1. 매칭 키 확인
        let matchedKey = key;
        if (!matchedKey) {
            const lower = trimmedDest.toLowerCase();
            const found = allDestinationsDB.find(d => 
                lower.includes(d.key) ||
                d.name.toLowerCase().includes(lower) ||
                lower.split(' ')[0].includes(d.key)
            );
            if (found) matchedKey = found.key;
        }

        // 2. 15개 이상의 스팟 목록 가져오기
        let spotsList = [];
        if (matchedKey && curatedSpotsDB[matchedKey]) {
            spotsList = curatedSpotsDB[matchedKey];
        } else {
            spotsList = generateDynamicSpots(trimmedDest, matchedKey);
        }

        // 3. UI 갱신 (15가지 이상 실물 카드 렌더링)
        facilityTitle.textContent = `${trimmedDest} 추천 스팟 & 숙소·차량 (15선)`;
        guidePlaceholder.style.display = 'none';
        guideContentBox.style.display = 'block';
        spotFilterTabs.style.display = 'flex';

        // 필터 '전체'로 초기화
        currentSpotFilter = 'all';
        spotTabs.forEach(btn => {
            if (btn.getAttribute('data-filter') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 15개 카드 렌더링
        spotCardsGrid.innerHTML = spotsList.map(spot => createSpotCardHTML(spot)).join('');

        // 4. 감성 애니메이션 피드백
        guideCard.style.borderColor = '#0284c7';
        guideCard.style.boxShadow = '0 12px 28px -5px rgba(2, 132, 199, 0.22)';
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

    // ==========================================
    // 11. 💸 [이정도면 얼마지?] 예상 경비 산출 & 예산 자동 적용 모달
    // ==========================================
    let calculatedGrandTotal = 0;

    if (calcEstimateBtn) {
        calcEstimateBtn.addEventListener('click', () => {
            const destination = destinationInput.value.trim();
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            if (!destination) {
                showFormError('여행지를 먼저 입력하거나 상단 추천 여행지를 선택해주세요! ✈️');
                destinationInput.focus();
                return;
            }

            if (!startDate || !endDate) {
                showFormError('여행 기간(시작일과 종료일)을 먼저 선택해주세요! 📅');
                startDateInput.focus();
                return;
            }

            hideFormError();

            // 1) 여행 기간(박/일수) 계산
            const startObj = new Date(startDate);
            const endObj = new Date(endDate);
            let diffDays = Math.round((endObj - startObj) / (1000 * 60 * 60 * 24));
            if (diffDays < 1) diffDays = 1;
            const nights = diffDays;
            const days = nights + 1;

            // 2) 인원 및 관계
            const companionCount = parseInt(companionRange.value, 10) || 1;
            const activeRelationBtn = document.querySelector('#relation-btn-group .choice-btn.active');
            const relation = activeRelationBtn ? activeRelationBtn.getAttribute('data-relation') : '동행';

            // 3) 이동수단 및 숙소 스타일
            const activeTransportBtn = document.querySelector('#transport-btn-group .choice-btn.active');
            const transportation = activeTransportBtn ? activeTransportBtn.getAttribute('data-val') : '대중교통';

            const activeLodgingBtn = document.querySelector('#lodging-btn-group .choice-btn.active');
            const accommodation = activeLodgingBtn ? activeLodgingBtn.getAttribute('data-val') : '가성비 호텔';

            // 4) 여행 스타일 및 관심사
            const activeStyleBtn = document.querySelector('#style-choice-group .style-card-btn.active');
            const promptType = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : '알찬 핵심 코스';
            const selectedInterests = getSelectedInterests();

            // 5) 지역 성격 분석 (해외/제주/국내)
            const isEuropeOrUS = /로마|피렌체|프라하|바르셀로나|파리|하와이|시드니|유럽|미국|이탈리아|프랑스|스페인|체코|호주/.test(destination);
            const isJapan = /일본|오사카|교토|후쿠오카|유후인|도쿄|삿포로|나고야/.test(destination);
            const isSoutheastAsia = /다낭|호이안|나트랑|달랏|푸꾸옥|방콕|치앙마이|타이베이|발리|싱가포르|세부|보홀|베트남|태국|대만|필리핀|인도네시아/.test(destination);
            const isOverseas = isEuropeOrUS || isJapan || isSoutheastAsia;
            const isJeju = /제주/.test(destination);

            // 6) 숙박비(stayCost) 계산
            let roomCostPerNight = 90000; // 2인 1실 기본
            if (accommodation === '노숙' || accommodation === '잠을 안 자는 사람') {
                roomCostPerNight = 0;
            } else if (accommodation.includes('게스트하우스') || accommodation.includes('호스텔')) {
                roomCostPerNight = 35000; // 1인당 35,000원
            } else if (accommodation.includes('가성비')) {
                roomCostPerNight = 90000;
            } else if (accommodation.includes('부티크') || accommodation.includes('감성')) {
                roomCostPerNight = 180000;
            } else if (accommodation.includes('고급') || accommodation.includes('호텔/리조트')) {
                roomCostPerNight = 320000;
            } else if (accommodation.includes('독채') || accommodation.includes('풀빌라')) {
                roomCostPerNight = 360000;
            } else if (accommodation.includes('캠핑') || accommodation.includes('글램핑')) {
                roomCostPerNight = 160000;
            } else {
                roomCostPerNight = 110000;
            }

            if (isEuropeOrUS) roomCostPerNight = Math.round(roomCostPerNight * 1.5);
            else if (isJapan) roomCostPerNight = Math.round(roomCostPerNight * 1.15);

            let stayCost = 0;
            if (accommodation === '노숙' || accommodation === '잠을 안 자는 사람') {
                stayCost = 0;
            } else if (accommodation.includes('게스트하우스') || accommodation.includes('호스텔')) {
                stayCost = companionCount * roomCostPerNight * nights;
            } else if (accommodation.includes('독채') || accommodation.includes('풀빌라')) {
                const villasNeeded = Math.max(1, Math.ceil(companionCount / 4));
                stayCost = villasNeeded * roomCostPerNight * nights;
            } else {
                const roomsNeeded = Math.max(1, Math.ceil(companionCount / 2));
                stayCost = roomsNeeded * roomCostPerNight * nights;
            }

            // 7) 교통비(transportCost) 계산
            let transportCost = 0;
            if (isEuropeOrUS) {
                const flightPerPerson = 1200000;
                const localTransportPerPerson = 20000 * days;
                transportCost = companionCount * (flightPerPerson + localTransportPerPerson);
            } else if (isJapan) {
                const flightPerPerson = 320000;
                const localTransportPerPerson = 15000 * days;
                transportCost = companionCount * (flightPerPerson + localTransportPerPerson);
            } else if (isSoutheastAsia) {
                const flightPerPerson = 380000;
                const localTransportPerPerson = 12000 * days;
                transportCost = companionCount * (flightPerPerson + localTransportPerPerson);
            } else if (isJeju) {
                const flightPerPerson = 110000;
                if (transportation.includes('렌터카')) {
                    const carsNeeded = Math.max(1, Math.ceil(companionCount / 4));
                    const carRent = carsNeeded * 55000 * days + (carsNeeded * 25000 * days);
                    transportCost = (companionCount * flightPerPerson) + carRent;
                } else {
                    transportCost = companionCount * (flightPerPerson + 15000 * days);
                }
            } else {
                // 국내 육상 여행
                if (transportation.includes('렌터카')) {
                    const carsNeeded = Math.max(1, Math.ceil(companionCount / 4));
                    transportCost = (carsNeeded * 55000 * days) + (carsNeeded * 30000 * days) + (companionCount * 30000); // 렌트+유류+KTX일부
                } else if (transportation.includes('자차')) {
                    const carsNeeded = Math.max(1, Math.ceil(companionCount / 4));
                    transportCost = carsNeeded * (60000 + 20000 * days); // 유류비 + 통행료
                } else if (transportation.includes('대중교통')) {
                    transportCost = companionCount * (55000 + 8000 * days); // KTX/고속버스 왕복 + 시내교통
                } else if (transportation.includes('도보') || transportation.includes('자전거')) {
                    transportCost = companionCount * (20000 + 5000 * days);
                } else {
                    transportCost = companionCount * (50000 + 10000 * days);
                }
            }

            // 8) 식비(foodCost) 계산
            let foodPerPersonPerDay = 35000; // 1인 1일 3끼 기준
            if (promptType.includes('미식') || promptType.includes('맛집') || selectedInterests.some(i => i.includes('맛집') || i.includes('카페'))) {
                foodPerPersonPerDay = 55000;
            } else if (promptType.includes('가성비') || promptType.includes('알뜰')) {
                foodPerPersonPerDay = 25000;
            } else if (promptType.includes('럭셔리') || promptType.includes('호캉스')) {
                foodPerPersonPerDay = 75000;
            }

            if (isEuropeOrUS) foodPerPersonPerDay = Math.round(foodPerPersonPerDay * 1.5);
            else if (isSoutheastAsia) foodPerPersonPerDay = Math.round(foodPerPersonPerDay * 0.85);

            const foodCost = companionCount * foodPerPersonPerDay * days;

            // 9) 액티비티/투어/입장료(activityCost) 계산
            let activityPerPersonPerDay = 20000;
            if (selectedInterests.some(i => i.includes('테마파크') || i.includes('액티비티') || i.includes('체험') || i.includes('쇼핑'))) {
                activityPerPersonPerDay = 38000;
            } else if (selectedInterests.some(i => i.includes('힐링') || i.includes('자연') || i.includes('산책'))) {
                activityPerPersonPerDay = 12000;
            }
            if (isOverseas) activityPerPersonPerDay = Math.round(activityPerPersonPerDay * 1.3);

            const activityCost = companionCount * activityPerPersonPerDay * days;

            // 10) 총액 합산
            calculatedGrandTotal = stayCost + transportCost + foodCost + activityCost;
            const perPersonCost = Math.round(calculatedGrandTotal / companionCount);

            // 11) 모달 돔 업데이트
            if (receiptDestName) receiptDestName.textContent = destination;
            if (receiptSummaryChips) {
                receiptSummaryChips.innerHTML = `
                    <span class="receipt-chip">✈️ ${destination}</span>
                    <span class="receipt-chip">📅 ${nights}박 ${days}일</span>
                    <span class="receipt-chip">👥 ${companionCount}명 (${relation})</span>
                    <span class="receipt-chip">🚗 ${transportation}</span>
                    <span class="receipt-chip">🏨 ${accommodation}</span>
                    <span class="receipt-chip">✨ ${promptType}</span>
                `;
            }

            if (receiptNightsCount) receiptNightsCount.textContent = `${nights}박 기준`;
            if (receiptPeopleCount) receiptPeopleCount.textContent = `${companionCount}인 기준`;
            if (receiptStayCost) receiptStayCost.textContent = `${stayCost.toLocaleString()}원`;
            if (receiptTransportCost) receiptTransportCost.textContent = `${transportCost.toLocaleString()}원`;
            if (receiptFoodCost) receiptFoodCost.textContent = `${foodCost.toLocaleString()}원`;
            if (receiptActivityCost) receiptActivityCost.textContent = `${activityCost.toLocaleString()}원`;
            if (receiptTotalAmount) receiptTotalAmount.textContent = `${calculatedGrandTotal.toLocaleString()}원`;
            if (receiptPerPerson) receiptPerPerson.textContent = `(1인당 약 ${perPersonCost.toLocaleString()}원)`;

            // 모달 열기
            if (estimateModal) {
                estimateModal.style.display = 'flex';
            }
        });
    }

    // 모달 닫기
    function closeEstimateModal() {
        if (estimateModal) {
            estimateModal.style.display = 'none';
        }
    }

    if (closeEstimateBtn) {
        closeEstimateBtn.addEventListener('click', closeEstimateModal);
    }

    if (estimateModal) {
        estimateModal.addEventListener('click', (e) => {
            if (e.target === estimateModal) {
                closeEstimateModal();
            }
        });
    }

    // 12. [✨ 이 금액으로 예산 자동 적용하기] 클릭 이벤트
    if (applyEstimateBudgetBtn) {
        applyEstimateBudgetBtn.addEventListener('click', () => {
            if (calculatedGrandTotal <= 0) {
                closeEstimateModal();
                return;
            }

            const totalManwon = Math.round(calculatedGrandTotal / 10000);
            const availableBudgets = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300];

            // 가장 차이가 적은 예산 옵션 매핑
            let closest = availableBudgets[0];
            let minDiff = Math.abs(totalManwon - closest);

            for (const val of availableBudgets) {
                const diff = Math.abs(totalManwon - val);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = val;
                }
            }

            const matchedValue = `${closest}만원`;
            if (budgetSelect) {
                budgetSelect.value = matchedValue;
                budgetSelect.focus();
                budgetSelect.style.backgroundColor = '#fef3c7';
                budgetSelect.style.borderColor = '#f59e0b';
                setTimeout(() => {
                    budgetSelect.style.backgroundColor = '#ffffff';
                    budgetSelect.style.borderColor = '#e2e8f0';
                }, 1000);
            }

            closeEstimateModal();
        });
    }

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
