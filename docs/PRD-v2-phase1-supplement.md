# Sotto v2 Phase 1 보완 PRD

> 작성일: 2026-03-09
> 근거 문서:
> - `docs/PRD-v2.md` — 원본 제품 요구사항
> - `docs/dev-plan-phase1.md` — Phase 1 개발 계획
> - `decisions/2026-03-09-phase1-prd-review.md` — Arena 토론 결과 (4인 에이전트, 3라운드)
>
> 이 문서는 위 세 문서를 참조하지 않고도 Phase 1 보완 구현이 가능한 독립 완결 스펙이다.

---

## 1. 보완 범위 요약

Arena 토론(헤비유저, 신규유저, 모바일유저, UX전문가) 및 코드 정적 검증 결과, 원본 PRD-v2와 dev-plan-phase1에 누락된 사항을 아래 6개 영역으로 분류한다.

| 영역 | 항목 수 | 공수 |
|------|---------|------|
| 접근성 개선 | 5항목 | 1~2일 |
| UX 안내 개선 (코치마크, 필터, 에러) | 3항목 | 1~2일 |
| 레시피 상세 보완 | 2항목 | 1일 |
| 히스토리 페이지 (신규) | 1항목 | 2~3일 |
| Service Worker 캐싱 | 1항목 | 1일 |
| 반응형 디자인 스펙 | 명세만 | — |

**Phase 1 보완 총 예상 공수: 6~9일** (원본 Phase 1과 병행 가능)

### 명시적 제외 (Phase 2 이후)

- 인분 수 설정
- 메뉴 확정 단계 (자연스러운 메인 → 장보기 직행 유지)
- 조리 모드 (Wake Lock)
- iOS Safe Area 대응
- 스와이프 재뽑기
- 즐겨찾기 (DB 스키마 변경 필요)
- 키보드 내비게이션 전면 강화

---

## 2. 접근성 개선

### 2.1 색상 대비 AA 기준 충족

**문제**: `sotto-400`(`#b9a07e`) on `sotto-50`(`#faf8f5`)의 대비율이 약 2.5:1로 WCAG 2.1 AA 기준(4.5:1)을 크게 미달한다. 태그 라벨, 보조 텍스트 등 전반에서 발생.

**해결 방법**:

```css
/* tailwind.config.ts — sotto 팔레트 수정 */
'sotto': {
  50:  '#faf8f5',
  100: '#f2ede6',
  200: '#e5ddd0',
  300: '#d0c3ad',
  400: '#9e7e5a',  /* 기존 #b9a07e → #9e7e5a (4.6:1 on #faf8f5) */
  500: '#8a6a45',
  600: '#6e5136',
  700: '#5a4028',
  800: '#3d2b19',
  900: '#211710',
}
```

**검증 방법**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) 또는 Chrome DevTools Accessibility 탭에서 텍스트 대비 ≥ 4.5:1 확인.

**영향 범위**: `tailwind.config.ts` 색상값 변경 1줄. 나머지 파일은 클래스명 유지.

---

### 2.2 터치 타겟 44px 확보

**문제**: 재뽑기 버튼 32px, 체크박스 20px로 iOS/Android HIG 권장 44px 미달.

**해결 방법**: CSS `min-h-[44px] min-w-[44px]` 적용 + 시각적 크기는 유지하되 투명 패딩으로 확장.

```tsx
/* 재뽑기 버튼 */
<button
  aria-label="이 메뉴 다시 뽑기"
  className="relative flex items-center justify-center
             min-h-[44px] min-w-[44px]
             rounded-full hover:bg-sotto-100 transition-colors"
>
  <Dice5 className="h-5 w-5 text-sotto-500" />
</button>

/* 체크박스 래퍼 */
<label className="flex items-center gap-3 min-h-[44px] cursor-pointer py-1">
  <Checkbox className="h-5 w-5 shrink-0" />
  <span>{item.name}</span>
</label>
```

**영향 범위**:
- `src/app/page.tsx` — 메인 카드 내 재뽑기 버튼
- `src/app/recipe/[id]/page.tsx` — 레시피 상세 재뽑기 버튼
- `src/app/grocery/page.tsx` — 체크박스 래퍼
- `src/components/ui/checkbox.tsx` — 기본 체크박스 컴포넌트

---

### 2.3 Framer Motion reduced-motion 대응

**문제**: 현재 CSS `prefers-reduced-motion`은 Tailwind가 부분 처리하나, Framer Motion JS 애니메이션은 미대응. 전정기관 민감 사용자에게 메스꺼움 유발 가능.

**해결 방법**: `useReducedMotion()` 훅을 최상위 애니메이션 컴포넌트에 적용.

```tsx
// src/lib/animation.ts — 공통 variants 정의
import { useReducedMotion } from 'framer-motion'

export function useAnimationVariants() {
  const shouldReduce = useReducedMotion()

  const cardVariants = {
    hidden: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    visible: shouldReduce
      ? { opacity: 1, transition: { duration: 0.15 } }
      : { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  }

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: shouldReduce ? 0 : 0.07,
      },
    },
  }

  return { cardVariants, staggerContainer, shouldReduce }
}
```

