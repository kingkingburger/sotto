# 코드 정리 + 배포 준비 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 중복 코드 제거, 일관성 확보, Vercel 배포 준비

**Architecture:** constants.ts로 공유 상수 통합, scripts/lib/load-env.ts로 .env 로딩 DRY, useEffect fetch에 AbortController 일관 적용, vercel.json으로 배포 설정

**Tech Stack:** Next.js 15, Bun, Vercel

---

### Task 1: CATEGORY_EMOJI를 constants.ts로 추출

**Files:**
- Modify: `src/lib/constants.ts:69` (끝에 추가)
- Modify: `src/app/grocery/page.tsx:13-26` (로컬 정의 제거 → import)
- Modify: `src/app/recipe/[id]/ingredients-section.tsx:23-36` (로컬 정의 제거 → import)

**Step 1: constants.ts에 CATEGORY_EMOJI 추가**

`src/lib/constants.ts` 맨 끝에 추가:

```typescript
export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  vegetable: '🥬',
  meat: '🥩',
  seafood: '🐟',
  dairy: '🥛',
  grain: '🌾',
  seasoning: '🧂',
  sauce: '🫙',
  noodle: '🍜',
  tofu: '🫘',
  egg: '🥚',
  oil: '🫒',
  other: '📦',
};
```

**Step 2: grocery/page.tsx에서 로컬 정의 제거 + import 추가**

삭제: lines 13-26 (`const CATEGORY_EMOJI: Record<string, string> = { ... };`)

import 추가:
```typescript
import { CATEGORY_EMOJI } from '@/lib/constants';
```

**Step 3: ingredients-section.tsx에서 로컬 정의 제거 + import 추가**

삭제: lines 23-36 (`const INGREDIENT_EMOJI: Record<string, string> = { ... };`)

import 수정 (기존 import에 CATEGORY_EMOJI 추가):
```typescript
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_EMOJI } from '@/lib/constants';
```

사용처 변경: line 102의 `INGREDIENT_EMOJI[cat]` → `CATEGORY_EMOJI[cat]`, line 118의 `{emoji}` 변수는 이미 해당 값을 참조하므로 변수명만 확인.

**Step 4: 빌드 검증**

Run: `bun run build`
Expected: 빌드 성공, 타입 에러 없음

**Step 5: Commit**

```bash
git add src/lib/constants.ts src/app/grocery/page.tsx src/app/recipe/\[id\]/ingredients-section.tsx
git commit -m "refactor: CATEGORY_EMOJI 중복 제거 → constants.ts로 통합"
```

---

### Task 2: scripts .env 로딩 통합

**Files:**
- Create: `scripts/lib/load-env.ts`
- Modify: `scripts/classify-tags.ts:1-18`
- Modify: `scripts/parse-ingredients.ts:1-20`
- Modify: `scripts/seed-recipes.ts:1-18`
- Modify: `scripts/seed-youtube.ts:1-23`
- Modify: `scripts/test-naver-price.ts:1-22`

**Step 1: scripts/lib/ 디렉토리 생성 + load-env.ts 작성**

```bash
mkdir -p scripts/lib
```

`scripts/lib/load-env.ts`:

```typescript
/**
 * .env.local 로딩 — dotenv 없이 수동 파싱
 * side-effect import로 사용: import './lib/load-env';
 */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
      .split('#')[0]
      .trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}
```

Note: `split('#')[0].trim()`으로 inline comment stripping 포함 (test-naver-price.ts 패턴 통합).

**Step 2: classify-tags.ts 수정**

삭제: lines 2-18 (fs, path import + .env 로딩 블록)

추가 (line 2, createClient import 아래):
```typescript
import './lib/load-env';
```

**Step 3: parse-ingredients.ts 수정**

삭제: lines 2-3 (fs, path import) + lines 7-20 (.env 로딩 블록)

추가 (line 2):
```typescript
import './lib/load-env';
```

**Step 4: seed-recipes.ts 수정**

삭제: lines 2-3 (fs, path import) + lines 5-18 (.env 로딩 블록)

추가 (line 2):
```typescript
import './lib/load-env';
```

**Step 5: seed-youtube.ts 수정**

삭제: lines 2-3 (fs, path import) + lines 7-23 (.env 로딩 블록)

추가 (line 2):
```typescript
import './lib/load-env';
```

Note: seed-youtube.ts는 `parseIngredients` import 때문에 fs/path를 사용하지 않으므로 fs/path import도 제거 가능. 단, 스크립트 내에서 fs/path를 다른 곳에서 사용하는지 확인 필요 → 사용하지 않으므로 제거.

**Step 6: test-naver-price.ts 수정**

삭제: lines 6-7 (fs, path import) + lines 9-22 (.env 로딩 블록)

추가 (line 1 또는 기존 import 전):
```typescript
import './lib/load-env';
```

**Step 7: 빌드 검증**

Run: `bun run build`
Expected: 빌드 성공

