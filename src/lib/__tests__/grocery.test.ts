/**
 * grocery.ts 유닛 테스트
 *
 * Supabase 클라이언트를 vi.fn()으로 모킹해 DB 없이 로직만 검증.
 * 테스트 대상: normalizeName, parseAmount, mergeAmounts, generateGroceryList.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateGroceryList } from '@/lib/grocery';

// ── Supabase 클라이언트 모킹 헬퍼 ────────────────────────────────────
function makeSupabaseMock(rows: unknown[]) {
  const selectMock = vi.fn().mockReturnValue({
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  });
  return {
    from: vi.fn().mockReturnValue({ select: selectMock }),
  } as unknown as SupabaseClient;
}

function makeErrorSupabaseMock(message: string) {
  const selectMock = vi.fn().mockReturnValue({
    in: vi.fn().mockResolvedValue({ data: null, error: { message } }),
  });
  return {
    from: vi.fn().mockReturnValue({ select: selectMock }),
  } as unknown as SupabaseClient;
}

// ── generateGroceryList — 빈 입력 ────────────────────────────────────
describe('generateGroceryList — 빈 입력', () => {
  it('recipeIds가 빈 배열이면 categories가 빈 배열을 반환한다', async () => {
    const supabase = makeSupabaseMock([]);
    const result = await generateGroceryList(supabase, []);
    expect(result.categories).toEqual([]);
  });
});

// ── generateGroceryList — DB 에러 ────────────────────────────────────
describe('generateGroceryList — DB 에러', () => {
  it('Supabase 에러 시 Error를 throw한다', async () => {
    const supabase = makeErrorSupabaseMock('connection refused');
    await expect(
      generateGroceryList(supabase, ['recipe-1']),
    ).rejects.toThrow('connection refused');
  });
});

// ── generateGroceryList — 단일 레시피 ────────────────────────────────
describe('generateGroceryList — 단일 레시피', () => {
  const rows = [
    { name: '양파', amount: '200g', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: '된장찌개' }] },
    { name: '두부', amount: '1모', category: 'tofu', recipe_id: 'r1', recipes: [{ name: '된장찌개' }] },
    { name: '대파', amount: '1/2대', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: '된장찌개' }] },
  ];

  it('카테고리별로 그룹핑된다', async () => {
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const cats = result.categories.map((c) => c.category);
    expect(cats).toContain('vegetable');
    expect(cats).toContain('tofu');
  });

  it('각 카테고리에 categoryLabel이 설정된다', async () => {
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    for (const cat of result.categories) {
      expect(typeof cat.categoryLabel).toBe('string');
      expect(cat.categoryLabel.length).toBeGreaterThan(0);
    }
  });

  it('items가 이름 오름차순으로 정렬된다', async () => {
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    expect(vegCat).toBeDefined();
    // 대파, 양파 — 가나다순
    expect(vegCat!.items[0].name).toBe('대파');
    expect(vegCat!.items[1].name).toBe('양파');
  });

  it('recipes 배열에 레시피명이 포함된다', async () => {
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const allRecipeNames = result.categories
      .flatMap((c) => c.items)
      .flatMap((i) => i.recipes);
    expect(allRecipeNames).toContain('된장찌개');
  });
});

// ── 동의어 정규화 ────────────────────────────────────────────────────
describe('generateGroceryList — 동의어 정규화', () => {
  it('계란과 달걀이 달걀로 합쳐진다', async () => {
    const rows = [
      { name: '계란', amount: '2개', category: 'egg', recipe_id: 'r1', recipes: [{ name: '레시피A' }] },
      { name: '달걀', amount: '3개', category: 'egg', recipe_id: 'r2', recipes: [{ name: '레시피B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const eggCat = result.categories.find((c) => c.category === 'egg');
    expect(eggCat).toBeDefined();
    // 계란→달걀 정규화로 하나로 합쳐짐
    expect(eggCat!.items.length).toBe(1);
    expect(eggCat!.items[0].name).toBe('달걀');
  });

  it('파가 대파로 정규화된다', async () => {
    const rows = [
      { name: '파', amount: '1대', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: '레시피A' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    expect(vegCat!.items[0].name).toBe('대파');
  });

  it('소고기와 쇠고기가 소고기로 합쳐진다', async () => {
    const rows = [
      { name: '소고기', amount: '100g', category: 'meat', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '쇠고기', amount: '200g', category: 'meat', recipe_id: 'r2', recipes: [{ name: 'B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const meatCat = result.categories.find((c) => c.category === 'meat');
    expect(meatCat!.items.length).toBe(1);
    expect(meatCat!.items[0].name).toBe('소고기');
  });
});

// ── 수량 합산 (mergeAmounts) ─────────────────────────────────────────
describe('generateGroceryList — 수량 합산', () => {
  it('같은 단위 수량이 합산된다 (200g + 300g = 500g)', async () => {
    const rows = [
      { name: '양파', amount: '200g', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '양파', amount: '300g', category: 'vegetable', recipe_id: 'r2', recipes: [{ name: 'B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    expect(vegCat!.items[0].totalAmount).toBe('500g');
  });

  it('분수 표기 수량이 합산된다 (1/2 + 1/2 = 1)', async () => {
    const rows = [
      { name: '양배추', amount: '1/2개', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '양배추', amount: '1/2개', category: 'vegetable', recipe_id: 'r2', recipes: [{ name: 'B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    expect(vegCat!.items[0].totalAmount).toBe('1개');
  });

  it('단위가 다른 수량은 + 로 연결된다', async () => {
    const rows = [
      { name: '마늘', amount: '3쪽', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '마늘', amount: '1큰술', category: 'vegetable', recipe_id: 'r2', recipes: [{ name: 'B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    expect(vegCat!.items[0].totalAmount).toContain('+');
  });

  it('amount가 null인 재료는 totalAmount가 빈 문자열이다', async () => {
    const rows = [
      { name: '소금', amount: null, category: 'seasoning', recipe_id: 'r1', recipes: [{ name: 'A' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const seasoningCat = result.categories.find((c) => c.category === 'seasoning');
    expect(seasoningCat!.items[0].totalAmount).toBe('');
  });

  it('"약간" 같은 비수치 수량은 그대로 표시된다', async () => {
    const rows = [
      { name: '소금', amount: '약간', category: 'seasoning', recipe_id: 'r1', recipes: [{ name: 'A' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const seasoningCat = result.categories.find((c) => c.category === 'seasoning');
    expect(seasoningCat!.items[0].totalAmount).toBe('약간');
  });
});

// ── 카테고리 우선순위 순서 ────────────────────────────────────────────
describe('generateGroceryList — 카테고리 순서', () => {
  it('meat이 vegetable보다 앞에 온다 (CATEGORY_ORDER 기준)', async () => {
    const rows = [
      { name: '양파', amount: '1개', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '닭고기', amount: '200g', category: 'meat', recipe_id: 'r1', recipes: [{ name: 'A' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1']);
    const catOrder = result.categories.map((c) => c.category);
    expect(catOrder.indexOf('meat')).toBeLessThan(catOrder.indexOf('vegetable'));
  });
});

// ── 여러 레시피에 걸친 재료 병합 ─────────────────────────────────────
describe('generateGroceryList — 멀티 레시피 병합', () => {
  it('같은 재료의 recipes 배열에 여러 레시피가 포함된다', async () => {
    const rows = [
      { name: '대파', amount: '1/2대', category: 'vegetable', recipe_id: 'r1', recipes: [{ name: '된장찌개' }] },
      { name: '대파', amount: '1대', category: 'vegetable', recipe_id: 'r2', recipes: [{ name: '순두부찌개' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    const vegCat = result.categories.find((c) => c.category === 'vegetable');
    const daePa = vegCat!.items.find((i) => i.name === '대파');
    expect(daePa!.recipes).toContain('된장찌개');
    expect(daePa!.recipes).toContain('순두부찌개');
  });

  it('카테고리가 other인 경우 더 구체적인 카테고리로 덮어씌워진다', async () => {
    const rows = [
      { name: '달걀', amount: '2개', category: 'other', recipe_id: 'r1', recipes: [{ name: 'A' }] },
      { name: '달걀', amount: '1개', category: 'egg', recipe_id: 'r2', recipes: [{ name: 'B' }] },
    ];
    const supabase = makeSupabaseMock(rows);
    const result = await generateGroceryList(supabase, ['r1', 'r2']);
    // 계란→달걀 동의어 처리 후 egg 카테고리로 분류되어야 함
    const eggCat = result.categories.find((c) => c.category === 'egg');
    expect(eggCat).toBeDefined();
    expect(eggCat!.items[0].name).toBe('달걀');
  });
});