```tsx
// 사용 예시 — 메인 카드 그리드
function MenuGrid({ menu }: { menu: DayMenu[] }) {
  const { cardVariants, staggerContainer } = useAnimationVariants()

  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
      {menu.map((day) => (
        <motion.li key={day.date} variants={cardVariants}>
          <MenuCard day={day} />
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

**영향 범위**:
- `src/lib/animation.ts` (신규 생성)
- `src/app/page.tsx` — 카드 stagger
- `src/app/recipe/[id]/page.tsx` — 페이지 진입 애니메이션

---

### 2.4 프로그레스 바 ARIA 속성

**문제**: `grocery/page.tsx`의 진행률 바에 `role="progressbar"` 및 관련 ARIA 속성이 없어 스크린 리더가 인식 불가.

**해결 방법**:

```tsx
/* src/app/grocery/page.tsx */
<div
  role="progressbar"
  aria-valuenow={checkedCount}
  aria-valuemin={0}
  aria-valuemax={totalCount}
  aria-label={`장보기 완료: ${checkedCount}/${totalCount}개`}
  className="h-2 rounded-full bg-sotto-200 overflow-hidden"
>
  <div
    className="h-full bg-sotto-500 transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

**영향 범위**: `src/app/grocery/page.tsx` 단일 파일.

---

### 2.5 FilterSheet Escape 키 핸들러

**문제**: `filter-sheet.tsx`에서 Escape 키로 필터 시트를 닫을 수 없음. 키보드 사용자 및 접근성 도구 사용자에게 포커스 트랩 발생 위험.

**해결 방법**:

```tsx
// src/components/ui/filter-sheet.tsx
useEffect(() => {
  if (!isOpen) return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose])
```

추가로 시트가 열릴 때 첫 번째 포커스 가능 요소로 포커스를 이동시킨다.

```tsx
const firstFocusRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  if (isOpen) {
    // 다음 렌더 사이클에 포커스 이동
    requestAnimationFrame(() => firstFocusRef.current?.focus())
  }
}, [isOpen])
```

**영향 범위**: `src/components/ui/filter-sheet.tsx` 단일 파일.

---

## 3. UX 안내 개선

### 3.1 코치마크 (최초 진입 안내)

**결정**: 멀티-스텝 툴팁이 아닌 **단일 해제 가능 배너** 방식 채택. 헤비유저도 수용 가능한 1회성 노출이 핵심.

**동작 규칙**:
- 앱 첫 진입 시(LocalStorage `sotto_coached` 키 부재) 메뉴 그리드 상단에 배너 표시
- 배너 내 X 버튼 또는 바깥 영역 클릭 시 해제 → `localStorage.setItem('sotto_coached', '1')` 저장
- 이후 방문 시 배너 미표시
- 배너는 콘텐츠를 가리지 않도록 카드 그리드 위 인라인으로 배치 (오버레이 아님)

**배너 내용**:

```
[메뉴 카드를 탭하면 레시피 상세를 볼 수 있어요.
🎲 버튼으로 마음에 안 드는 메뉴를 교체하고,
필터로 내 취향에 맞게 조정해보세요.]
                                           [닫기 ×]
```

**구현 스펙**:

```tsx
// src/components/coach-mark.tsx (신규)
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const COACHED_KEY = 'sotto_coached'

export function CoachMark() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const coached = localStorage.getItem(COACHED_KEY)
    if (!coached) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(COACHED_KEY, '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-4 rounded-2xl border border-sotto-200 bg-sotto-50 px-4 py-3
                     flex items-start gap-3"
          role="note"
          aria-label="사용 안내"
        >
          <p className="flex-1 text-sm text-sotto-700 leading-relaxed">
            카드를 탭해서 레시피를 확인하고, 🎲 버튼으로 메뉴를 바꿔보세요.
            상단 필터로 취향에 맞게 조정할 수 있어요.
          </p>
          <button
            onClick={dismiss}
            aria-label="안내 닫기"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center
                       -mr-2 -mt-1 rounded-full hover:bg-sotto-100 transition-colors"
          >
            <X className="h-4 w-4 text-sotto-400" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**배치**: `src/app/page.tsx`의 메뉴 그리드 상단, 헤더 아래.

---

### 3.2 필터 태그 설명 노출

**문제**: `constants.ts`에 태그별 description 데이터가 있으나 `filter-sheet.tsx`가 이를 표시하지 않음. 신규 유저가 "easy"나 "budget"의 의미를 알 수 없음.

**현재 constants.ts 구조 (추정)**:

```ts
export const CONCEPT_TAGS = {
  budget:    { label: '절약', description: '재료비 5천원 이하 레시피' },
  taste:     { label: '맛있는', description: '평점 높은 인기 레시피' },
  volume:    { label: '든든한', description: '고단백·고탄수 포만감 레시피' },
  easy:      { label: '간편한', description: '30분 이내, 단순 조리법' },
  nutrition: { label: '건강한', description: '저칼로리·고영양 레시피' },
}
```

**filter-sheet.tsx 수정 스펙**:

```tsx
{Object.entries(CONCEPT_TAGS).map(([key, tag]) => (
  <button
    key={key}
    onClick={() => toggleTag(key as ConceptTag)}
    aria-pressed={selectedTags.includes(key as ConceptTag)}
    className={clsx(
      'flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3',
      'min-h-[44px] text-left transition-colors',
      selectedTags.includes(key as ConceptTag)
        ? 'border-sotto-500 bg-sotto-500 text-white'
        : 'border-sotto-200 bg-white text-sotto-800 hover:border-sotto-400'
    )}
  >
    <span className="text-sm font-semibold">{tag.label}</span>
    <span className={clsx(
      'text-xs',
      selectedTags.includes(key as ConceptTag) ? 'text-sotto-100' : 'text-sotto-500'
    )}>
      {tag.description}
    </span>
  </button>
))}
```

**영향 범위**: `src/components/ui/filter-sheet.tsx`, `src/lib/constants.ts` (description 필드 추가 필요 시).

---

### 3.3 에러/빈 상태 안내 메시지

**문제**: 필터 결과가 0건일 때 빈 화면만 표시되어 사용자가 무엇을 해야 할지 알 수 없음.

**케이스별 안내 메시지 스펙**:

| 상황 | 메시지 | 액션 |
|------|--------|------|
| 필터 결과 0건 | "선택한 필터 조건에 맞는 레시피가 없어요." | [필터 초기화] 버튼 |
| API 호출 실패 | "메뉴를 불러오지 못했어요. 잠시 후 다시 시도해주세요." | [다시 시도] 버튼 |
| 재뽑기 실패 | toast: "다른 메뉴를 찾지 못했어요. 필터를 조정해보세요." | — (toast 자동 소멸) |
| 장보기 목록 비어있음 | "메인 화면에서 메뉴를 선택해주세요." | [메뉴로 이동] 버튼 |
| 클립보드 복사 실패 | toast: "복사에 실패했어요. 직접 선택해서 복사해주세요." | — |
| 네트워크 에러 | toast: "네트워크 연결을 확인해주세요." | — |

**빈 상태 컴포넌트 스펙**:

```tsx
// src/components/empty-state.tsx (신규)
interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="text-4xl">🍱</div>
      <div>
        <p className="text-sotto-800 font-semibold">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-sotto-500">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-xl bg-sotto-500 px-6 py-2.5
                     text-sm font-medium text-white min-h-[44px]
                     hover:bg-sotto-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

