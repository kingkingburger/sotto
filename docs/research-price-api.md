# 가격 데이터 소스 리서치 결과

> 작성일: 2026-03-09
> 목적: Sotto Phase 2 재료별 실시간 가격 모니터링 구현을 위한 데이터 소스 비교

---

## 1. KAMIS (농수산물유통정보) — ⭐ 추천

**운영**: 한국농수산식품유통공사(aT), 1983년부터 운영
**URL**: https://www.kamis.or.kr/customer/reference/openapi_list.do

### API 개요
- **엔드포인트**: `http://www.kamis.or.kr/service/price/xml.do?action=...`
- **인증**: `p_cert_key` + `p_cert_id` (회원가입 후 인증키 발급)
- **응답 형식**: JSON / XML 선택 (`p_returntype`)
- **호출 제한**: 명시적 제한 미기재 (합리적 사용 권장)
- **비용**: 무료

### 제공 API (총 17개)
1. 일별 부류별/품목별 도소매가격
2. 월별/연도별 도소매가격
3. 친환경농산물 가격정보
4. 최근일자 도소매가격 (상품 기준)
5. 최근 가격추이 조회
6. 월평균/연평균 가격추이
7. 지역별 도소매가격
8. **신규 일별 품목별 도매/소매 가격자료** (기간설정 가능, 최대 1년)

### 품목 커버리지
| 카테고리 | 품목 예시 | 도시락 재료 관련성 |
|---------|----------|----------------|
| 채소 | 배추, 양배추, 브로콜리, 시금치, 상추 | ⭐⭐⭐ 높음 |
| 과일 | 사과, 배, 포도, 감귤 | ⭐ 낮음 |
| 축산 | 소고기(등심/안심/갈비), 돼지고기, 닭, 계란 | ⭐⭐⭐ 높음 |
| 수산 | 고등어, 갈치, 오징어, 굴 | ⭐⭐ 중간 |

### 시계열 데이터
- ✅ 당일 / 1일전 / 1개월전 / 1년전 비교 데이터
- ✅ 신규 API로 최대 1년 기간 설정 조회
- ✅ 가격 트렌드 분석 가능

### 도시락 재료 커버리지: **~60%**
- ✅ 채소, 고기, 해산물, 계란 커버
- ❌ 양념류(간장, 고추장 등) 미포함
- ❌ 가공식품(소시지, 햄 등) 미포함
- ❌ 두부, 면류 미포함

### 장점
- 공공 API, 무료, 법적 리스크 없음
- 안정적 운영 (40년+ 역사)
- 도소매 가격 모두 제공
- 시계열 데이터 → 가격 트렌드 가능

### 단점
- 가공식품/양념류 미포함
- 소매가격이 실제 마트 가격과 차이 가능

---

## 2. 한국소비자원 참가격 API — ⭐ 보완용 추천

**운영**: 한국소비자원
**URL**: https://www.data.go.kr/data/3043385/openapi.do
**참가격 포털**: https://www.price.go.kr

### API 개요
- **제공 경로**: 공공데이터포털(data.go.kr)에서 API 키 발급
- **조사 주기**: 격주 (주 1회 금요일 수집)
- **조사 범위**: 전국 500여 개 판매점 (대형마트, SSM, 백화점, 편의점, 전통시장)
- **비용**: 무료

### 품목 커버리지: **168개 품목 (604개 상품)**
| 카테고리 | 품목 수 | 예시 |
|---------|---------|------|
| 채소류 | 18 | 감자, 당근, 대파, 마늘, 무, 배추, 상추, 시금치, 양배추, 양파, 오이, 콩나물, 호박 |
| 축산물 | 4 | 계란, 닭고기, 돼지고기, 쇠고기 |
| 양념·소스류 | 21 | 간장, 고추장, 된장, 설탕, 소금, 식용유, 식초, 참기름, 케첩, 마요네즈 |
| 축산가공품 | 11 | 소시지, 햄, 베이컨, 치즈, 우유, 버터 |
| 곡물 | 5 | 쌀(백미), 쌀(현미), 콩 |
| 수산가공품 | - | 참치캔, 어묵 등 |

### 도시락 재료 커버리지: **~75%**
- ✅ 채소, 고기, 계란, 양념류 모두 커버
- ✅ 가공식품(소시지, 햄, 어묵) 포함
- ✅ 실제 마트 판매가격 기반
- ❌ 두부 미확인
- ❌ 시계열 데이터 제한적 (격주 스냅샷)

### 장점
- KAMIS보다 넓은 커버리지 (양념류, 가공식품 포함)
- 실제 소매 판매가격 (마트 가격과 근접)
- 지역별 최저가/최고가/평균 제공
- 세일 여부 정보 포함

### 단점
- 격주 업데이트 (실시간 아님)
- 시계열/트렌드 데이터 부족
- API 안정성 확인 필요

---

