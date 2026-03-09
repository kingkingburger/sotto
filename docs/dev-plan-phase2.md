# Sotto v2 Phase 2 — 개발 계획

> 목표: 정적 가격 사전 → KAMIS + 참가격 실시간 가격 모니터링 전환
> 선행 조건: KAMIS API 키 발급, 공공데이터포털 API 키 발급
> 근거: `docs/research-price-api.md`

---

## 현재 상태 (Phase 1 완료)

| 항목 | 상태 | 파일 |
|------|------|------|
| 정적 가격 사전 (180개) | ✅ | `src/lib/price-dictionary.ts` |
| 가격 추정 스크립트 | ✅ | `scripts/estimate-prices.ts` |
| PriceBadge UI | ✅ | `src/components/ui/price-badge.tsx` |
| 메뉴 카드 가격 | ✅ | `src/app/page.tsx` (confidence ≥ 0.5) |
| 주간 예상 재료비 | ✅ | `src/app/page.tsx` |
| 레시피 상세 가격 | ✅ | `src/app/recipe/[id]/page.tsx` |
| 장보기 가격 요약 | ⚠️ | API 반환 됨, UI 미완성 |
| 재료별 개별 가격 | ❌ | amount만 표시, price 없음 |
| 실시간 API 연동 | ❌ | 미구현 |
| 시계열/트렌드 | ❌ | 미구현 |

---

## 변경 요약

### 신규 추가
| 파일 | 설명 |
|------|------|
| `src/lib/kamis.ts` | KAMIS API 클라이언트 |
| `src/lib/consumer-price.ts` | 참가격 API 클라이언트 |
| `src/lib/price-service.ts` | 통합 가격 조회 서비스 (KAMIS → 참가격 → 정적사전 폴백) |
| `scripts/fetch-prices.ts` | 일일 배치 가격 수집 스크립트 |
| `scripts/build-mappings.ts` | 재료명 → API 품목코드 매핑 생성 |
| `supabase/migrations/004_price_tables.sql` | ingredient_prices + ingredient_mappings 테이블 |
| `src/app/api/prices/route.ts` | GET 재료 가격 조회 API |
| `src/components/ui/price-trend.tsx` | 가격 트렌드 인디케이터 (↑↓→) |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/app/recipe/[id]/page.tsx` | 재료별 개별 가격 표시 |
| `src/app/grocery/page.tsx` | 재료별 가격 + 카테고리 소계 + 총액 |
| `src/app/page.tsx` | 주간 요약에 트렌드 추가 |
| `src/lib/grocery.ts` | 가격 데이터 합산 로직 |
| `src/types/grocery.ts` | GroceryItem에 price 필드 추가 |

### 패키지 추가 없음
기존 의존성으로 충분 (fetch API, Supabase client)

---

## 작업 단계 (순서대로)

### Step 1: DB 스키마 확장

**1.1 마이그레이션 작성** — `supabase/migrations/004_price_tables.sql`

```sql
-- 재료명 → API 품목코드 매핑
CREATE TABLE ingredient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  kamis_item_code TEXT,         -- KAMIS 품목코드
  kamis_kind_code TEXT,         -- KAMIS 품종코드
  consumer_item_code TEXT,      -- 참가격 품목코드
  standard_unit TEXT NOT NULL,  -- '100g', '1개', '100ml'
  standard_quantity NUMERIC,    -- 표준 수량
  category TEXT,                -- vegetable, meat, seasoning 등
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재료별 가격 이력
CREATE TABLE ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('kamis', 'consumer', 'static')),
  price INTEGER NOT NULL,       -- 원 단위 (standard_unit 기준)
  unit TEXT NOT NULL,            -- '100g', '1kg', '1개'
  fetched_at DATE NOT NULL DEFAULT CURRENT_DATE,
  region TEXT DEFAULT '서울',
  grade TEXT,                    -- 상품/중품 등
  metadata JSONB,
  UNIQUE (ingredient_name, source, fetched_at)
);

CREATE INDEX idx_prices_name_date
  ON ingredient_prices (ingredient_name, fetched_at DESC);

CREATE INDEX idx_prices_fetched
  ON ingredient_prices (fetched_at);

-- RLS: anon은 SELECT만
ALTER TABLE ingredient_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_mappings" ON ingredient_mappings
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_prices" ON ingredient_prices
  FOR SELECT TO anon USING (true);
```

**1.2 마이그레이션 적용**
```bash
supabase db push
```

---

### Step 2: KAMIS API 클라이언트

**2.1 `src/lib/kamis.ts`**

```
환경변수:
  KAMIS_CERT_KEY  — 인증 키
  KAMIS_CERT_ID   — 요청자 ID

엔드포인트:
  Base: http://www.kamis.or.kr/service/price/xml.do

함수:
  fetchDailyRetailPrices(itemCode, kindCode, date?)
    → { price, unit, date, grade }
    action=dailySalesList

  fetchPriceTrend(itemCode, kindCode, period: '최근40일'|'최근30일')
    → { prices: { date, price }[] }
    action=periodProductList (신규 API, 최대 1년)

