# Phase 2 나머지 — 상세 실행 계획 (Ralph용)

> 작성일: 2026-03-11
> 상태: 확정
> 선행조건: DB 마이그레이션 완료 (ingredient_mappings, ingredient_prices 테이블)

---

## 목표

1. 재료→API 품목코드 매핑 구축 (Step 5)
2. 일일 배치 가격 수집 + GitHub Actions 자동화 (Step 6)
3. 메인 페이지 주간 가격 트렌드 표시 (Step 10)

---

## Step 5: 재료명 매핑 스크립트

### 5.1 `scripts/build-mappings.ts` 작성

**역할**: recipe_ingredients에서 고유 재료명 추출 → KAMIS/참가격 매핑 → ingredient_mappings 테이블에 UPSERT

**로직**:
1. `recipe_ingredients` 테이블에서 `SELECT DISTINCT name` 조회
2. 각 재료명에 대해:
   - `src/lib/price-service.ts`의 `KAMIS_INGREDIENT_MAP`에서 매칭 → kamis_item_code, kamis_kind_code, kamis_category_code 설정
   - `CONSUMER_KEYWORD_MAP`에서 매칭 → consumer_search_keyword 설정
   - `src/lib/parse-ingredients.ts`의 카테고리 분류 활용 → category 설정
   - standard_unit은 카테고리별 기본값 (meat: '100g', vegetable: '1개', seasoning: '1개')
3. `ingredient_mappings` 테이블에 UPSERT (ON CONFLICT ingredient_name)
4. 매핑 통계 출력: KAMIS 매핑 N개, 참가격 매핑 N개, 미매핑 N개

**실행**: `bun run scripts/build-mappings.ts`

**검증**:
- `ingredient_mappings` 테이블에 50개+ 행 존재
- KAMIS 매핑된 재료 30개+
- 참가격 매핑된 재료 20개+

### 5.2 매핑 데이터 소스

KAMIS_INGREDIENT_MAP과 CONSUMER_KEYWORD_MAP은 현재 `src/lib/price-service.ts`에 하드코딩.
build-mappings.ts는 이 두 맵을 import하여 DB에 시딩.
향후 DB가 source of truth가 되면 price-service에서 DB 조회로 전환.

---

## Step 6: 일일 배치 가격 수집

### 6.1 `scripts/fetch-prices.ts` 작성

**역할**: KAMIS + 참가격 API로 오늘의 가격을 수집하여 ingredient_prices에 저장

**로직**:
1. `ingredient_mappings`에서 kamis 매핑된 재료 조회 (kamis_item_code IS NOT NULL)
2. KAMIS API로 카테고리별 일일 가격 일괄 조회 (`fetchAllDailyPrices()`)
3. 각 매핑된 재료에 대해 KAMIS 결과에서 가격 추출
4. ingredient_prices에 UPSERT (ingredient_name + source + fetched_at)
5. `ingredient_mappings`에서 참가격 매핑된 재료 조회 (consumer_search_keyword IS NOT NULL)
6. 참가격 API로 각 재료 가격 조회 (`getConsumerMedianPrice()`)
7. ingredient_prices에 UPSERT
8. 실행 로그 출력: KAMIS 성공/실패, 참가격 성공/실패, 총 저장 건수

**실행**: `bun run scripts/fetch-prices.ts`
**예상 소요**: ~2분 (KAMIS 6 카테고리 + 참가격 20~30 재료)

**검증**:
- ingredient_prices에 오늘 날짜 행 40개+
- source별 분포: kamis 30+, consumer 15+
- 에러 0

### 6.2 GitHub Actions 워크플로우 — `.github/workflows/fetch-prices.yml`

```yaml
name: Daily Price Fetch
on:
  schedule:
    - cron: '0 21 * * *'  # UTC 21:00 = KST 06:00
  workflow_dispatch: {}     # 수동 실행

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run scripts/fetch-prices.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
          KAMIS_CERT_KEY: ${{ secrets.KAMIS_CERT_KEY }}
          KAMIS_CERT_ID: ${{ secrets.KAMIS_CERT_ID }}
          DATA_GO_KR_API_KEY: ${{ secrets.DATA_GO_KR_API_KEY }}
```