**Step 8: Commit**

```bash
git add scripts/lib/load-env.ts scripts/classify-tags.ts scripts/parse-ingredients.ts scripts/seed-recipes.ts scripts/seed-youtube.ts scripts/test-naver-price.ts
git commit -m "refactor: scripts .env 로딩 중복 제거 → scripts/lib/load-env.ts로 통합"
```

---

### Task 3: AbortController 추가

**Files:**
- Modify: `src/app/grocery/page.tsx:189-213`
- Modify: `src/app/recipe/[id]/youtube-section.tsx:16-31`

**Step 1: grocery/page.tsx useEffect에 AbortController 추가**

기존 (lines 189-213):
```typescript
useEffect(() => {
  if (!idsParam) return;
  async function fetchGrocery() {
    setLoading(true);
    setError(null);
    try {
      const recipeIds = idsParam.split(',').filter(Boolean);
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeIds }),
      });
      if (!res.ok) throw new Error('장보기 목록을 불러올 수 없어요');
      const data: GroceryResponse = await res.json();
      setGroceryData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했어요';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }
  fetchGrocery();
}, [idsParam]);
```

변경:
```typescript
useEffect(() => {
  if (!idsParam) return;
  const controller = new AbortController();
  async function fetchGrocery() {
    setLoading(true);
    setError(null);
    try {
      const recipeIds = idsParam.split(',').filter(Boolean);
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeIds }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('장보기 목록을 불러올 수 없어요');
      const data: GroceryResponse = await res.json();
      setGroceryData(data);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : '오류가 발생했어요';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }
  fetchGrocery();
  return () => controller.abort();
}, [idsParam]);
```

**Step 2: youtube-section.tsx useEffect에 AbortController 추가**

기존 (lines 16-31):
```typescript
useEffect(() => {
  if (existingVideoId) return;
  async function fetchVideo() {
    try {
      const res = await fetch(`/api/youtube?recipeId=${recipeId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.videoId) setVideoId(data.videoId);
    } catch {
      toast.error('영상 정보를 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  }
  fetchVideo();
}, [recipeId, existingVideoId]);
```

변경:
```typescript
useEffect(() => {
  if (existingVideoId) return;
  const controller = new AbortController();
  async function fetchVideo() {
    try {
      const res = await fetch(`/api/youtube?recipeId=${recipeId}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.videoId) setVideoId(data.videoId);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      toast.error('영상 정보를 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  }
  fetchVideo();
  return () => controller.abort();
}, [recipeId, existingVideoId]);
```

**Step 3: 빌드 검증**

Run: `bun run build`
Expected: 빌드 성공

**Step 4: Commit**

```bash
git add src/app/grocery/page.tsx src/app/recipe/\[id\]/youtube-section.tsx
git commit -m "fix: useEffect fetch에 AbortController 추가 (grocery, youtube)"
```

---

### Task 4: 배포 설정 (Vercel)

**Files:**
- Create: `vercel.json`
- Modify: `.env.local.example`

**Step 1: vercel.json 생성**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install"
}
```

**Step 2: .env.local.example 업데이트**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=              # scripts(seed, classify-tags, parse-ingredients)에서 사용

# External APIs
FOODSAFETY_API_KEY=           # 식약처 COOKRCP01 인증키
YOUTUBE_API_KEY=              # YouTube Data API v3 key
NAVER_CLIENT_ID=              # 네이버 쇼핑 API (가격 조회)
NAVER_CLIENT_SECRET=          # 네이버 쇼핑 API (가격 조회)

# Phase 2 (가격 모니터링 — API 키 발급 후 추가)
# KAMIS_CERT_KEY=             # KAMIS API 인증키
# KAMIS_CERT_ID=              # KAMIS 요청자 ID
# DATA_GO_KR_API_KEY=         # 공공데이터포털 API 키
```

Note: `AI_API_KEY` 제거 (사용하지 않음), `NEXT_PUBLIC_SITE_URL` 제거 (코드에서 사용하지 않음), `NAVER_CLIENT_ID/SECRET` 추가, Phase 2 키 주석으로 준비.

**Step 3: Commit**

```bash
git add vercel.json .env.local.example
git commit -m "chore: Vercel 배포 설정 + .env.local.example 정리"
```

---

### Task 5: 최종 빌드 검증 + 배포

**Step 1: 전체 빌드**

Run: `bun run build`
Expected: 빌드 성공, 타입 에러 없음

**Step 2: 로컬 테스트 (선택)**

Run: `bun dev`
확인 사항:
- 메인 페이지 로딩
- 레시피 상세 페이지 재료 + 가격
- 장보기 목록

**Step 3: Vercel 배포**

```bash
bun add -g vercel   # 아직 없으면
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add NAVER_CLIENT_ID
vercel env add NAVER_CLIENT_SECRET
vercel env add YOUTUBE_API_KEY
vercel --prod
```