에러 처리:
  - 응답코드 000: 성공
  - 001: 데이터 없음 → null 반환
  - 200: 파라미터 오류 → throw
  - 900: 인증 실패 → throw

타임아웃: 5초
재시도: 1회 (네트워크 에러 시)
```

---

### Step 3: 참가격 API 클라이언트

**3.1 `src/lib/consumer-price.ts`**

```
환경변수:
  DATA_GO_KR_API_KEY  — 공공데이터포털 인증키

엔드포인트:
  공공데이터포털 참가격 API (data.go.kr/data/3043385)

함수:
  fetchConsumerPrice(itemCode)
    → { price, unit, store_type, sale_yn, survey_date }

커버 범위:
  양념류 (간장, 고추장, 된장, 참기름, 식용유 등 21종)
  가공식품 (소시지, 햄, 베이컨, 치즈 등 11종)
  곡물 (쌀, 콩 등 5종)

업데이트 주기: 격주 (금요일)
```

---

### Step 4: 통합 가격 서비스

**4.1 `src/lib/price-service.ts`**

```
폴백 체인:
  1. DB 캐시 조회 (ingredient_prices, 오늘 날짜)
     → 있으면 즉시 반환
  2. KAMIS API 호출 (채소/고기/해산물/계란)
     → 성공 시 DB 저장 + 반환
  3. 참가격 API 호출 (양념/가공식품)
     → 성공 시 DB 저장 + 반환
  4. 정적 가격 사전 폴백 (price-dictionary.ts)
     → source: 'static'으로 표시

함수:
  getIngredientPrice(ingredientName: string)
    → { price, unit, source, confidence, trend? }

  getIngredientPrices(names: string[])
    → Map<string, PriceResult>

  getPriceTrend(ingredientName: string)
    → { current, oneWeekAgo, oneMonthAgo, direction: 'up'|'down'|'stable' }

재료명 매핑 로직:
  1. ingredient_mappings 테이블에서 정확한 매핑 조회
  2. 없으면 유사명 검색 (LIKE '%name%')
  3. 없으면 정적 사전 폴백
```

---

### Step 5: 재료명 매핑 구축

**5.1 `scripts/build-mappings.ts`**

```
1. recipe_ingredients 테이블에서 모든 고유 재료명 조회
2. 기존 price-dictionary.ts의 180개 재료를 시드 데이터로 사용
3. KAMIS 품목코드 수동 매핑 (주요 재료 ~50개)
   - 배추 → item_code: 211, kind_code: 01
   - 돼지고기 → item_code: 411, kind_code: 06
   - 계란 → item_code: 421, kind_code: 01
4. 참가격 품목코드 매핑 (양념류 ~20개)
5. ingredient_mappings 테이블에 INSERT

실행: bun run build-mappings
```

---

### Step 6: 일일 배치 가격 수집

**6.1 `scripts/fetch-prices.ts`**

```
1. ingredient_mappings에서 KAMIS 매핑된 재료 조회
2. KAMIS API로 오늘의 소매가격 일괄 조회
3. ingredient_prices에 UPSERT (ingredient_name + source + fetched_at)
4. 참가격 매핑된 재료도 동일 처리
5. 실행 로그 출력 (성공/실패/스킵 개수)

실행: bun run fetch-prices
스케줄: 매일 06:00 (cron 또는 GitHub Actions)
예상 소요: ~2분 (50~70 API 호출)
```

**6.2 `scripts/update-recipe-prices.ts`** (기존 estimate-prices.ts 대체)

```
1. 모든 레시피의 재료별 최신 가격 조회 (ingredient_prices)
2. 레시피별 총 예상 가격 재계산
3. recipes 테이블 estimated_price, price_confidence 업데이트
4. confidence = (실시간가격재료수 / 전체재료수)

실행: bun run update-recipe-prices (fetch-prices 후 실행)
```

---

### Step 7: 가격 조회 API

**7.1 `src/app/api/prices/route.ts`**

```
GET /api/prices?names=돼지고기,양파,간장

응답:
{
  "prices": {
    "돼지고기": {
      "price": 1850,
      "unit": "100g",
      "source": "kamis",
      "fetchedAt": "2026-03-09",
      "trend": { "direction": "down", "changePercent": -3.2 }
    },
    "양파": { ... },
    "간장": { ... }
  }
}

Zod 검증: names는 콤마 구분 문자열, 최대 50개
캐싱: Cache-Control: public, max-age=3600 (1시간)
```

---

### Step 8: UI 업데이트 — 재료별 가격

**8.1 `src/app/recipe/[id]/page.tsx`**

```
현재: 재료명 + amount만 표시
변경: 재료명 + amount + 가격 + 트렌드

레이아웃:
┌─────────────────────────────────────┐
│ 🥕 당근          2개     ~1,200원 ↓ │
│ 🥩 돼지고기      200g    ~3,700원 → │
│ 🧄 마늘          3쪽       ~300원 ↑ │
│ 🫘 간장          2큰술     ~150원 → │
└─────────────────────────────────────┘

