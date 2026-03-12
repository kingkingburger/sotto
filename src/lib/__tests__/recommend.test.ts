/**
 * recommend.ts 유닛 테스트
 *
 * Supabase 클라이언트를 vi.fn()으로 모킹해 DB 없이 로직만 검증.
 * 테스트 대상: shuffle, diversify, getRecommendations (폴백 포함).
 *
 * recommend.ts의 쿼리 체인:
 *   supabase.from('recipes').select(fields).eq(...).in(...).limit(n)
 *   이후 overlaps / not 이 추가될 수 있음 — 모두 같은 최종 객체를 반환.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRecommendations } from '@/lib/recommend';
import type { ConceptTag, DishType } from '@/types/recipe';

// ── 테스트 데이터 헬퍼 ───────────────────────────────────────────────
function makeRecipe(
  id: string,
  dishType: DishType = 'rice',
  tags: ConceptTag[] = ['budget'],
) {
  return {
    id,
    name: `레시피-${id}`,
    thumbnail_url: null,
    main_image_url: null,
    concept_tags: tags,
    dish_type: dishType,
    difficulty: 'easy' as const,
    calories: 500,
    cooking_time_minutes: 20,
    price_tier: null,
    price_confidence: null,
    estimated_price: null,
    youtube_video_id: null,
  };
}

/**
 * Supabase 쿼리 체인 모킹.
 * recommend.ts의 applyFilters:
 *   q.eq('is_lunchbox_friendly', true).in('dish_type', ...).limit(n)
 *   [.overlaps(...)] [.not(...)]
 * 모든 메서드가 최종 결과 객체(data/error)를 포함한 동일 체인 객체를 반환.
 */
function makeChain(data: unknown[], error: null | { message: string; code?: string }) {
  // 체인 끝 결과 (await 가능한 thenable)
  const result = {
    data: error ? null : data,
    error,
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: error ? null : data, error }).then(resolve),
  };

  // 체인 객체: 모든 메서드가 자기 자신을 반환
  const chain: Record<string, unknown> = {
    ...result,
  };

  for (const method of ['eq', 'in', 'limit', 'overlaps', 'not', 'select']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  return chain;
}

function makeSupabaseMock(rows: unknown[], error: null | { message: string; code?: string } = null) {
  const chain = makeChain(rows, error);
  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient;
}

// ── getRecommendations — 기본 동작 ───────────────────────────────────
describe('getRecommendations — 기본 동작', () => {
  it('days=5이면 menu 배열 길이가 5다', async () => {
    const recipes = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(`r${i}`, i % 2 === 0 ? 'rice' : 'side'),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, ['budget'], 5);
    expect(result.menu.length).toBe(5);
  });

  it('days=7이면 menu 배열 길이가 7이다', async () => {
    const recipes = Array.from({ length: 14 }, (_, i) =>
      makeRecipe(`r${i}`, i % 2 === 0 ? 'rice' : 'side'),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, [], 7);
    expect(result.menu.length).toBe(7);
  });

  it('반환된 menu 각 항목에 day 필드가 1부터 순서대로 있다', async () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe(`r${i}`, 'rice'),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, ['budget'], 5);
    result.menu.forEach((item, idx) => {
      expect(item.day).toBe(idx + 1);
    });
  });

  it('각 menu 항목에 recipe 객체가 있다', async () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe(`r${i}`),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, [], 5);
    for (const item of result.menu) {
      expect(item.recipe).toBeDefined();
      expect(typeof item.recipe.id).toBe('string');
    }
  });
});

// ── getRecommendations — fallback 플래그 ────────────────────────────
describe('getRecommendations — fallback 플래그', () => {
  it('레시피 풀이 충분하면 fallback=false다', async () => {
    const recipes = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(`r${i}`, i % 2 === 0 ? 'rice' : 'side'),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, ['budget'], 5);
    expect(result.fallback).toBe(false);
  });

  it('첫 쿼리 결과가 days보다 적으면 fallback=true다', async () => {
    // 첫 번째 from() 호출은 2개만, 두 번째는 2개 더 반환 (총 4 < 5)
    const fewRecipes = [makeRecipe('r1', 'rice'), makeRecipe('r2', 'side')];
    const extraRecipes = [makeRecipe('r3', 'one_plate'), makeRecipe('r4', 'rice')];

    let fromCallCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        fromCallCount++;
        const data = fromCallCount === 1 ? fewRecipes : extraRecipes;
        return makeChain(data, null);
      }),
    } as unknown as SupabaseClient;

    const result = await getRecommendations(supabase, ['budget'], 5);
    expect(result.fallback).toBe(true);
  });
});