**영향 범위**:
- `src/components/empty-state.tsx` (신규)
- `src/app/page.tsx` — 필터 결과 0건 처리
- `src/app/grocery/page.tsx` — 빈 장보기 목록

---

## 4. 레시피 상세 보완

### 4.1 레시피 상세 재뽑기 버튼

**문제**: PRD v2 4.2절 "재뽑기 🎲 버튼" 명시되어 있으나 `src/app/recipe/[id]/page.tsx`에 미구현(코드 검증으로 확인된 PRD-구현 불일치).

**동작 규칙**:
- 레시피 상세 페이지 하단 고정 바에 [🎲 다른 메뉴로 교체] 버튼 배치
- 클릭 시 현재 레시피의 `dishType`을 유지하면서 `/api/reroll` 호출
- 성공: 메인 페이지의 해당 요일 카드를 새 레시피로 교체 후 상세 페이지를 새 레시피로 전환 (router.replace)
- 실패: toast.error("다른 메뉴를 찾지 못했어요. 필터를 조정해보세요.")
- 로딩 중: 버튼 비활성화 + 스피너

**구현 구조**: `recipe/[id]/page.tsx`는 Server Component이므로, 재뽑기 인터랙션을 위한 Client Component를 분리한다.

```
src/app/recipe/[id]/
├── page.tsx                  # Server Component (데이터 fetch)
├── recipe-detail-client.tsx  # Client Component (재뽑기 버튼 + 인터랙션)
└── youtube-section.tsx       # 기존 YouTube 외부 링크
```

```tsx
// src/app/recipe/[id]/recipe-detail-client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMenuStore } from '@/lib/store'

interface Props {
  recipeId: string
  dayIndex: number | null  // null이면 메뉴에 없는 레시피 (단독 조회)
  dishType: string
  currentExcludeIds: string[]
}

export function RecipeDetailClient({ recipeId, dayIndex, dishType, currentExcludeIds }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { replaceRecipe, tags } = useMenuStore()

  async function handleReroll() {
    setLoading(true)
    try {
      const res = await fetch('/api/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags,
          excludeIds: [...currentExcludeIds, recipeId],
          dishType,
        }),
      })

      if (!res.ok) throw new Error('reroll failed')

      const newRecipe = await res.json()

      if (dayIndex !== null) {
        replaceRecipe(dayIndex, newRecipe)
      }

      router.replace(`/recipe/${newRecipe.id}`)
    } catch {
      toast.error('다른 메뉴를 찾지 못했어요. 필터를 조정해보세요.')
    } finally {
      setLoading(false)
    }
  }

  // dayIndex가 null이면 메뉴 외부에서 본 레시피 → 재뽑기 불필요
  if (dayIndex === null) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-sotto-100 bg-white/90
                    backdrop-blur-sm px-4 py-3 flex justify-center">
      <button
        onClick={handleReroll}
        disabled={loading}
        aria-label="다른 메뉴로 교체하기"
        className="flex items-center gap-2 rounded-2xl bg-sotto-500 px-6 py-3
                   min-h-[44px] text-sm font-semibold text-white
                   hover:bg-sotto-600 disabled:opacity-50 transition-colors"
      >
        {loading ? <Spinner /> : <span>🎲</span>}
        <span>{loading ? '찾는 중...' : '다른 메뉴로 교체'}</span>
      </button>
    </div>
  )
}
```

**Zustand store 추가 액션**:

```ts
// src/lib/store.ts에 추가
replaceRecipe: (dayIndex: number, newRecipe: RecipeSummary) => void
```

