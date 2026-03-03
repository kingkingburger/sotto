# Sotto — 주간 도시락 메뉴 플래너

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7+
- **Styling**: Tailwind CSS 3 + Pretendard 폰트
- **Backend**: Supabase (PostgreSQL + RLS)
- **Package Manager**: bun
- **Linting**: ESLint + Prettier (prettier-plugin-tailwindcss)
- **Testing**: Vitest

## 주요 명령어

```bash
bun dev              # 개발 서버
bun run build        # 프로덕션 빌드
bun run lint         # ESLint 검사
bun run seed         # 식약처 API → Supabase 레시피 시드
bun run parse-ingredients  # raw_ingredients → recipe_ingredients 파싱
bun run classify-tags      # concept_tags 자동 분류
```

## 프로젝트 구조

```
src/
├── app/                  # Next.js App Router 페이지 + API routes
│   ├── api/              # POST /recommend, /reroll, /grocery, GET /youtube
│   ├── menu/             # 주간 메뉴 결과 페이지
│   ├── recipe/[id]/      # 레시피 상세 페이지
│   ├── grocery/          # 장보기 목록 페이지
│   └── select/           # 컨셉 태그 선택 페이지
├── components/           # 공유 UI 컴포넌트
├── lib/                  # 비즈니스 로직 (recommend, grocery, parse-ingredients)
│   ├── supabase/         # Supabase 클라이언트 (client.ts, server.ts)
│   └── api/              # 외부 API 래퍼 (youtube.ts)
└── types/                # 타입 정의 (recipe, menu, grocery)
scripts/                  # 시드/분류 스크립트 (SUPABASE_SERVICE_ROLE_KEY 필요)
supabase/migrations/      # DB 스키마 (RLS: SELECT only)
```

## 커밋 규칙

구조적 변경(tidy)과 행동적 변경(feat/fix)을 같은 커밋에 섞지 않는다.

| Prefix | 분류 | 설명 |
|--------|------|------|
| `tidy` | 구조적 | 이름 변경, import 정리, 포매팅 |
| `refactor` | 구조적 | 코드 재구조화 (동작 유지) |
| `feat` | 행동적 | 새 기능 추가 |
| `fix` | 행동적 | 버그 수정 |
| `test` | 행동적 | 테스트 추가/수정 |
| `docs` | 구조적 | 문서 수정 |

## TypeScript 규칙

- `any` 사용 금지 → `unknown` + 타입 가드 사용
- 타입 전용 import는 `import type` 사용
- 파일당 500줄 권장, 800줄 한계
- 에러 메시지는 한국어로 작성 (사용자 대면 메시지)

## 환경 변수

`.env.local` 필요. `.env.local.example` 참고.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 앱 실행 필수
- `SUPABASE_SERVICE_ROLE_KEY` — scripts 전용 (RLS 우회)
- `FOODSAFETY_API_KEY` — seed 스크립트 전용
- `YOUTUBE_API_KEY` — 레시피 영상 검색 (없으면 graceful skip)
