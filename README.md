# AI Travel Planner (AI 여행 플래너)

> **Google Gemini AI**와 **Serper 실시간 웹 검색**을 결합하여 여행지, 일정, 예산, 취향에 맞춘 최적의 여행 코스를 설계해 주는 지능형 웹 애플리케이션입니다.

---

## 📌 프로젝트 소개

여행을 계획할 때 수많은 블로그와 SNS를 검색하며 동선을 짜는 번거로움을 해결하기 위해 개발되었습니다.  
사용자가 입력한 조건(여행지, 기간, 예산, 관심사, 동행자, 이동수단, 숙소 취향)을 바탕으로 Google 최신 검색을 통해 핫플레이스를 분석하고, Gemini AI가 실시간 정보를 반영한 완성도 높은 맞춤형 여행 일정표를 생성합니다.

---

## ✨ 핵심 기능

1. **맞춤형 여행 조건 설정 (7가지 입력 항목)**
   - 여행지, 여행 기간, 예산 범위, 관심사/선호 활동, 동행자 유형, 선호 이동수단, 숙소 스타일 지원
2. **AI 플래닝 스타일 선택 (Dual Prompting)**
   - **Prompt A (알찬 표준 코스)**: 주요 랜드마크, 최적의 동선 및 효율적인 시간 배분 중심
   - **Prompt B (현지 로컬 감성 코스)**: 숨은 골목 명소, 현지인 맛집, 여유로운 힐링 체험 중심
3. **Serper API 기반 실시간 Google 웹 검색 연동**
   - 최신 여행 트렌드 및 추천 정보를 실시간으로 검색하여 AI 프롬프트에 자동 주입 (Grounding)
   - 웹 검색 수행 중 화면에 실시간 `[웹 검색중입니다.]` 상태 메시지 스트리밍
4. **안정적인 다중 모델 자동 폴백(Fallback)**
   - 트래픽 과부하(503 에러) 발생 시 `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash` 순으로 자동 재시도
5. **편의 기능**
   - 생성된 마크다운 일정표 원클릭 **클립보드 복사**
   - 오프라인 보관용 **Markdown(.md) 파일 자동 다운로드**
6. **모던 & 미니멀 UI**
   - 에메랄드빛 휴양지 배경과 높은 가독성의 화이트 카드 레이아웃
   - 반응형 디자인(모바일 & 데스크톱 지원)

---

## 🛠️ 기술 스택

| 분류 | 기술 및 라이브러리 |
| :--- | :--- |
| **Backend** | Python 3, Flask 3.0.3, python-dotenv, requests |
| **AI & Search** | Google Gemini API (`google-genai`), Serper API (Google Search) |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+ Vanilla), Marked.js (Markdown 파서) |
| **VCS** | Git, GitHub |

---

## 📂 프로젝트 구조

```text
travel-planner/
├── app.py                  # Flask 백엔드 서버 및 Gemini/Serper API 연동
├── requirements.txt        # 파이썬 의존성 패키지 목록
├── .env.example            # 환경변수 설정 가이드
├── .gitignore              # Git 추적 제외 파일 (.env, venv 등)
├── README.md               # 프로젝트 안내 문서
├── templates/
│   └── index.html          # 메인 웹페이지 템플릿
└── static/
    ├── css/
    │   └── style.css       # 미니멀 & 리조트 테마 스타일시트
    └── js/
        └── app.js          # 실시간 비동기 통신 및 렌더링 스크립트
```

---

## 🚀 시작하기

### 1. 저장소 복제 (Clone)

```bash
git clone https://github.com/ghdnjsch123-cyber/travel-planner.git
cd travel-planner
```

### 2. 가상환경 생성 및 활성화

```powershell
# 가상환경 생성
py -m venv venv

# 가상환경 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### 3. 패키지 설치

```powershell
py -m pip install -r requirements.txt
```

### 4. 환경 변수(.env) 설정

프로젝트 루트에 `.env` 파일을 생성하고 발급받은 API 키를 입력합니다.

```text
GEMINI_API_KEY=your_gemini_api_key_here
SERPER_API_KEY=your_serper_api_key_here
```

- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 발급
- **Serper API Key**: [Serper.dev](https://serper.dev/)에서 무료 발급 (선택 사항)

### 5. 서버 실행

```powershell
py app.py
```

브라우저에서 `http://127.0.0.1:5000`으로 접속하여 서비스를 이용합니다.

---

## 📄 라이선스

This project is licensed under the MIT License.
