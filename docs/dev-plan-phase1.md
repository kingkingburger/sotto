# Sotto v2 Phase 1 — 개발 계획

> 목표: 플로우 리디자인 + 버그 수정 + 디자인 리뉴얼

---

## 변경 요약

### 삭제
| 파일 | 이유 |
|------|------|
| `src/app/select/page.tsx` | 태그 선택 페이지 제거 (필터로 대체) |

### 대폭 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/app/page.tsx` | 랜딩 → 바로 주간 메뉴 표시 (메인 화면으로 전환) |
| `src/app/menu/page.tsx` | 메인 화면으로 승격, 필터 추가, 상태 유지, 에러 핸들링, 디자인 리뉴얼 |
| `src/app/recipe/[id]/page.tsx` | YouTube 외부 링크 방식, 재뽑기 버튼, 디자인 리뉴얼 |
| `src/app/grocery/page.tsx` | 보조 도구로 위상 변경, 디자인 리뉴얼 |
| `src/app/layout.tsx` | 헤더 프로그레스 바 변경 (3단계→2단계: 메뉴+장보기) |
| `src/components/layout/header.tsx` | 프로그레스 바 업데이트 |

### 신규 추가
| 파일 | 설명 |
|------|------|
| `src/lib/store.ts` | Zustand 스토어 (메뉴 상태 관리 + LocalStorage 영속성) |
| `src/components/ui/toast.tsx` | 토스트 알림 컴포넌트 |
| `src/components/ui/filter-sheet.tsx` | 필터 UI (Apple 스타일 시트/모달) |
| `src/hooks/use-menu-store.ts` | 메뉴 상태 관리 훅 (하루 경과 리셋 포함) |

### 패키지 추가
| 패키지 | 용도 |
|--------|------|
| `zustand` | 클라이언트 상태 관리 + persist 미들웨어 |
| `zod` | API input validation |
| `framer-motion` | 부드러운 애니메이션 (디자인 핵심) |
| `sonner` | 토스트 알림 (경량) |

---

## 작업 단계 (순서대로)

### Step 1: 기반 인프라 (의존성 + 상태 관리)

**1.1 패키지 설치**
```bash
bun add zustand zod framer-motion sonner
```

**1.2 Zustand 스토어 생성** — `src/lib/store.ts`
```
- menu: DayMenu[] (현재 메뉴)
- tags: ConceptTag[] (선택된 필터 태그)
- days: 5 | 7
- lastUpdated: Date (하루 경과 체크용)
- actions: setMenu, setTags, setDays, resetIfExpired, refreshMenu
- persist 미들웨어: LocalStorage에 저장
- 하루 경과 시 자동 리셋 로직
```

**1.3 Zod 스키마** — `src/lib/schemas.ts`
```
- RecommendRequestSchema: { tags, days, excludeIds?, recipeIds? }
- RerollRequestSchema: { tags, excludeIds, dishType? }
- GroceryRequestSchema: { recipeIds }
```

**1.4 토스트 설정** — `src/components/ui/toast.tsx` + layout.tsx에 Toaster 추가

### Step 2: API 개선

**2.1 `src/app/api/recommend/route.ts`**
- zod validation 적용
- `any` 타입 제거
- tags 빈 배열 허용 (필터 없음 = 전체 랜덤)

**2.2 `src/app/api/reroll/route.ts`**
- zod validation 적용
- 에러 응답 구조 개선 (error message 포함)

**2.3 `src/app/api/grocery/route.ts`**
- zod validation 적용

**2.4 `src/lib/recommend.ts`**
- `any` → 정확한 타입으로 교체
- tags 빈 배열일 때 전체 풀에서 랜덤 추천
- 42703 에러 폴백 코드 정리

### Step 3: 랜딩 → 메인 화면 전환

**3.1 `src/app/page.tsx` 완전 재작성**
- 기존 랜딩 제거
- 바로 주간 메뉴 그리드 표시 (현재 menu/page.tsx 로직 통합)
- Zustand 스토어에서 메뉴 로드 (없으면 API 호출)
- 하루 경과 체크 → 자동 리셋

**3.2 `src/app/select/page.tsx` 삭제**
- /select 경로 제거
- /select로 접근 시 / 로 리다이렉트

**3.3 `src/app/menu/page.tsx` 제거 또는 리다이렉트**
- 메인 화면이 /로 이동했으므로 /menu는 / 로 리다이렉트

### Step 4: 메인 화면 디자인 리뉴얼

