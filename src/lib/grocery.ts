import type { SupabaseClient } from '@supabase/supabase-js';
import type { GroceryResponse, GroceryCategory, GroceryItem } from '@/types/grocery';
import type { IngredientCategory } from '@/types/recipe';
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/constants';

// Synonym normalization map
const SYNONYMS: Record<string, string> = {
  파: '대파',
  쪽파: '쪽파',
  마늘쫑: '마늘',
  다진마늘: '마늘',
  통마늘: '마늘',
  계란: '달걀',
  닭: '닭고기',
  소고기: '소고기',
  쇠고기: '소고기',
  돼지고기: '돼지고기',
  참기름: '참기름',
  들기름: '들기름',
};

function normalizeName(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return SYNONYMS[trimmed] ?? trimmed;
}

interface ParsedAmount {
  number: number;
  unit: string;
}

/**
 * Parse Korean amount strings like "200g", "1개", "2큰술", "1/2컵", "약간"
 * Returns null when amount is non-numeric (e.g., "약간", "적당량").
 */
function parseAmount(amount: string): ParsedAmount | null {
  const trimmed = amount.trim();
  // Match optional fraction or decimal followed by unit
  const match = trimmed.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*([가-힣a-zA-Z%]+)?$/);
  if (!match) return null;

  let num: number;
  const rawNum = match[1];
  if (rawNum.includes('/')) {
    const [numerator, denominator] = rawNum.split('/').map(Number);
    num = numerator / denominator;
  } else {
    num = parseFloat(rawNum);
  }

  const unit = (match[2] ?? '').trim();
  return { number: num, unit };
}

function mergeAmounts(amounts: string[]): string {
  // Group by unit and sum
  const unitMap = new Map<string, number>();
  const nonParseable: string[] = [];

  for (const amt of amounts) {
    const parsed = parseAmount(amt);
    if (parsed) {
      const existing = unitMap.get(parsed.unit) ?? 0;
      unitMap.set(parsed.unit, existing + parsed.number);
    } else {
      nonParseable.push(amt.trim());
    }
  }

  const parts: string[] = [];
  for (const [unit, total] of unitMap.entries()) {
    // Format number: drop .0 suffix if whole
    const numStr = Number.isInteger(total) ? String(total) : total.toFixed(1).replace(/\.0$/, '');
    parts.push(unit ? `${numStr}${unit}` : numStr);
  }

  const allParts = [...parts, ...nonParseable];
  return allParts.join(' + ');
}

interface RawIngredientRow {
  name: string;
  amount: string | null;
  category: IngredientCategory;
  recipe_id: string;
  recipes: { name: string }[] | null;
}

export async function generateGroceryList(
  supabase: SupabaseClient,
  recipeIds: string[],
): Promise<GroceryResponse> {
  if (recipeIds.length === 0) {
    return { categories: [] };
  }

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('name, amount, category, recipe_id, recipes(name)')
    .in('recipe_id', recipeIds);

  if (error) {
    throw new Error(`Failed to fetch ingredients: ${error.message}`);
  }

  const rows = (data ?? []) as RawIngredientRow[];

  // Keyed by normalized name: track amounts and recipe names
  const grouped = new Map<
    string,
    { amounts: string[]; recipes: Set<string>; category: IngredientCategory }
  >();

  for (const row of rows) {
    const normalizedName = normalizeName(row.name);
    const recipeName =
      row.recipes?.[0]?.name ?? row.recipe_id;

    const existing = grouped.get(normalizedName);
    if (existing) {
      if (row.amount) existing.amounts.push(row.amount);
      existing.recipes.add(recipeName);
      // Keep the most specific category (not 'other' if we already have one)
      if (existing.category === 'other' && row.category !== 'other') {
        existing.category = row.category;
      }
    } else {
      grouped.set(normalizedName, {
        amounts: row.amount ? [row.amount] : [],
        recipes: new Set([recipeName]),
        category: row.category ?? 'other',
      });
    }
  }

  // Build GroceryItem list per category
  const categoryMap = new Map<IngredientCategory, GroceryItem[]>();

  for (const [name, info] of grouped.entries()) {
    const totalAmount = info.amounts.length > 0 ? mergeAmounts(info.amounts) : '';
    const item: GroceryItem = {
      name,
      totalAmount,
      recipes: [...info.recipes],
    };

    const cat = info.category;
    const existing = categoryMap.get(cat) ?? [];
    existing.push(item);
    categoryMap.set(cat, existing);
  }

  // Build ordered categories
  const categories: GroceryCategory[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = categoryMap.get(cat);
    if (items && items.length > 0) {
      categories.push({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'ko')),
      });
    }
    categoryMap.delete(cat);
  }

  // Any leftover categories not in CATEGORY_ORDER
  for (const [cat, items] of categoryMap.entries()) {
    if (items.length > 0) {
      categories.push({
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] ?? cat,
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'ko')),
      });
    }
  }

  return { categories };
}