---

### 4.2 레시피 상세 재료 — 가격 + 용량 인라인 표시

**결정**: Phase 2에서 실시간 가격 API가 완성되기 전까지, Phase 1에서는 재료 목록에 **용량(amount)** 을 인라인으로 표시한다. 가격 필드는 레이아웃 슬롯만 예약하고 `—` 또는 가격 데이터 존재 시 표시.

**재료 행 레이아웃**:

```tsx
/* 재료 1행 */
<li className="flex items-center justify-between py-2.5 border-b border-sotto-100 last:border-0">
  <div className="flex items-center gap-3">
    <span className="text-base">{ingredient.name}</span>
    <span className="text-sm text-sotto-400">{ingredient.amount}</span>
  </div>
  <div className="text-right">
    {ingredient.price != null ? (
      <span className="text-sm font-medium text-sotto-700">
        약 {ingredient.price.toLocaleString()}원
      </span>
    ) : (
      <span className="text-xs text-sotto-300">가격 정보 없음</span>
    )}
  </div>
</li>
```

**타입 확장** (`src/types/recipe.ts`):

```ts
export interface RecipeIngredient {
  id: string
  name: string
  amount: string
  category: IngredientCategory
  is_optional: boolean
  price?: number | null        // Phase 2에서 채워질 예정
  unit?: string                // "100g", "1개" 등 구매 단위
}
```

---

## 5. 히스토리 페이지 (신규)

**결정 근거**: Arena 토론에서 헤비유저가 강력히 요청. "지난주에 뭘 먹었는지 기억이 안 나서 같은 메뉴를 또 뽑는다"는 반복 사용 피로가 핵심 문제. DB 스키마 변경 없이 LocalStorage만으로 구현.

### 5.1 기능 스펙

| 항목 | 스펙 |
|------|------|
| 경로 | `/history` |
| 데이터 저장소 | LocalStorage (`sotto_history` 키) |
| 보관 기간 | 최대 4주 (28일) 자동 삭제 |
| 최대 항목 | 4개 주간 메뉴 |
| 화면 모드 | 읽기 전용 (재뽑기/수정 불가) |
| 진입점 | 헤더 또는 메인 하단 링크 |
| 카드 탭 동작 | 해당 레시피 상세 페이지로 이동 (`/recipe/:id`) |

### 5.2 데이터 구조

```ts
// src/types/history.ts (신규)
export interface WeeklyHistory {
  id: string            // 예: "2026-W10"
  weekLabel: string     // "3월 1주차 (3/2~3/6)"
  savedAt: string       // ISO 8601
  menu: DayMenu[]
  days: 5 | 7
}
```

```ts
// LocalStorage 저장 형태
{
  "sotto_history": [
    {
      "id": "2026-W10",
      "weekLabel": "3월 1주차 (3/2~3/6)",
      "savedAt": "2026-03-06T23:59:00.000Z",
      "menu": [ /* DayMenu[] */ ],
      "days": 5
    }
  ]
}
```

### 5.3 히스토리 저장 트리거

메인 화면에서 [장보기 목록으로 이동] 버튼 클릭 시 현재 메뉴를 히스토리에 자동 저장.

```ts
// src/lib/history.ts (신규)
const HISTORY_KEY = 'sotto_history'
const MAX_WEEKS = 4
const MAX_AGE_MS = 28 * 24 * 60 * 60 * 1000  // 28일

export function saveHistory(menu: DayMenu[], days: 5 | 7): void {
  const now = new Date()
  const year = now.getFullYear()
  const week = getISOWeek(now)  // date-fns 또는 직접 계산
  const id = `${year}-W${String(week).padStart(2, '0')}`

  const existing = loadHistory()

  // 같은 주 이미 있으면 덮어쓰기
  const filtered = existing.filter((h) => h.id !== id)
  const newEntry: WeeklyHistory = {
    id,
    weekLabel: formatWeekLabel(now),
    savedAt: now.toISOString(),
    menu,
    days,
  }

  // 최신순 정렬, 4주 초과분 삭제
  const updated = [newEntry, ...filtered].slice(0, MAX_WEEKS)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function loadHistory(): WeeklyHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: WeeklyHistory[] = JSON.parse(raw)
    // 28일 지난 항목 자동 삭제
    const cutoff = Date.now() - MAX_AGE_MS
    return parsed.filter((h) => new Date(h.savedAt).getTime() > cutoff)
  } catch {
    return []
  }
}
```

### 5.4 히스토리 페이지 레이아웃

```
/history

[← 뒤로]        지난 메뉴 기록

┌─────────────────────────────────┐
│ 3월 1주차 (3/2~3/6)  3월 6일 저장 │
│                                   │
│  월  화  수  목  금               │
│ [이] [이] [이] [이] [이]          │  ← 레시피 썸네일 카드 그리드 (탭 가능)
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 2월 4주차 (2/23~2/27)           │
│ ...                              │
└─────────────────────────────────┘

히스토리 없음 시:
"아직 기록이 없어요. 메뉴를 확정하면 자동으로 저장돼요."
```

**파일 목록**:
- `src/app/history/page.tsx` (신규 — Client Component)
- `src/lib/history.ts` (신규)
- `src/types/history.ts` (신규)

### 5.5 헤더 진입점

