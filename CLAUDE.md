# Sotto — 주간 도시락 메뉴 플래너

## 프로젝트 개요

직장인을 위한 주간 도시락 메뉴 추천 웹앱. 컨셉 태그 선택 → AI 기반 주간 메뉴 추천 → 장보기 목록 자동 생성의 3단계 플로우.

## 기술 스택

- **Framework**: Next.js 15 (App Router) + React 19
- **Runtime**: Bun + TypeScript 5.7
- **Styling**: Tailwind CSS 3.4 + Pretendard 폰트
- **DB**: Supabase (PostgreSQL + RLS)
- **Icons**: Lucide React
- **Test**: Vitest (설정만 됨)
- **Linting**: ESLint 9 (flat config) + Prettier + prettier-plugin-tailwindcss

## 명령어

```bash
bun dev              # 개발 서버
bun run build        # 프로덕션 빌드
bun run lint         # ESLint (eslint src/ — flat config, next lint 아님)
bun run seed         # 식약처 API → Supabase 레시피 적재
bun run parse-ingredients  # raw_ingredients → recipe_ingredients 파싱
bun run classify-tags      # concept_tags 규칙 기반 자동 분류
bun run build-mappings     # 재료→KAMIS/참가격 API 매핑 → ingredient_mappings 테이블
bun run scripts/fetch-prices.ts  # KAMIS + 참가격 일일 가격 수집 → ingredient_prices (GitHub Actions 자동 실행)
```

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃 (Header, max-w-4xl)
│   ├── page.tsx            # 랜딩 (/) — 주간 메뉴 + 가격 트렌드
│   ├── grocery/page.tsx    # 장보기 목록 (/grocery) — Client
│   ├── history/page.tsx    # 지난 메뉴 (/history) — Client
│   ├── recipe/[id]/        # 레시피 상세 (/recipe/:id)
│   │   ├── page.tsx        # Server Component
│   │   ├── ingredients-section.tsx  # 재료 + 가격 — Client
│   │   └── ingredient-prices.tsx    # useIngredientPrices 훅 + PriceTag — Client
│   └── api/
│       ├── recommend/      # POST 주간 메뉴 추천
│       ├── reroll/         # POST 단일 메뉴 재뽑기
│       ├── grocery/        # POST 장보기 목록 생성
│       ├── prices/         # GET 재료 가격 조회 (통합 가격 서비스)
│       ├── weekly-trend/   # GET 주간 가격 트렌드 (DB 기반)
│       └── youtube/        # GET 레시피 YouTube 영상
├── components/
│   ├── layout/header.tsx
│   ├── back-button.tsx
│   └── ui/                 # Button, Badge, Skeleton, Checkbox, FilterSheet
├── lib/
│   ├── constants.ts        # 태그, 카테고리, 라벨, 이모지 상수
│   ├── recommend.ts        # 추천 로직 (shuffle + diversify)
│   ├── grocery.ts          # 장보기 목록 (정규화 + 합산)
│   ├── parse-ingredients.ts
│   ├── supabase/client.ts  # 브라우저용 Supabase
│   ├── supabase/server.ts  # 서버용 Supabase (cookies)
│   ├── price-service.ts    # 통합 가격 서비스 (KAMIS→참가격→네이버→정적사전)
│   ├── kamis.ts            # KAMIS 농수산물 소매가격 API
│   ├── consumer-price.ts   # 참가격(한국소비자원) API
│   ├── naver-shopping.ts   # 네이버 쇼핑 API (폴백)
│   ├── price-dictionary.ts # 정적 가격 사전 (최종 폴백)
│   └── api/youtube.ts      # YouTube Data API v3
├── hooks/
│   ├── use-reduced-motion.ts
│   └── use-online.ts
└── types/
    ├── recipe.ts           # Recipe, RecipeSummary, RecipeStep, RecipeIngredient
    ├── menu.ts             # DayMenu, MealPlan, RecommendRequest
    └── grocery.ts          # GroceryItem, GroceryCategory

scripts/
├── lib/load-env.ts         # 공통 .env.local 로더
├── build-mappings.ts       # 재료→API 매핑 빌드
├── fetch-prices.ts         # KAMIS + 참가격 일일 가격 수집
├── seed-recipes.ts         # 식약처 API 레시피 시드
├── parse-ingredients.ts    # 재료 파싱
├── classify-tags.ts        # 태그 분류
└── estimate-prices.ts      # 정적 가격 추정

