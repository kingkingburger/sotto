# Sotto — 2026-03-12 리팩토링 세션 검증 시나리오

> 작성일: 2026-03-12
> 대상: 리팩토링 + 신규 기능 (Grocery 트렌드, PriceTag 추출, API 유틸, useFetch 훅)
> 환경: localhost:3000 (bun dev), Playwright MCP + curl

---

## 테스트 전제조건

- `bun dev` 실행 상태, localhost:3000 접근 가능
- Supabase 연결 정상
- DB에 레시피 5개 이상 존재
- `.env.local` 환경 변수 설정 완료

---

## 1. API 회귀 시나리오 (curl)

### API-01. POST /api/recommend — parseRequestBody 리팩토링 회귀

**변경사항**: `parseRequestBody` 헬퍼로 JSON 파싱+Zod 검증 교체

**스텝**
1. 정상 요청: `curl -X POST http://localhost:3000/api/recommend -H "Content-Type: application/json" -d '{"tags":[],"days":5}'`
2. 응답 200 + `menu` 배열 5개 확인
3. 잘못된 JSON: `curl -X POST http://localhost:3000/api/recommend -H "Content-Type: application/json" -d 'invalid'`
4. 응답 400 + `error: "Invalid JSON body"` 확인
5. 스키마 불일치: `curl -X POST http://localhost:3000/api/recommend -H "Content-Type: application/json" -d '{"tags":"wrong"}'`
6. 응답 400 + Zod 에러 메시지 확인

**기대 결과**
- 기존과 동일한 200/400 응답 패턴
- 에러 메시지 형식 유지

**심각도**: Critical

---

### API-02. POST /api/grocery — parseRequestBody 리팩토링 회귀

**변경사항**: 동일 리팩토링

**스텝**
1. 정상 요청: `curl -X POST http://localhost:3000/api/grocery -H "Content-Type: application/json" -d '{"recipeIds":["임의-유효-UUID"]}'`
2. 응답 200 + `categories` 배열 확인
3. 빈 배열: `curl -X POST http://localhost:3000/api/grocery -H "Content-Type: application/json" -d '{"recipeIds":[]}'`
4. 응답 확인 (빈 categories 또는 400)

**기대 결과**
- 기존과 동일한 응답 구조

**심각도**: Critical

---

### API-03. POST /api/reroll — parseRequestBody 리팩토링 회귀

**변경사항**: 동일 리팩토링

**스텝**
1. 정상 요청: `curl -X POST http://localhost:3000/api/reroll -H "Content-Type: application/json" -d '{"tags":[],"excludeIds":[]}'`
2. 응답 200 + RecipeSummary 객체 확인
3. 잘못된 body: `curl -X POST http://localhost:3000/api/reroll -H "Content-Type: application/json" -d '{}'`
4. 응답 400 + 에러 메시지 확인

**기대 결과**
- 기존과 동일한 응답 구조

**심각도**: Critical

---

### API-04. GET /api/prices — PriceResult 타입 통합 회귀

**변경사항**: 인라인 타입 → `@/types/price` import 교체

**스텝**
1. `curl "http://localhost:3000/api/prices?names=양파,당근,간장"`
2. 응답 200 확인
3. 각 재료에 `price`, `unit`, `source`, `trend` 필드 존재 확인
4. Cache-Control 헤더 `s-maxage=3600` 확인
5. 빈 names: `curl "http://localhost:3000/api/prices?names="`
6. 응답 확인

**기대 결과**
- 기존과 동일한 응답 JSON 구조
- trend 필드: `"up"` | `"down"` | `"stable"` | `null`

**심각도**: Critical

---

## 2. 웹 UI 회귀 시나리오 (Playwright)

### WEB-01. 레시피 상세 — PriceTag 추출 회귀

**변경사항**: `ingredient-prices.tsx` 로컬 PriceTag → `components/ui/price-tag.tsx` 공용 컴포넌트

**스텝**
1. localhost:3000 접속
2. 메뉴 추천 받기 → 첫 번째 카드 클릭 → /recipe/[id]
3. 재료 섹션 스크롤
4. 재료 이름 옆에 가격 표시 확인 (예: "1,200원/100g")
5. 트렌드 아이콘 표시 확인 (↑빨강/↓초록/→회색)
6. 가격 로딩 중 스켈레톤 표시 확인