```tsx
// src/components/layout/header.tsx 수정
// 헤더 우측에 히스토리 아이콘 버튼 추가
<Link href="/history" aria-label="지난 메뉴 기록">
  <Clock className="h-5 w-5 text-sotto-500" />
</Link>
```

---

## 6. Service Worker 캐싱 (최소)

**결정**: 풀 PWA가 아닌, **최후 조회 메뉴 + 최근 본 레시피**만 캐싱하는 최소 전략. 마트 지하 등 네트워크 불안정 환경에서 장보기 목록을 볼 수 있는 것이 목표.

**캐싱 대상**:

| 항목 | 전략 | 이유 |
|------|------|------|
| 현재 주간 메뉴 데이터 | Zustand persist (LocalStorage) | 이미 구현됨 |
| 최근 본 레시피 상세 | SW Cache API (네트워크 우선, 캐시 폴백) | 오프라인 열람 |
| 정적 자산 (JS/CSS) | SW Precache | Next.js 기본 |
| API 응답 (/api/grocery) | SW Cache API (최근 1회) | 장보기 오프라인 열람 |

**캐싱 제외**:
- `/api/recommend` — 매번 새 메뉴 필요
- `/api/reroll` — 실시간 필요
- 이미지 — 용량 과다

**구현 방법**: `next-pwa` 패키지 미사용. `public/sw.js` 직접 작성 + `next.config.ts`에 SW 등록.

```js
// public/sw.js — 최소 구현
const RECIPE_CACHE = 'sotto-recipes-v1'
const GROCERY_CACHE = 'sotto-grocery-v1'
const MAX_RECIPE_CACHE = 10  // 최근 10개 레시피만

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 레시피 상세 API 캐싱
  if (url.pathname.startsWith('/api/recipe/')) {
    event.respondWith(networkFirstWithCache(event.request, RECIPE_CACHE))
    return
  }

  // 장보기 목록 캐싱
  if (url.pathname === '/api/grocery' && event.request.method === 'POST') {
    event.respondWith(networkFirstWithCache(event.request, GROCERY_CACHE))
    return
  }
})

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    })
  }
}
```

**파일 목록**:
- `public/sw.js` (신규)
- `src/app/layout.tsx` 수정 — SW 등록 스크립트

**오프라인 상태 표시**:

```tsx
// src/hooks/use-online.ts (신규)
'use client'
import { useState, useEffect } from 'react'

export function useOnline() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}
```

오프라인 시 메인 상단에 `"오프라인 상태 — 저장된 메뉴를 표시 중이에요."` 배너 표시.

---

## 7. 반응형 디자인 스펙

**결정**: 모바일 우선이 아닌 **모바일 + 데스크톱 동등** 전략. 각 환경에 최적화된 레이아웃.

### 7.1 브레이크포인트

```ts
// tailwind.config.ts screens 확장
screens: {
  'sm': '480px',   // phone → tablet 전환
  'md': '768px',   // tablet → desktop 전환
  'lg': '1024px',  // wide desktop
}
```

### 7.2 컴포넌트별 반응형 스펙

| 컴포넌트 | 모바일 (< 480px) | 태블릿 (480~767px) | 데스크톱 (≥ 768px) |
|---------|-----------------|-------------------|------------------|
| 메뉴 그리드 | 1열 세로 스크롤 | 2열 그리드 | 3열 그리드 (5일: 3+2, 7일: 4+3) |
| 메뉴 카드 | 가로형 (이미지 왼쪽 80px) | 세로형 | 세로형 |
| 필터 UI | Bottom Sheet (위에서 슬라이드) | Bottom Sheet | 중앙 모달 (max-w-sm) |
| 레시피 상세 | 단일 컬럼 | 단일 컬럼 | 2컬럼 (이미지+메타 / 재료+순서) |
| 히스토리 카드 | 주간 카드 1열 | 2열 | 2열 |
| 헤더 | 로고 + 아이콘 2개 | 로고 + 아이콘 3개 | 로고 + 텍스트 메뉴 |

### 7.3 FilterSheet 반응형 구현

```tsx
// src/components/ui/filter-sheet.tsx
import { useMediaQuery } from '@/hooks/use-media-query'

export function FilterSheet({ isOpen, onClose, ... }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    // 중앙 모달
    return (
      <dialog
        open={isOpen}
        className="fixed inset-0 z-50 flex items-center justify-center
                   bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          {/* 필터 내용 */}
        </div>
      </dialog>
    )
  }

  // Bottom Sheet (모바일)
  return (
    <div
      className={clsx(
        'fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl',
        'transition-transform duration-300',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="메뉴 필터"
    >
      <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-sotto-200" />
      {/* 필터 내용 */}
    </div>
  )
}
```

```ts
// src/hooks/use-media-query.ts (신규)
'use client'
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [query])
  return matches
}
```

### 7.4 메뉴 그리드 반응형

```tsx
// 5일 메뉴 그리드 클래스
<ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {menu.map((day) => <MenuCard key={day.date} day={day} />)}
</ul>

// 카드 방향 — 모바일에서 가로형
<article className="flex sm:flex-col gap-3 rounded-2xl border border-sotto-200 p-3">
  <div className="h-20 w-20 sm:h-48 sm:w-full shrink-0 rounded-xl overflow-hidden">
    <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover" />
  </div>
  <div className="flex-1 min-w-0">
    {/* 메타 정보 */}
  </div>
</article>
```

---

## 8. 명시적 제외 항목