.github/workflows/
└── fetch-prices.yml        # 일일 가격 수집 (KST 06:00 크론)
```

## DB 스키마 (Supabase)

5개 테이블, RLS로 anon key는 SELECT만 허용.

- **recipes** — 레시피 본체 (영양정보, concept_tags[], dish_type, is_lunchbox_friendly)
- **recipe_steps** — 조리 단계 (recipe_id FK, step_number)
- **recipe_ingredients** — 파싱된 재료 (name, amount, category, is_optional)
- **ingredient_mappings** — 재료→API 품목코드 매핑 (KAMIS/참가격)
- **ingredient_prices** — 재료별 가격 이력 (source별, 일자별)

핵심 인덱스: `concept_tags` GIN, `is_lunchbox_friendly` partial, `dish_type`

마이그레이션: `supabase/migrations/001_initial_schema.sql`, `004_price_tables.sql`

## 타입 시스템

- `ConceptTag`: `'budget' | 'taste' | 'volume' | 'easy' | 'nutrition'`
- `DishType`: `'rice' | 'side' | 'soup' | 'one_plate' | 'dessert' | 'other'`
- `IngredientCategory`: 12종 (vegetable, meat, seafood, dairy, grain, seasoning, sauce, noodle, tofu, egg, oil, other)
- Path alias: `@/*` → `./src/*`

## API 라우트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/recommend` | POST | `{ tags, days, excludeIds?, recipeIds? }` → `{ menu, fallback }` |
| `/api/reroll` | POST | `{ tags, excludeIds, dishType? }` → `RecipeSummary` |
| `/api/grocery` | POST | `{ recipeIds }` → `{ categories }` |
| `/api/prices` | GET | `?names=양파,당근,간장` → `{ prices }` (KAMIS→참가격→네이버→정적사전 폴백, 1h 캐시) |
| `/api/weekly-trend` | GET | `?recipeIds=id1,id2` → `{ currentTotal, changeAmount, changePercent, direction }` (DB 기반, 1h 캐시) |
| `/api/youtube` | GET | `?recipeId=uuid` → `{ videoId }` |

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=         # 클라이언트/서버 공통
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # 클라이언트 publishable key
SUPABASE_SECRET_KEY=                   # scripts 전용 (쓰기)
FOODSAFETY_API_KEY=               # 식약처 API (seed)
NAVER_CLIENT_ID=                  # 네이버 쇼핑 API (가격 조회)
NAVER_CLIENT_SECRET=              # 네이버 쇼핑 API (가격 조회)
YOUTUBE_API_KEY=                  # YouTube Data API v3
KAMIS_CERT_KEY=                   # KAMIS 농수산물 가격 API 인증키
KAMIS_CERT_ID=                    # KAMIS 농수산물 가격 API 인증 ID
DATA_GO_KR_API_KEY=               # 공공데이터포털 API 키 (참가격)
```

## 디자인 시스템

- **컬러**: `sotto-{50~900}` 웜 브라운 팔레트, `tag-{budget/taste/volume/easy/nutrition}` 태그별 컬러
- **폰트**: Pretendard Variable (CDN)
- **카드 패턴**: `rounded-2xl border-sotto-200 shadow-sm`
- **레이아웃**: `max-w-4xl mx-auto px-4`

## 배포

- **플랫폼**: Vercel (GitHub 자동 배포 연동)
- **URL**: https://sotto-blush.vercel.app
- **main 브랜치 push** → Vercel 프로덕션 자동 배포
- **환경 변수**: Vercel Dashboard에 9개 설정 완료 (`.env.local`과 동일 키셋)
- Vercel 배포 시 `bun run build`가 실행되므로 로컬 빌드 통과 확인 필수

## 워크플로우 규칙

- 작업 완료 시 자동으로 git commit 수행 (별도 요청 불필요)
- main 브랜치 push 시 Vercel 자동 배포 트리거됨 (별도 배포 명령 불필요)

## 코딩 컨벤션

- Server Component 기본, 클라이언트 인터랙션 필요 시 `'use client'`
- Supabase 클라이언트: 브라우저는 `client.ts`, 서버는 `server.ts` 분리
- UI 컴포넌트: `src/components/ui/` — variant + size props, `clsx` + `tailwind-merge`
- 상수: `src/lib/constants.ts`에 모아서 관리
- 타입: `src/types/`에 도메인별 분리 (recipe, menu, grocery)
- 가격 조회: `price-service.ts` 통합 서비스 (KAMIS→참가격→네이버→정적사전 폴백 체인)
- 가격 UI: Server Component 페이지 내 Client Component 경계 분리, `useIngredientPrices` 훅으로 `/api/prices` fetch
- scripts .env: `import './lib/load-env'` side-effect import로 `.env.local` 로딩
- ESLint: flat config (`eslint.config.mjs`) 사용 — `.eslintrc.*` 파일 사용 금지, `next lint` 명령 사용 불가
