import os
import sys
import json
import logging
import requests
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
from google import genai

# Windows 콘솔 인코딩 안전 조치
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 1. 환경변수(.env) 로드
load_dotenv()

# 2. 로깅 설정 (Backend Log: 시간, 로그 레벨, 메시지)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
logger = logging.getLogger(__name__)

# 3. Flask 앱 초기화
app = Flask(__name__)

# 4. Gemini API 클라이언트 초기화 함수
def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.")
        return None
    return genai.Client(api_key=api_key)

# 5. Serper API 실시간 웹 검색 함수
def search_web_with_serper(destination, interests, num_results=5):
    serper_api_key = os.environ.get("SERPER_API_KEY")
    if not serper_api_key or "your_serper" in serper_api_key:
        return ""

    query = f"{destination} 여행 추천 코스 맛집 볼거리 {interests}"
    url = "https://google.serper.dev/search"
    headers = {
        'X-API-KEY': serper_api_key,
        'Content-Type': 'application/json'
    }
    payload = {
        'q': query,
        'gl': 'kr',
        'hl': 'ko',
        'num': num_results
    }

    try:
        logger.info(f"Serper API 실시간 웹 검색 요청 전송: {query}")
        response = requests.post(url, headers=headers, json=payload, timeout=8)
        
        if response.status_code == 200:
            search_data = response.json()
            organic_results = search_data.get('organic', [])
            
            if not organic_results:
                logger.info("Serper 검색 결과가 비어 있습니다.")
                return ""
            
            snippets = []
            for item in organic_results[:num_results]:
                title = item.get('title', '')
                snippet = item.get('snippet', '')
                if snippet:
                    snippets.append(f"- [{title}] {snippet}")
            
            logger.info(f"Serper 실시간 웹 검색 완료: {len(snippets)}건 정보 수집 성공")
            return "\n".join(snippets)
        else:
            logger.warning(f"Serper API 응답 오류: 상태코드 {response.status_code}")
            return ""
    except Exception as e:
        logger.warning(f"Serper 웹 검색 중 오류 발생: {str(e)}")
        return ""

# 6. 여행 플래너 프롬프트 생성 헬퍼 함수
def create_travel_prompt(prompt_type, destination, duration, budget, interests, companions, transportation, accommodation, web_search_context=""):
    if prompt_type == 'B':
        planner_role = (
            "당신은 15년 경력의 베테랑 로컬 여행 플래너이자 감성 여행 에세이 작가입니다. "
            "관광객들로 붐비는 뻔한 명소보다는 숨겨진 골목, 현지인 맛집, 여유로운 휴식과 독특한 체험을 중심으로 일정을 기획합니다."
        )
        plan_focus = "숨은 로컬 명소, 여유로운 휴식 및 현지 문화/미식 힐링 체험 중심"
    else:
        planner_role = (
            "당신은 꼼꼼하고 실용적인 프로 여행 컨설턴트입니다. "
            "동선의 효율성, 필수 랜드마크 방문, 대표 맛집, 시간 분배를 최적화하여 실패 없는 알찬 여행 일정을 기획합니다."
        )
        plan_focus = "대표 명소 탐방, 효율적인 이동 동선 및 시간 배분 중심"

    search_injection = ""
    if web_search_context:
        search_injection = f"""
--------------------------------------------------
[실시간 Google 웹 검색 결과 (최신 트렌드 및 추천 정보)]
{web_search_context}
* 위 실시간 웹 검색 결과를 적극 반영하여 최근 인기 있는 명소와 유용한 정보를 일정에 녹여내세요.
--------------------------------------------------
"""

    prompt = f"""
{planner_role}

다음 여행자의 입력 조건을 바탕으로 완성도 높은 맞춤형 [AI 여행 플랜 보고서]를 Markdown 형식으로 작성해주세요.

[여행자 입력 정보]
- 1. 여행지: {destination}
- 2. 여행 기간: {duration}
- 3. 예산: {budget}
- 4. 관심사 및 선호 활동: {interests}
- 5. 동행자: {companions}
- 6. 선호 이동수단: {transportation}
- 7. 숙소 선호 스타일: {accommodation}
- 기획 모드: {plan_focus}
{search_injection}
--------------------------------------------------
[절대 준수 제약사항]
1. 실시간 변동 가능성이 있는 가격(입장료, 숙박비, 음식 가격 등)과 시설 운영시간, 휴무일 등은 실제 확정된 사실처럼 생성하지 말고, 반드시 해당 항목 옆에 `(확인 필요)` 또는 `(방문 전 확인 필요)`라고 명확히 표시하세요.
2. 예산 범위 내에서 무리 없는 합리적인 일정이어야 합니다.
3. 이모티콘을 사용하지 말고 단정하고 전문적인 한국어 Markdown 포맷으로 작성하세요.
--------------------------------------------------

[반드시 포함해야 할 출력 구조]

## 1. 전체 일정 개요
- 여행 테마 및 핵심 컨셉 요약
- 전체 여정 요약 (동선 하이라이트)

## 2. 날짜별 상세 일정 (Day-by-Day)
각 일자(Day 1, Day 2 ...)별로 아래 내용을 작성:
- [오전 / 오후 / 저녁] 방문 장소 및 추천 활동 (동선 순서 고려)
- 끼니별(아침/점심/저녁) 추천 메뉴 및 식당 스타일
- 각 장소별 예상 운영시간 표기 시 필수: `(확인 필요)` 표기

## 3. 예상 비용 (Budget Breakdown)
- 항목별 대략적인 비용 견적 (교통, 숙박, 식비, 관광/체험, 비상금)
- 가격 정보에는 필수적으로 `(확인 필요)` 또는 `(변동 가능/확인 필요)` 표기

## 4. 이동 계획 (Transportation Plan)
- 공항/기차역에서 숙소 및 주요 거점 간 이동 방법
- 선택한 이동수단({transportation})을 활용한 추천 루트 및 팁

## 5. 필수 준비물 (Packing Checklist)
- 의류, 전자기기, 서류/티켓, 비상약 등 카테고리별 체크리스트

## 6. 주의사항 및 여행 팁 (Precautions & Tips)
- 현지 날씨/치안/환전/에티켓 주의사항
- 사전 예약 권장 항목
"""
    return prompt