**기대 결과**
- PriceTag 추출 전과 동일한 UI
- 가격+트렌드 정상 표시
- 에러 없음

**심각도**: Critical

---

### WEB-02. 레시피 상세 — YouTube 영상 (useFetch 훅 회귀)

**변경사항**: `youtube-section.tsx` 수동 AbortController → `useFetch` 훅

**스텝**
1. 레시피 상세 페이지 접속
2. 페이지 하단 YouTube 영상 섹션 확인
3. 영상 임베드 또는 "관련 영상" 링크 표시 확인
4. 다른 레시피로 이동 → YouTube 영상 변경 확인

**기대 결과**
- YouTube 영상 정상 로드
- 페이지 전환 시 이전 fetch abort (콘솔 에러 없음)

**심각도**: High

---

## 3. 신규 기능 시나리오 (Playwright)

### NEW-01. 장보기 페이지 — 아이템별 가격 트렌드

**변경사항**: Grocery 페이지에 PriceTag 적용

**스텝**
1. 메뉴 추천 → "메뉴 확정하기" → /grocery 이동
2. 장보기 목록 로드 완료 대기
3. 각 재료 항목 옆에 가격 표시 확인
4. 트렌드 아이콘 (↑/↓) 확인
5. 가격 없는 재료는 가격 미표시 확인

**기대 결과**
- 각 재료에 PriceTag 컴포넌트 렌더링
- 가격 데이터가 있는 항목만 가격 표시
- 트렌드 방향 아이콘 정상

**심각도**: High

---

### NEW-02. 장보기 페이지 — 카테고리 소계 트렌드

**변경사항**: 카테고리별 소계 옆 트렌드 방향 표시

**스텝**
1. /grocery 페이지에서 카테고리 헤더 확인
2. 각 카테고리 소계 금액 옆에 트렌드 아이콘 확인
3. 트렌드 방향이 카테고리 내 아이템 다수결과 일치하는지 확인

**기대 결과**
- 카테고리 소계 옆 ↑/↓ 방향 표시
- 다수결 기반 방향 결정

**심각도**: Medium

---

### NEW-03. 장보기 페이지 — 전체 합계 트렌드

**변경사항**: 전체 합계 옆 트렌드 요약 뱃지

**스텝**
1. /grocery 페이지 최상단 또는 하단에서 전체 합계 확인
2. 합계 금액 옆에 "상승세"/"하락세" 뱃지 확인
3. 전체 아이템 트렌드 종합과 일치 확인

**기대 결과**
- 전체 합계에 트렌드 뱃지 표시
- 방향과 색상 일치 (상승=빨강, 하락=초록)

**심각도**: Medium

---

## 4. 통합 시나리오

### INT-01. 메인 → 레시피 → 장보기 풀 플로우

**목적**: 리팩토링 후 전체 플로우 정상 동작 확인

**스텝**
1. localhost:3000 접속
2. "바로 추천받기" 클릭 → /menu
3. 5개 메뉴 카드 로드 확인
4. 주간 가격 트렌드 배너 표시 확인
5. 첫 번째 카드 클릭 → /recipe/[id]
6. 재료 가격 + 트렌드 표시 확인
7. YouTube 영상 로드 확인
8. 뒤로가기 → /menu
9. "메뉴 확정하기" → /grocery
10. 재료별 가격 + 트렌드 표시 확인
11. 카테고리 소계 + 트렌드 확인
12. 전체 합계 + 트렌드 뱃지 확인
13. 체크박스 체크 → 진행률 바 증가 확인
14. 콘솔 에러 0개 확인

**기대 결과**
- 전체 플로우 에러 없이 완료
- 모든 가격/트렌드 UI 정상
- 콘솔 에러 없음

**심각도**: Critical

---

## 우선순위

| 순서 | 시나리오 | 타입 | 심각도 |
|------|---------|------|--------|
| 1 | API-01~04 | curl | Critical |
| 2 | INT-01 | Playwright | Critical |
| 3 | WEB-01 | Playwright | Critical |
| 4 | NEW-01 | Playwright | High |
| 5 | WEB-02 | Playwright | High |
| 6 | NEW-02~03 | Playwright | Medium |