**필요한 GitHub Secrets**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `KAMIS_CERT_KEY`
- `KAMIS_CERT_ID`
- `DATA_GO_KR_API_KEY`

**검증**:
- `workflow_dispatch`로 수동 실행하여 Actions 로그 확인
- DB에 가격 데이터 저장됨

---

## Step 10: 주간 가격 트렌드 UI

### 10.1 `/api/prices` 라우트에 트렌드 데이터 강화

현재 KAMIS 데이터에서 이미 trend를 계산하고 있음 (1주전 vs 현재).
추가 작업: DB에 이력이 쌓이면, 7일 전 ingredient_prices 조회하여 트렌드 계산.

**price-service.ts 수정**:
- `getIngredientPrice()` 내부에서 DB 이력 조회 옵션 추가
- KAMIS trend가 없는 재료는 DB 이력 기반 trend 계산
- 함수: `calcDbTrend(name, supabase)` — 오늘 vs 7일전 가격 비교

### 10.2 `src/app/page.tsx` 주간 요약 섹션 개선

현재: "이번 주 예상 재료비 ~32,000원 (4/5개 기준)"
변경: "이번 주 예상 재료비 ~32,000원" + "지난주 대비 ↓1,200원 (-3.6%)" (DB 이력 있을 때)

**로직**:
1. 현재 메뉴의 recipe_ids로 `/api/grocery` 호출 → 재료 목록 추출
2. `/api/prices`로 현재 가격 조회 → 합산
3. 7일 전 가격 합산과 비교 → 변동률 계산
4. 트렌드 인디케이터 표시 (↑빨강/↓초록/→회색)

**대안 (간단 버전)**:
- 개별 재료 트렌드 합산 대신, KAMIS에서 이미 제공하는 1주전 가격 활용
- DB 이력 없이도 KAMIS weekAgoPrice로 트렌드 계산 가능
- 이 방식이면 Step 10은 API 응답의 trend 필드만 활용하면 됨

### 10.3 주간 트렌드 API — `/api/weekly-trend`

새 API 엔드포인트:
```
GET /api/weekly-trend?recipeIds=id1,id2,id3
→ {
    currentTotal: 32000,
    weekAgoTotal: 33200,
    changeAmount: -1200,
    changePercent: -3.6,
    direction: 'down',
    pricedCount: 4,
    totalCount: 5
  }
```

**로직**:
1. recipeIds로 recipe_ingredients 조회 → 고유 재료명 추출
2. 각 재료의 현재 가격 + 1주전 가격 조회 (price-service)
3. 합산하여 변동 계산

**검증**:
- `/api/weekly-trend?recipeIds=...` 호출 시 정상 응답
- changePercent가 합리적 범위 (-20% ~ +20%)
- 메인 페이지에 트렌드 표시

---

## 실행 순서

```
1. [DB] 마이그레이션 SQL 실행 (사용자)
2. [Step 5] build-mappings.ts 작성 + 실행
3. [Step 6] fetch-prices.ts 작성 + 실행 + 검증
4. [Step 6] GitHub Actions 워크플로우 작성
5. [Step 10] /api/weekly-trend 엔드포인트 작성
6. [Step 10] page.tsx 주간 트렌드 UI 업데이트
7. [검증] 전체 플로우 확인
8. [커밋] 일괄 커밋
```

---

## 변경 파일 목록

```
신규:
  scripts/build-mappings.ts
  scripts/fetch-prices.ts
  .github/workflows/fetch-prices.yml
  src/app/api/weekly-trend/route.ts

수정:
  src/lib/price-service.ts (DB 트렌드 조회 추가)
  src/app/page.tsx (주간 트렌드 표시)
```

## 리스크

- KAMIS 축산물 카테고리 타임아웃 (15s로 증가했지만 간헐적 발생 가능)
  → fetch-prices에서 카테고리별 재시도 + 실패 시 스킵 로직
- 참가격 API 월 1회 업데이트 → 동일 데이터 반복 저장될 수 있음
  → UPSERT로 중복 방지
- GitHub Actions 무료 플랜 제한 (월 2000분)
  → 매일 ~2분 × 30일 = ~60분, 충분