데이터: 페이지 로드 시 /api/prices 호출 (재료명 목록 전달)
서버 컴포넌트이므로 서버에서 직접 price-service 호출 가능
```

**8.2 `src/components/ui/price-trend.tsx`**

```
Props: { direction: 'up'|'down'|'stable', changePercent?: number }

표시:
  up   → ↑ 빨간색 (text-red-500)
  down → ↓ 초록색 (text-green-600)
  stable → → 회색 (text-sotto-400)

선택적으로 변동률 표시: ↑3.2%
```

---

### Step 9: UI 업데이트 — 장보기 목록

**9.1 `src/types/grocery.ts` 확장**

```typescript
export interface GroceryItem {
  name: string;
  totalAmount: string;
  recipes: string[];
  checked: boolean;
  category: IngredientCategory;
  emoji: string;
  price?: number | null;        // 추가
  priceUnit?: string;           // 추가
  priceTrend?: 'up' | 'down' | 'stable';  // 추가
}
```

**9.2 `src/app/grocery/page.tsx`**

```
현재: 체크리스트만
변경: 재료별 가격 + 카테고리 소계 + 총 예상 비용

레이아웃:
┌─────────────────────────────────────┐
│ 총 예상 비용          ~23,400원     │
│ ████████████████░░░░  12/15 완료    │
├─────────────────────────────────────┤
│ 🥬 채소류                  ~8,200원 │
│ ☐ 당근 2개                ~1,200원  │
│ ☐ 양파 3개                ~2,100원  │
│ ...                                 │
├─────────────────────────────────────┤
│ 🥩 육류                   ~12,500원 │
│ ...                                 │
└─────────────────────────────────────┘

데이터: /api/grocery 응답에 가격 포함하도록 수정
```

**9.3 `src/app/api/grocery/route.ts` 수정**

```
변경: generateGroceryList 결과에 가격 데이터 병합
1. 기존 장보기 목록 생성
2. 재료명 목록으로 price-service에서 가격 일괄 조회
3. 각 GroceryItem에 price, priceUnit, priceTrend 추가
4. 카테고리별 소계 계산
5. 총액 계산
```

---

### Step 10: 주간 가격 요약 개선

**10.1 `src/app/page.tsx` 수정**

```
현재:
  "이번 주 예상 재료비 ~32,000원 (4/5개 기준)"

변경:
  "이번 주 예상 재료비 ~32,000원"
  "지난주 대비 ↓1,200원 (-3.6%)"

데이터: recipes.estimated_price 합산 (기존) + 트렌드 (신규)
트렌드 계산: 7일 전 동일 재료 가격 합산과 비교
```

---

## 환경 변수 추가

```bash
KAMIS_CERT_KEY=           # KAMIS API 인증키
KAMIS_CERT_ID=            # KAMIS 요청자 ID
DATA_GO_KR_API_KEY=       # 공공데이터포털 API 키
```

---

## 검증 체크리스트

- [ ] `bun run build-mappings` → ingredient_mappings 50개+ 생성
- [ ] `bun run fetch-prices` → ingredient_prices 50개+ 수집, 에러 0
- [ ] `bun run update-recipe-prices` → recipes.estimated_price 갱신
- [ ] 레시피 상세 → 재료별 가격 + 트렌드 표시
- [ ] 장보기 목록 → 재료별 가격 + 카테고리 소계 + 총액
- [ ] 주간 요약 → 트렌드 (지난주 대비) 표시
- [ ] KAMIS 미매칭 재료 → 참가격 폴백 동작
- [ ] 참가격도 미매칭 → 정적 사전 폴백 동작
- [ ] API 키 미설정 시 → 정적 사전만 사용 (에러 없음)
- [ ] 가격 데이터 없는 재료 → "가격 정보 없음" 표시
- [ ] /api/prices?names=... → 정상 응답 + 1시간 캐시
- [ ] 빌드 성공 (타입 에러 없음)

---

## 예상 파일 변경 목록

```
신규:
  supabase/migrations/004_price_tables.sql
  src/lib/kamis.ts
  src/lib/consumer-price.ts
  src/lib/price-service.ts
  src/app/api/prices/route.ts
  src/components/ui/price-trend.tsx
  scripts/fetch-prices.ts
  scripts/build-mappings.ts
  scripts/update-recipe-prices.ts

수정:
  src/app/recipe/[id]/page.tsx
  src/app/grocery/page.tsx
  src/app/api/grocery/route.ts
  src/app/page.tsx
  src/lib/grocery.ts
  src/types/grocery.ts
  .env.local.example
```

---

## 선행 조건 (사용자 액션 필요)

1. **KAMIS API 키 발급**: https://www.kamis.or.kr → 회원가입 → Open-API 키 신청
2. **공공데이터포털 API 키 발급**: https://www.data.go.kr/data/3043385/openapi.do → 활용 신청
3. `.env.local`에 키 추가