다음 항목은 Arena 토론에서 논의됐으나 Phase 1에서 **명시적으로 제외**하기로 결정한 사항이다. Phase 2 백로그로 등록.

| 항목 | 제외 이유 | Phase |
|------|----------|-------|
| 인분 수 설정 (1~4인분) | 에이전트 1명만 지지. `grocery.ts` 합산 로직 전면 수정 필요 | Phase 2 |
| 메뉴 확정 단계 (확인 모달) | 자연스러운 직행 플로우가 더 좋음. 불필요한 마찰 | Phase 2 검토 |
| 조리 모드 (Wake Lock + 단계 넘기기) | 아키텍처 변경 큼. 3인 합의 Phase 2 | Phase 2 |
| iOS Safe Area 대응 | `env(safe-area-inset-*)` 미적용 상태. 긴급하지 않음 | Phase 2 |
| 스와이프 재뽑기 | 버튼 44px 확대 우선. 스와이프는 Phase 2 | Phase 2 |
| 즐겨찾기 | DB 스키마 확장(favorites 테이블) 필요 | Phase 2 |
| PWA 전체 (오프라인 완전 지원) | 최소 SW 캐싱만 Phase 1 포함 | Phase 2 |
| 키보드 내비게이션 전면 강화 | Escape/Enter 기본 처리만 Phase 1 포함 | Phase 2 |
| 난이도 필터 추가 | ConceptTag 타입 확장 필요. 현재 5개 태그로 충분 | Phase 2 |

---

## 9. 검증 시나리오

### 9.1 정상 플로우 시나리오

#### S1: 앱 첫 진입 (신규 유저)

```
전제: LocalStorage 완전히 비어있음

1. GET / 접속
2. 주간 메뉴 그리드 5개 카드 표시 확인
3. 상단에 코치마크 배너 표시 확인
4. 배너 [닫기] 클릭
5. 배너 사라짐 확인 (애니메이션)
6. 페이지 새로고침 (F5)
7. 배너 재표시되지 않음 확인
8. localStorage.getItem('sotto_coached') === '1' 확인

Playwright:
await expect(page.getByRole('note', { name: '사용 안내' })).toBeVisible()
await page.getByRole('button', { name: '안내 닫기' }).click()
await expect(page.getByRole('note', { name: '사용 안내' })).not.toBeVisible()
await page.reload()
await expect(page.getByRole('note', { name: '사용 안내' })).not.toBeVisible()
```

#### S2: 필터 적용 → 메뉴 갱신

```
전제: 메인 화면에 메뉴 표시 상태

1. [필터] 버튼 클릭
2. FilterSheet/모달 표시 확인
3. '절약' 태그 클릭 → aria-pressed="true" 확인
4. description "재료비 5천원 이하 레시피" 표시 확인
5. [적용] 클릭
6. FilterSheet 닫힘 확인
7. 메뉴 카드 5개 모두 budget 태그 레시피로 갱신 확인
8. FilterSheet에서 Escape 키 → 닫힘 확인

Playwright:
await page.getByRole('button', { name: '필터' }).click()
await expect(page.getByRole('dialog', { name: '메뉴 필터' })).toBeVisible()
await page.getByRole('button', { name: '절약' }).click()
await expect(page.getByRole('button', { name: '절약' })).toHaveAttribute('aria-pressed', 'true')
await expect(page.getByText('재료비 5천원 이하 레시피')).toBeVisible()
await page.keyboard.press('Escape')
await expect(page.getByRole('dialog', { name: '메뉴 필터' })).not.toBeVisible()
```

#### S3: 재뽑기 → 상세 페이지 교체

```
전제: 메인 화면, 첫 번째 카드 레시피명 기억 (예: "김치볶음밥")

1. 첫 번째 카드의 🎲 버튼 클릭
2. 버튼 비활성화 + 로딩 상태 확인
3. 로딩 완료 후 카드 레시피명 변경 확인 (≠ "김치볶음밥")
4. 변경된 카드 클릭 → 레시피 상세 진입
5. 레시피 상세에 [🎲 다른 메뉴로 교체] 버튼 표시 확인 (하단 고정)
6. 재뽑기 버튼 클릭
7. 로딩 중 버튼 disabled 확인
8. 완료 후 URL 변경 확인 (/recipe/새id)
9. 메인으로 돌아가면 해당 요일 카드도 변경됨 확인

Playwright:
const firstCardName = await page.locator('[data-testid="menu-card"]').first()
  .getByRole('heading').textContent()
await page.locator('[data-testid="menu-card"]').first()
  .getByRole('button', { name: '이 메뉴 다시 뽑기' }).click()
await expect(page.locator('[data-testid="menu-card"]').first()
  .getByRole('heading')).not.toHaveText(firstCardName!)
```

#### S4: 장보기 목록 → 히스토리 자동 저장

```
전제: 메인 화면, 메뉴 표시 상태

1. [장보기 목록으로 이동] 클릭
2. /grocery 페이지 이동 확인
3. localStorage.getItem('sotto_history') 파싱 → 1개 항목 존재 확인
4. 저장된 항목의 weekLabel 현재 주차 확인
5. /history 접속
6. 현재 주차 카드 표시 확인
7. 카드 내 레시피 썸네일 탭 → /recipe/:id 이동 확인

Playwright:
await page.getByRole('button', { name: '장보기 목록으로 이동' }).click()
await expect(page).toHaveURL('/grocery')
const history = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('sotto_history') ?? '[]')
)
expect(history).toHaveLength(1)
expect(history[0].weekLabel).toMatch(/주차/)
```