# 7. 메인 페이지 라우트
@app.route('/')
def index():
    logger.info("메인 페이지('/') 접속 요청 수신")
    return render_template('index.html')

# 7-1. PWA 서비스 워커 및 매니페스트 라우트
from flask import send_from_directory

@app.route('/sw.js')
def service_worker():
    response = send_from_directory('static', 'sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

# 8. 여행 플랜 생성 스트리밍 API 라우트
@app.route('/generate', methods=['POST'])
def generate_travel_plan():
    logger.info(">>> 여행 플랜 생성('/generate') 요청 수신")

    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            'status': 'error',
            'error': '요청 데이터 형식이 올바르지 않습니다. JSON 형식으로 전송해주세요.'
        }), 400

    destination = data.get('destination', '').strip()
    duration = data.get('duration', '').strip()
    budget = data.get('budget', '').strip()
    interests = data.get('interests', '').strip()
    companions = data.get('companions', '').strip()
    transportation = data.get('transportation', '').strip()
    accommodation = data.get('accommodation', '').strip()
    prompt_type = data.get('prompt_type', 'A').strip().upper()

    missing_fields = []
    if not destination: missing_fields.append("여행지")
    if not duration: missing_fields.append("여행 기간")
    if not budget: missing_fields.append("예산")
    if not interests: missing_fields.append("관심사")
    if not companions: missing_fields.append("동행자")
    if not transportation: missing_fields.append("이동수단")
    if not accommodation: missing_fields.append("숙소 선호")

    if missing_fields:
        error_msg = f"다음 필수 입력 항목이 누락되었습니다: {', '.join(missing_fields)}"
        return jsonify({'status': 'error', 'error': error_msg}), 400

    client = get_gemini_client()
    if not client:
        return jsonify({
            'status': 'error',
            'error': '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인해주세요.'
        }), 500

    def generate_event_stream():
        def format_chunk(payload_dict):
            # UTF-8 바이트로 안전하게 인코딩하여 즉시 반환
            return (json.dumps(payload_dict, ensure_ascii=False) + "\n").encode('utf-8')

        try:
            serper_api_key = os.environ.get("SERPER_API_KEY")
            web_search_context = ""
            has_serper = bool(serper_api_key and "your_serper" not in serper_api_key)

            # 1. Serper 검색이 가능한 경우: 클라이언트에 "[웹 검색중입니다.]" 전송
            if has_serper:
                logger.info("클라이언트에 [웹 검색중입니다.] 상태 전송")
                yield format_chunk({
                    'status': 'searching',
                    'title': '[웹 검색중입니다.]',
                    'desc': f"Google에서 '{destination}' 관련 최신 정보를 검색하고 있습니다."
                })
                
                web_search_context = search_web_with_serper(destination, interests)

            # 2. Gemini 일정 생성 단계 알림
            logger.info("클라이언트에 [일정 설계 중] 상태 전송")
            yield format_chunk({
                'status': 'generating',
                'title': '맞춤형 여행 일정을 설계하고 있습니다',
                'desc': '수집된 정보를 바탕으로 동선과 세부 일정을 정리하는 중입니다. (약 5~15초 소요)'
            })

            # 3. 프롬프트 구성
            prompt = create_travel_prompt(
                prompt_type=prompt_type,
                destination=destination,
                duration=duration,
                budget=budget,
                interests=interests,
                companions=companions,
                transportation=transportation,
                accommodation=accommodation,
                web_search_context=web_search_context
            )

            # 4. Gemini 모델 호출 (과부하 대비 자동 폴백 리스트)
            candidate_models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash']
            response = None
            last_err = None

            for model_name in candidate_models:
                try:
                    logger.info(f"Gemini 모델 '{model_name}' 호출 시도 중...")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        logger.info(f"Gemini 모델 '{model_name}' 생성 성공!")
                        break
                except Exception as api_err:
                    last_err = api_err
                    logger.warning(f"모델 '{model_name}' 호출 실패 ({str(api_err)}), 다음 후보 모델로 재시도합니다.")

            if not response or not response.text:
                error_detail = str(last_err) if last_err else '응답 없음'
                yield format_chunk({
                    'status': 'error',
                    'error': f'AI 모델 응답을 생성하지 못했습니다: {error_detail}'
                })
                return

            generated_plan = response.text
            logger.info(f"<<< Gemini 응답 생성 완료 (길이: {len(generated_plan)}자)")

            # 5. 최종 완료 데이터 전송
            yield format_chunk({
                'status': 'done',
                'plan': generated_plan,
                'metadata': {
                    'destination': destination,
                    'duration': duration,
                    'prompt_type': prompt_type,
                    'web_search_enabled': bool(web_search_context)
                }
            })

        except Exception as e:
            logger.exception(f"일정 생성 처리 중 오류 발생: {str(e)}")
            yield format_chunk({
                'status': 'error',
                'error': f'일정 생성 중 오류가 발생했습니다: {str(e)}'
            })

    return Response(stream_with_context(generate_event_stream()), mimetype='application/x-ndjson; charset=utf-8')

# 9. 앱 실행 진입점
if __name__ == '__main__':
    logger.info("Flask 여행 플래너 서버 시작 (http://127.0.0.1:5000)")
    app.run(debug=True, port=5000)