**4.1 메뉴 그리드 디자인**
- Framer Motion: 카드 등장 stagger animation
- 카드 hover: scale + shadow + spring animation
- 간결한 카드 (이미지, 이름, 가격, 시간, 난이도, 칼로리, YouTube 아이콘)
- 재뽑기 버튼: 회전 애니메이션

**4.2 필터 UI** — `src/components/ui/filter-sheet.tsx`
- Apple 스타일 bottom sheet (모바일) / dropdown (데스크톱)
- 태그 선택 (budget, taste, volume, easy, nutrition)
- 기간 변경 (5일/7일)
- 적용 시 메뉴 새로고침

**4.3 가격 요약 섹션**
- 이번 주 예상 재료비
- (Phase 2에서 트렌드 추가 예정)

**4.4 액션 바**
- 전체 새로고침 버튼
- 메뉴 확정 → 장보기 목록 (보조)

### Step 5: 레시피 상세 개선

**5.1 `src/app/recipe/[id]/page.tsx`**
- YouTube: iframe 임베드 → 외부 링크 (YouTube 앱으로 이동)
- 재뽑기 🎲 버튼 추가
- 디자인 리뉴얼 (Framer Motion 전환 애니메이션)
- 재료별 가격 표시 (현재 가격 사전 기반, Phase 2에서 실시간으로)

**5.2 `src/app/recipe/[id]/youtube-section.tsx`**
- iframe → 외부 링크 버튼으로 변경
- YouTube 앱으로 이동

### Step 6: 장보기 목록 개선

**6.1 `src/app/grocery/page.tsx`**
- 보조 도구 위상으로 디자인 변경
- 에러 핸들링 개선 (클립보드 실패 시 toast)
- 체크박스 이벤트 버블링 수정
- 디자인 리뉴얼

### Step 7: 헤더/레이아웃 업데이트

**7.1 `src/components/layout/header.tsx`**
- 프로그레스 바: 3단계(선택/메뉴/장보기) → 2단계(메뉴/장보기)
- /select 관련 로직 제거

**7.2 `src/app/layout.tsx`**
- Toaster 컴포넌트 추가
- 메타데이터 업데이트

### Step 8: 에러 핸들링 통합

**8.1 모든 catch 블록 수정**
- `// silently ignore` → toast.error() 호출
- reroll 실패: "다시 뽑기에 실패했어요. 다시 시도해주세요"
- 클립보드 실패: "복사에 실패했어요"
- 네트워크 에러: "네트워크 연결을 확인해주세요"

---

## 검증 체크리스트

Phase 1 완료 시 아래 항목 모두 통과해야 함:

- [ ] 앱 오픈 → 바로 5일 메뉴 표시 (태그 선택 없이)
- [ ] 카드 탭 → 레시피 상세 (재료, 조리순서, 영양정보)
- [ ] YouTube → 외부 링크로 이동 (앱 내 임베드 아님)
- [ ] 재뽑기 → 새 레시피 + 실패 시 toast
- [ ] 전체 새로고침 → 완전히 새로운 메뉴
- [ ] 필터 적용 → 해당 태그의 레시피만
- [ ] 7일로 변경 → 7개 카드
- [ ] 브라우저 새로고침(F5) → 이전 메뉴 유지
- [ ] 하루 경과 → 메뉴 자동 리셋
- [ ] 메뉴 확정 → 장보기 목록 (보조)
- [ ] 장보기 체크리스트 정상 동작
- [ ] 목록 복사 → 성공/실패 toast
- [ ] /select 접근 → / 리다이렉트
- [ ] /menu 접근 → / 리다이렉트
- [ ] 모바일 뷰포트에서 전체 플로우 정상
- [ ] 데스크톱에서 전체 플로우 정상
- [ ] 모든 애니메이션 부드럽게 동작
- [ ] API validation 에러 시 적절한 응답

---

## 예상 파일 변경 목록

```
수정: src/app/page.tsx (완전 재작성)
수정: src/app/menu/page.tsx (리다이렉트로 변경)
수정: src/app/recipe/[id]/page.tsx
수정: src/app/recipe/[id]/youtube-section.tsx
수정: src/app/grocery/page.tsx
수정: src/app/layout.tsx
수정: src/app/api/recommend/route.ts
수정: src/app/api/reroll/route.ts
수정: src/app/api/grocery/route.ts
수정: src/lib/recommend.ts
수정: src/components/layout/header.tsx
삭제: src/app/select/page.tsx
추가: src/lib/store.ts
추가: src/lib/schemas.ts
추가: src/components/ui/toast.tsx
추가: src/components/ui/filter-sheet.tsx
```