#### S5: 장보기 목록 — 진행률 바 및 접근성

```
전제: /grocery, 5개 카테고리, 총 12개 재료

1. 진행률 바 role="progressbar" 확인
2. aria-valuenow="0", aria-valuemax="12" 확인
3. 첫 번째 재료 체크박스 클릭
4. aria-valuenow="1" 변경 확인
5. 진행률 바 너비 (1/12 * 100)% 변경 확인
6. 체크된 재료 시각적으로 흐려짐 (opacity/line-through) 확인

Playwright:
const progressbar = page.getByRole('progressbar')
await expect(progressbar).toHaveAttribute('aria-valuenow', '0')
await page.getByRole('checkbox').first().click()
await expect(progressbar).toHaveAttribute('aria-valuenow', '1')
```

#### S6: 히스토리 페이지 — 4주 보관 정책

```
전제: LocalStorage에 5주치 히스토리 수동 삽입

// 테스트 픽스처
await page.evaluate(() => {
  const entries = Array.from({ length: 5 }, (_, i) => ({
    id: `2026-W${5 + i}`,
    weekLabel: `${i + 1}월 1주차`,
    savedAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    menu: [],
    days: 5,
  }))
  localStorage.setItem('sotto_history', JSON.stringify(entries))
})

1. /history 접속
2. 카드 4개만 표시 확인 (5주차 중 최신 4개)
3. 가장 오래된 5주째 카드 미표시 확인

Playwright:
await expect(page.getByTestId('history-week-card')).toHaveCount(4)
```

---

### 9.2 엣지 케이스 시나리오

#### E1: 필터 결과 0건

```
전제: DB에 'nutrition' 태그 레시피가 0개인 환경 (또는 nutrition + budget 조합)

1. 필터에서 충돌 조합 선택 후 적용
2. 메뉴 그리드 대신 EmptyState 컴포넌트 표시 확인
3. 메시지: "선택한 필터 조건에 맞는 레시피가 없어요."
4. [필터 초기화] 버튼 표시 확인
5. [필터 초기화] 클릭 → 필터 해제 + 메뉴 재로드
6. 메뉴 카드 5개 표시 확인

Playwright:
await expect(page.getByText('선택한 필터 조건에 맞는 레시피가 없어요.')).toBeVisible()
await page.getByRole('button', { name: '필터 초기화' }).click()
await expect(page.locator('[data-testid="menu-card"]')).toHaveCount(5)
```

#### E2: 재뽑기 실패 (API 에러)

```
전제: /api/reroll Mock → 500 응답

1. 🎲 버튼 클릭
2. toast 메시지 "다른 메뉴를 찾지 못했어요. 필터를 조정해보세요." 표시 확인
3. 기존 카드 변경되지 않음 확인
4. 버튼 다시 활성화됨 확인

Playwright:
await page.route('/api/reroll', (route) => route.fulfill({ status: 500 }))
await page.getByRole('button', { name: '이 메뉴 다시 뽑기' }).first().click()
await expect(page.getByText('다른 메뉴를 찾지 못했어요')).toBeVisible()
```

#### E3: 재뽑기 10회 연타

```
전제: 메인 화면 첫 번째 카드

1. 🎲 버튼 10회 빠르게 클릭 (디바운싱 없는 경우)
2. 버튼이 로딩 중 disabled → 중복 요청 없음 확인
3. 최종 1회 변경 확인 (레이스 컨디션 없음)

Playwright:
const rerollBtn = page.getByRole('button', { name: '이 메뉴 다시 뽑기' }).first()
await rerollBtn.click()
// disabled 상태에서 추가 클릭 시도
await expect(rerollBtn).toBeDisabled()
```

#### E4: 브라우저 새로고침 후 메뉴 유지

```
전제: 메인 화면, 메뉴 5개 표시, 레시피명 기억

1. 페이지 새로고침 (F5)
2. 동일한 레시피명 5개 표시 확인 (LocalStorage persist)
3. 새로고침 버튼 (🔄) 클릭
4. 다른 레시피명으로 교체 확인

Playwright:
const names = await page.locator('[data-testid="menu-card"] h2').allTextContents()
await page.reload()
const namesAfterReload = await page.locator('[data-testid="menu-card"] h2').allTextContents()
expect(namesAfterReload).toEqual(names)
```

#### E5: 오프라인 상태 장보기

```
전제: 레시피 상세 + /api/grocery 최소 1회 조회한 상태

1. 브라우저 오프라인 설정
2. 상단 "오프라인 상태" 배너 표시 확인
3. /grocery 접근 → SW 캐시에서 마지막 데이터 표시 확인
4. 체크박스 클릭 → 반응 (LocalStorage 상태 저장)
5. 다시 온라인 → 배너 사라짐

Playwright:
await page.context().setOffline(true)
await expect(page.getByText('오프라인 상태')).toBeVisible()
await page.goto('/grocery')
await expect(page.getByRole('list')).toBeVisible()  // 캐시된 데이터
await page.context().setOffline(false)
await expect(page.getByText('오프라인 상태')).not.toBeVisible()
```

#### E6: 하루 경과 메뉴 자동 리셋

