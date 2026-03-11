# 코드 정리 + 배포 준비 디자인

> 작성일: 2026-03-09
> 상태: 확정

---

## 목표

Phase 1 완료된 코드의 중복 제거, 일관성 확보, Vercel 배포 준비.

---

## 1. CATEGORY_EMOJI 중복 제거

**문제**: 동일한 이모지 맵이 2곳에 정의됨
- `src/app/grocery/page.tsx` → `CATEGORY_EMOJI`
- `src/app/recipe/[id]/ingredients-section.tsx` → `INGREDIENT_EMOJI`

**해결**: `src/lib/constants.ts`에 `CATEGORY_EMOJI` 추가, 두 파일에서 import.

---

## 2. scripts .env 로딩 통합

**문제**: 5개 스크립트에 동일한 .env 파싱 코드 (각 ~15줄) 반복
- `classify-tags.ts`, `parse-ingredients.ts`, `seed-recipes.ts`, `seed-youtube.ts`, `test-naver-price.ts`
- 미세 차이: seed-youtube는 multiline, test-naver-price는 inline comment stripping

**해결**: `scripts/lib/load-env.ts` 추출
- multiline 지원 + inline comment stripping 모두 포함한 통합 버전
- 각 스크립트 상단에서 `import '../lib/load-env'` (side-effect import)
- `estimate-prices.ts`는 .env 로딩 없으므로 변경 불필요

---

## 3. AbortController 추가

**문제**: useEffect 내 fetch에 cleanup 함수 없음
- `src/app/grocery/page.tsx` — POST /api/grocery 호출
- `src/app/recipe/[id]/youtube-section.tsx` — GET /api/youtube 호출

**해결**: 두 파일에 AbortController + cleanup return 추가.
기존 `ingredient-prices.tsx`의 패턴을 따름:
```typescript
const controller = new AbortController();
// fetch(..., { signal: controller.signal })
return () => controller.abort();
```

---

## 4. 배포 설정 (Vercel)

**신규 파일**:
- `vercel.json` — 기본 설정 + 향후 cron 준비
- `.env.example` 정리 — 필요한 환경변수 목록 문서화

**vercel.json 내용**:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install"
}
```

---

## 변경 범위 요약

| 작업 | 파일 | 변경 유형 |
|------|------|----------|
| CATEGORY_EMOJI | `src/lib/constants.ts` | 추가 |
| CATEGORY_EMOJI | `src/app/grocery/page.tsx` | 수정 (import) |
| CATEGORY_EMOJI | `src/app/recipe/[id]/ingredients-section.tsx` | 수정 (import) |
| load-env | `scripts/lib/load-env.ts` | 신규 |
| load-env | `scripts/classify-tags.ts` | 수정 |
| load-env | `scripts/parse-ingredients.ts` | 수정 |
| load-env | `scripts/seed-recipes.ts` | 수정 |
| load-env | `scripts/seed-youtube.ts` | 수정 |
| load-env | `scripts/test-naver-price.ts` | 수정 |
| AbortController | `src/app/grocery/page.tsx` | 수정 |
| AbortController | `src/app/recipe/[id]/youtube-section.tsx` | 수정 |
| 배포 | `vercel.json` | 신규 |
| 배포 | `.env.example` | 신규/수정 |

## 리스크

- 없음. 모두 로컬 리팩토링이며 기능 변경 없음.
- 빌드 검증(`bun run build`)으로 import 오류 확인 가능.
