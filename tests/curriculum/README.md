# 공식 성취기준 데이터 검증

앱은 네트워크 조회 없이 index.html의 내장 목록을 사용한다. source.json이 아닌 `sources.json`을 출처의 기준으로 삼는다. 총 1,040개, 중학교 12교과 × 두 개정 교육과정. 선택 교과 전체를 수록한 것은 아니다.

## 평소 검증

`node tests/curriculum.test.cjs`는 목록/출처 개수, 연번, 코드 충돌, 문장 오염, 학교연도, 공유·분리·저장 동작을 검사한다. 실제 UI 이벤트는 `node tests/events.test.cjs`가 검사한다.

## 원문을 바꿀 때

1. sources.json의 고시 게시글/수집 URL에서 원본을 받아 파일명을 유지한다. MOE 원본은 `/private/tmp/curriculum-2015` 또는 `/private/tmp/curriculum-2022`, NCIC 통합본은 `/private/tmp/ncic-source`에 둔다. sources.json SHA-256과 같아야 재현 입력이다.
2. HWP는 로컬 분석 도구 olefile로 `python3 tests/curriculum/hwp_text.py /private/tmp/curriculum-2022`를 실행해 문단 텍스트를 만든다. 앱에는 이 의존성이 없다.
3. Poppler 설치 환경에서 `python3 tests/curriculum/extract.py` 실행. 코드가 묶인 해설을 제외하고 페이지 머리말/쪽번호를 제거한다. `/private/tmp/curriculum-data.json`이 생성되며 index.html은 자동 변경하지 않는다.
4. 추출 결과를 검토한 뒤 `CURRICULUM_DATA`에 반영한다. `python3 tests/curriculum/audit_sources.py`로 원본 해시 및 본문 대조. PDF는 별도 PyMuPDF 추출기로 대조한다. HWP는 원본에서 추출한 문단과 대조한다. 출처 수정 시 기존 작업의 기준 갱신 처리는 통합 수정계획 P0를 따른다.
5. 기존 모델/이벤트/UI/성취기준 검증 후 실제 화면 확인. Hosting 공개 대상은 index.html 하나이며 이 폴더는 배포하지 않는다.

## 2026-10-18 확인

- 개별 원문 20개 해시 확인, 기준 1,040개 본문 대조 통과.
- 해설의 묶음 코드 8개 제외, 페이지 경계의 머리말/쪽번호 혼입 5개 정리. 페이지 경계의 ‘맞게/가꾸기/병렬연결’은 이어지는 원문 확인 후 연결했다.
- PDF 화면 표본: 2015 음악 PDF 18쪽, 2015 역사(2024-1 통합본) PDF 121쪽, 2022 영어(2024-3 통합본) PDF 26쪽, 2015 체육 PDF 35쪽. 모든 원문 페이지를 시각 검수한 것은 아니다.
- HWP/PDF 텍스트 추출은 공백·줄바꿈을 정리하며 해설/학습요소/예시는 선택 목록에 넣지 않는다. 날짜별 최신성을 자동 조회하는 기능은 없다.
