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
- **Linting**: ESLint + Prettier + prettier-plugin-tailwindcss

## 명령어

```bash
bun dev              # 개발 서버
bun run build        # 프로덕션 빌드
bun run lint         # ESLint
bun run seed         # 식약처 API → Supabase 레시피 적재
bun run parse-ingredients  # raw_ingredients → recipe_ingredients 파싱
bun run classify-tags      # concept_tags 규칙 기반 자동 분류
```

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃 (Header, max-w-4xl)
│   ├── page.tsx            # 랜딩 (/)
│   ├── select/page.tsx     # 태그/기간 선택 (/select) — Client
│   ├── menu/page.tsx       # 주간 메뉴 그리드 (/menu) — Client
│   ├── grocery/page.tsx    # 장보기 목록 (/grocery) — Client
│   ├── recipe/[id]/        # 레시피 상세 (/recipe/:id) — Server
│   └── api/
│       ├── recommend/      # POST 주간 메뉴 추천
│       ├── reroll/         # POST 단일 메뉴 재뽑기
│       ├── grocery/        # POST 장보기 목록 생성
│       └── youtube/        # GET 레시피 YouTube 영상
├── components/
│   ├── layout/header.tsx
│   ├── back-button.tsx
│   └── ui/                 # Button, Badge, Skeleton, Checkbox
├── lib/
│   ├── constants.ts        # 태그, 카테고리, 라벨 상수
│   ├── recommend.ts        # 추천 로직 (shuffle + diversify)
│   ├── grocery.ts          # 장보기 목록 (정규화 + 합산)
│   ├── parse-ingredients.ts
│   ├── supabase/client.ts  # 브라우저용 Supabase
│   ├── supabase/server.ts  # 서버용 Supabase (cookies)
│   └── api/youtube.ts      # YouTube Data API v3
└── types/
    ├── recipe.ts           # Recipe, RecipeSummary, RecipeStep, RecipeIngredient
    ├── menu.ts             # DayMenu, MealPlan, RecommendRequest
    └── grocery.ts          # GroceryItem, GroceryCategory
```

## DB 스키마 (Supabase)

3개 테이블, RLS로 anon key는 SELECT만 허용.

- **recipes** — 레시피 본체 (영양정보, concept_tags[], dish_type, is_lunchbox_friendly)
- **recipe_steps** — 조리 단계 (recipe_id FK, step_number)
- **recipe_ingredients** — 파싱된 재료 (name, amount, category, is_optional)

핵심 인덱스: `concept_tags` GIN, `is_lunchbox_friendly` partial, `dish_type`

마이그레이션: `supabase/migrations/001_initial_schema.sql`

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
| `/api/youtube` | GET | `?recipeId=uuid` → `{ videoId }` |

## 환경 변수

```bash
NEXT_PUBLIC_SUPABASE_URL=         # 클라이언트/서버 공통
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # 클라이언트 publishable key
SUPABASE_SECRET_KEY=                   # scripts 전용 (쓰기)
FOODSAFETY_API_KEY=               # 식약처 API (seed)
YOUTUBE_API_KEY=                  # YouTube Data API v3
```

## 디자인 시스템

- **컬러**: `sotto-{50~900}` 웜 브라운 팔레트, `tag-{budget/taste/volume/easy/nutrition}` 태그별 컬러
- **폰트**: Pretendard Variable (CDN)
- **카드 패턴**: `rounded-2xl border-sotto-200 shadow-sm`
- **레이아웃**: `max-w-4xl mx-auto px-4`

## 워크플로우 규칙

- 작업 완료 시 자동으로 git commit 수행 (별도 요청 불필요)

## 코딩 컨벤션

- Server Component 기본, 클라이언트 인터랙션 필요 시 `'use client'`
- Supabase 클라이언트: 브라우저는 `client.ts`, 서버는 `server.ts` 분리
- UI 컴포넌트: `src/components/ui/` — variant + size props, `clsx` + `tailwind-merge`
- 상수: `src/lib/constants.ts`에 모아서 관리
- 타입: `src/types/`에 도메인별 분리 (recipe, menu, grocery)