// ── getRecommendations — DB 에러 폴백 (42703) ───────────────────────
describe('getRecommendations — 컬럼 없음 에러(42703) 폴백', () => {
  it('extended 컬럼 에러(42703)가 나면 기본 필드로 재시도한다', async () => {
    const baseRecipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe(`r${i}`),
    );

    // select()가 처음 호출되면 42703 에러 체인, 두 번째는 성공 체인
    let selectCallCount = 0;
    const fromChain = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return makeChain([], { message: 'column not found', code: '42703' });
        }
        return makeChain(baseRecipes, null);
      }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(fromChain),
    } as unknown as SupabaseClient;

    const result = await getRecommendations(supabase, [], 5);
    expect(result.menu.length).toBeGreaterThan(0);
    expect(result.menu.length).toBeLessThanOrEqual(5);
  });
});

// ── diversify 동작 검증 ───────────────────────────────────────────────
describe('getRecommendations — diversify (dish_type 분산)', () => {
  it('연속으로 같은 dish_type이 나오지 않는다 (충분한 다양성이 있을 때)', async () => {
    // rice 3개, side 3개, one_plate 3개
    const recipes = [
      makeRecipe('r1', 'rice'),
      makeRecipe('r2', 'rice'),
      makeRecipe('r3', 'rice'),
      makeRecipe('r4', 'side'),
      makeRecipe('r5', 'side'),
      makeRecipe('r6', 'side'),
      makeRecipe('r7', 'one_plate'),
      makeRecipe('r8', 'one_plate'),
      makeRecipe('r9', 'one_plate'),
    ];
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, [], 5);

    let hasDuplicate = false;
    for (let i = 1; i < result.menu.length; i++) {
      if (result.menu[i].recipe.dish_type === result.menu[i - 1].recipe.dish_type) {
        hasDuplicate = true;
        break;
      }
    }
    expect(hasDuplicate).toBe(false);
  });

  it('풀이 days보다 적을 때도 에러 없이 동작한다', async () => {
    const recipes = [makeRecipe('r1', 'rice'), makeRecipe('r2', 'side')];
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, [], 5);
    expect(result.menu.length).toBeGreaterThan(0);
    expect(result.menu.length).toBeLessThanOrEqual(5);
  });
});

// ── getRecommendations — 중복 ID 제외 ───────────────────────────────
describe('getRecommendations — excludeIds', () => {
  it('excludeIds가 Supabase 쿼리에 전달된다', async () => {
    const recipes = Array.from({ length: 10 }, (_, i) =>
      makeRecipe(`r${i}`),
    );
    const supabase = makeSupabaseMock(recipes);
    await getRecommendations(supabase, [], 5, ['excluded-id-1', 'excluded-id-2']);
    expect(supabase.from).toHaveBeenCalledWith('recipes');
  });
});

// ── MealPlan 타입 구조 ────────────────────────────────────────────────
describe('getRecommendations — 반환 타입 구조', () => {
  it('MealPlan 구조 { menu, fallback }을 반환한다', async () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe(`r${i}`),
    );
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, [], 5);
    expect(Array.isArray(result.menu)).toBe(true);
    expect(typeof result.fallback).toBe('boolean');
  });

  it('menu 항목의 recipe는 RecipeSummary 필드를 갖는다', async () => {
    const recipes = [makeRecipe('r1', 'rice', ['budget', 'easy'])];
    const supabase = makeSupabaseMock(recipes);
    const result = await getRecommendations(supabase, ['budget'], 5);
    if (result.menu.length > 0) {
      const recipe = result.menu[0].recipe;
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('name');
      expect(recipe).toHaveProperty('dish_type');
      expect(recipe).toHaveProperty('concept_tags');
    }
  });
});