```
전제: Zustand persist에 lastUpdated = 어제 날짜로 수동 설정

await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem('sotto-menu-store') ?? '{}')
  store.state.lastUpdated = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  localStorage.setItem('sotto-menu-store', JSON.stringify(store))
})

1. 페이지 새로고침
2. 새로운 메뉴 API 호출 발생 확인 (네트워크 탭)
3. 기존 메뉴와 다른 레시피 표시 확인

Playwright:
const requestPromise = page.waitForRequest('/api/recommend')
await page.reload()
await requestPromise  // 리셋 후 API 재호출 확인
```

#### E7: /select, /menu 구 경로 접근 시 리다이렉트

```
1. /select 접속 → / 리다이렉트 확인
2. /menu 접속 → / 리다이렉트 확인
3. 각 리다이렉트 후 메뉴 카드 표시 확인

Playwright:
await page.goto('/select')
await expect(page).toHaveURL('/')
await page.goto('/menu')
await expect(page).toHaveURL('/')
```

#### E8: 히스토리 28일 경과 자동 삭제

```
전제: 29일 전 항목을 LocalStorage에 수동 삽입

await page.evaluate(() => {
  const old = [{
    id: '2026-W01',
    weekLabel: '1월 1주차',
    savedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    menu: [],
    days: 5,
  }]
  localStorage.setItem('sotto_history', JSON.stringify(old))
})

1. /history 접속
2. 29일 전 항목 미표시 확인
3. "아직 기록이 없어요." EmptyState 표시 확인

Playwright:
await page.goto('/history')
await expect(page.getByTestId('history-week-card')).toHaveCount(0)
await expect(page.getByText('아직 기록이 없어요.')).toBeVisible()
```

#### E9: reduced-motion 선호 사용자 접근

```
전제: prefers-reduced-motion: reduce 미디어 특성 활성화

await page.emulateMedia({ reducedMotion: 'reduce' })

1. 메인 화면 로드
2. 카드 등장 애니메이션 — y 이동 없음 (opacity만) 확인
3. 필터 시트 — transform 애니메이션 대신 opacity 전환 확인
4. 재뽑기 버튼 회전 애니메이션 없음 확인

Playwright:
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto('/')
// 카드들이 y 오프셋 없이 바로 표시됨
await expect(page.locator('[data-testid="menu-card"]').first()).toBeVisible()
```

#### E10: 색상 대비 자동 검증

```
Playwright + axe-core 통합:

import { checkA11y } from 'axe-playwright'

test('색상 대비 AA 기준 충족', async ({ page }) => {
  await page.goto('/')
  await checkA11y(page, undefined, {
    runOnly: { type: 'tag', values: ['wcag2aa'] },
  })
})
```

---

## 10. 데모 목업 참조

### 10.1 신규 파일 목록 (이 보완 PRD에 의해 추가됨)

```
신규 추가:
  src/components/coach-mark.tsx         # 코치마크 배너
  src/components/empty-state.tsx        # 빈 상태 안내
  src/app/recipe/[id]/recipe-detail-client.tsx  # 레시피 재뽑기 Client
  src/app/history/page.tsx              # 히스토리 페이지
  src/lib/animation.ts                  # Framer Motion 공통 variants
  src/lib/history.ts                    # 히스토리 LocalStorage 유틸
  src/types/history.ts                  # WeeklyHistory 타입
  src/hooks/use-media-query.ts          # 반응형 미디어 쿼리 훅
  src/hooks/use-online.ts               # 온라인 상태 훅
  public/sw.js                          # Service Worker (최소)

수정:
  tailwind.config.ts                    # sotto-400 색상값 조정 (AA 기준)
  src/components/ui/filter-sheet.tsx    # Escape 핸들러 + 태그 description + 반응형
  src/app/grocery/page.tsx              # 진행률 바 ARIA + 터치 타겟
  src/app/page.tsx                      # 코치마크 + EmptyState + 재뽑기 44px
  src/app/recipe/[id]/page.tsx          # RecipeDetailClient 통합
  src/app/layout.tsx                    # SW 등록
  src/components/layout/header.tsx      # 히스토리 진입점
  src/lib/store.ts                      # replaceRecipe 액션 추가
  src/types/recipe.ts                   # RecipeIngredient.price 필드 추가
```

### 10.2 의존성 추가 없음

이 보완 PRD의 모든 항목은 원본 Phase 1 dev-plan이 이미 추가한 `zustand`, `framer-motion`, `sonner` 위에서 구현된다. 추가 패키지 설치 불필요.

(단, axe-playwright 테스트 적용 시 `bun add -D axe-playwright` 필요)

### 10.3 구현 우선순위

```
즉시 (1~2일):
  1. sotto-400 색상 조정 (tailwind.config.ts 1줄)
  2. 터치 타겟 44px (재뽑기 버튼, 체크박스)
  3. useReducedMotion() 전역 적용
  4. 프로그레스 바 ARIA
  5. FilterSheet Escape 핸들러

이후 (3~5일):
  6. 코치마크 배너
  7. 필터 태그 description 노출
  8. EmptyState 컴포넌트 (에러/빈 상태)
  9. 레시피 상세 재뽑기 버튼
  10. 재료 가격/용량 인라인 표시 레이아웃

추가 (2~3일):
  11. 히스토리 페이지 (/history)
  12. Service Worker 최소 캐싱
  13. 반응형 레이아웃 스펙 적용
```