## 3. 네이버 쇼핑 API — 보조 참고

**URL**: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md

### API 개요
- **엔드포인트**: `https://openapi.naver.com/v1/search/shop.json`
- **인증**: 네이버 개발자센터에서 Client ID/Secret 발급
- **호출 제한**: 일 25,000회
- **비용**: 무료

### 특성
- 검색 기반 → 식재료 검색 시 정확도 이슈 (상품명 매칭 어려움)
- 최저가 중심 (실제 구매가와 차이)
- 시계열 데이터 없음
- 식재료 전용이 아님

### 도시락 재료 커버리지: **측정 불가**
- 검색 정확도에 의존 (예: "돼지고기" 검색 → 삼겹살, 목살 등 다양한 결과)
- 단위/규격 표준화 어려움

### 장점
- 실제 온라인 판매가
- 넓은 상품 범위

### 단점
- 식재료 특화 아님, 검색 매칭 불안정
- 시계열 없음
- 가격 표준화 어려움 (100g vs 1kg vs 1팩)

---

## 4. 기타 대안

### 쿠팡/마켓컬리 스크래핑
- ❌ **법적 리스크**: robots.txt 위반, 이용약관 위반 가능
- ❌ 차단 가능성 높음
- ❌ 유지보수 비용 높음 (HTML 구조 변경 시 깨짐)
- **결론: 사용 불가**

### 농림축산식품부 데이터 포털 (data.mafra.go.kr)
- KAMIS와 유사한 데이터
- 중복 가능성 높음, 추가 조사 시 검토

---

## 5. 최종 추천: KAMIS + 참가격 하이브리드

### 전략

```
┌─────────────────────────────────────────┐
│         재료 가격 조회 요청               │
│                                          │
│  1차: KAMIS API (일별 소매가격)           │
│  ├── 채소, 고기, 해산물, 계란 → 매칭     │
│  └── 매칭 실패 or 양념/가공식품           │
│                                          │
│  2차: 참가격 API (격주 판매가격)          │
│  ├── 양념류, 가공식품 → 매칭             │
│  └── KAMIS 미커버 품목 보완              │
│                                          │
│  3차: 폴백 — 정적 가격 사전              │
│  └── 두 API 모두 매칭 실패 시            │
└─────────────────────────────────────────┘
```

### 예상 커버리지
| 소스 | 커버 범위 | 업데이트 주기 |
|------|----------|-------------|
| KAMIS | 채소, 고기, 해산물, 계란 (~60%) | 일별 |
| 참가격 | 양념, 가공식품, 곡물 추가 (~15%) | 격주 |
| 정적 사전 | 나머지 (~25%) | 수동 |
| **합산** | **~100%** | **혼합** |

### 구현 우선순위
1. **KAMIS API 연동** — 핵심 재료 커버, 일별 업데이트, 시계열 가능
2. **재료명 → 품목코드 매핑 테이블** — recipe_ingredients.name → KAMIS item_code
3. **일 1회 배치 수집** → Supabase `ingredient_prices` 테이블 저장
4. **참가격 API 연동** — KAMIS 미커버 품목 보완
5. **가격 트렌드 UI** — 1개월/1년 전 대비 변동 표시

### 필요한 DB 스키마 확장
```sql
-- 재료별 가격 이력
CREATE TABLE ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  source TEXT NOT NULL, -- 'kamis' | 'consumer' | 'static'
  price INTEGER NOT NULL, -- 원 단위
  unit TEXT NOT NULL, -- '100g', '1kg', '1개', '1L'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB -- 도매/소매, 지역, 등급 등
);

CREATE INDEX idx_ingredient_prices_name ON ingredient_prices (ingredient_name, fetched_at DESC);

-- 재료명 → API 품목코드 매핑
CREATE TABLE ingredient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  kamis_item_code TEXT,
  kamis_kind_code TEXT,
  consumer_item_code TEXT,
  standard_unit TEXT, -- 표준화된 단위
  category TEXT -- vegetable, meat, seasoning 등
);
```

---

## Sources
- [KAMIS Open-API 이용안내](https://www.kamis.or.kr/customer/reference/openapi_list.do)
- [KAMIS API 실시간 농산물 가격 조회 (makeai.kr)](https://makeai.kr/kamis-api-%EC%8B%A4%EC%8B%9C%EA%B0%84-%EB%86%8D%EC%82%B0%EB%AC%BC-%EA%B0%80%EA%B2%A9-%EC%A1%B0%ED%9A%8C/)
- [한국소비자원 생필품 가격 정보 (data.go.kr)](https://www.data.go.kr/data/3043385/openapi.do)
- [참가격 포털](https://www.price.go.kr/tprice/portal/pricenewsandtpriceintro/tpriceintro/getPriceIntro.do)
- [네이버 오픈 API 목록](https://naver.github.io/naver-openapi-guide/apilist.html)
