# Sotto 프로젝트 리뷰 — Agent Arena 결과
> 날짜: 2026-03-09 | 방식: 5인 프리셋 (옹호자, 비판자, UX 대변인, 기술 설계자, 종합자)

## 합의 사항

| 항목 | 판정 |
|------|------|
| 3단계 플로우 골격 | 동작함 |
| MVP 수준 코드 구조 | 갖춰짐 |
| **프로덕션 배포 준비** | **아직 안 됨** |

## 핵심 문제 (심각도 순)

### 1. 에러를 삼키는 패턴 (Critical)
- `menu/page.tsx` reroll catch → `// silently ignore`
- `youtube-section.tsx`, `grocery/page.tsx` 클립보드 복사 등 동일 패턴
- **영향**: 유저가 버튼 눌러도 반응 없음 → 앱이 고장났다고 인식

### 2. 상태 관리 부재 (High)
- URL params에만 의존, 클라이언트 상태 레이어(Context/Zustand) 없음
- 뒤로가기 시 `/select` 선택 상태 전부 초기화
- `useRef(hasFetched)`로 중복 fetch 방지 = 임시 방편
- stale closure 가능성 (`updateUrlIds`의 deps 누락)

### 3. 타입 안전성 포기 (High)
- `recommend.ts` → `Promise<any[]>`, `as any[]` 캐스팅
- API body → `as { tags?: unknown }` 수동 검증 (zod 미사용)
- DB 스키마 변경 시 컴파일 에러 없이 런타임 크래시

### 4. 추천 품질 한계 (Medium)
- POOL_LIMIT=50 고정 → 스코어링/정렬 없이 랜덤 50개에서 shuffle
- 재뽑기 시 이전에 빠진 레시피가 다시 나올 수 있음
- 태그 매칭 품질 제어 불가

### 5. 데이터 정확도 (Medium)
- 가격: 하드코딩 `price-dictionary.ts` → 시장 가격 괴리 구조적 미해결
- 재료 SYNONYMS 20개 미만 → 흔한 변형 누락
- 이미지: 원본 소스(식약처) 품질 자체가 낮음

### 6. 모바일 실사용성 (Low-Medium)
- 장보기 체크박스 이벤트 버블링 → 더블 토글 가능성
- `navigator.share` 미지원 (클립보드만)
- 화면 꺼짐 방지(Wake Lock) 없음

## 강점 (유지할 것)

- 추천 엔진 폴백 설계 (태그 부족 시 전체 풀 자동 확장)
- 장보기 로직의 동의어 정규화 + 양 합산 (179줄에 응집도 높음)
- URL 기반 상태 = 공유 가능한 메뉴 링크
- 디자인 시스템 완성도 (sotto 팔레트, 마이크로 인터랙션)

## 추천 액션 (우선순위)

| 순위 | 작업 | 난이도 |
|------|------|--------|
| 1 | reroll/YouTube/clipboard 에러 → toast 알림 추가 | 낮음 |
| 2 | API input validation에 zod 도입 | 낮음 |
| 3 | 클라이언트 상태 레이어 도입 (Zustand or Context) | 중간 |
| 4 | `any` 타입 제거 + Supabase generated types | 중간 |
| 5 | 추천 스코어링 로직 (태그 매칭 가중치) | 중간 |
| 6 | SYNONYMS 확장 (100개+) | 낮음 |
| 7 | navigator.share + Wake Lock API | 낮음 |
| 8 | 가격 데이터 외부 API 연동 (장기) | 높음 |

## 개별 에이전트 의견 요약

### 옹호자
MVP 출시 가능 수준. 폴백 설계, 장보기 데이터 처리, 디자인 시스템이 견고함. 보고된 이슈는 운영 중 점진 개선 가능.

### 비판자
에러 삼키기, any 타입, SYNONYMS 부족이 치명적. reroll 에러 toast, any 제거, SYNONYMS 확장이 선행 필수.

### UX 대변인
"바로 추천받기" 시 태그 누락, 재뽑기 무반응, 장보기 더블토글 버그, navigator.share 미지원. 실사용 시나리오에서 마찰 다수.

### 기술 설계자
URL params 의존 상태 관리의 한계, 런타임 스키마 폴백(42703 에러 catch)은 기술 부채. zod, 상태 레이어, 마이그레이션 완료 후 폴백 제거 권장.
