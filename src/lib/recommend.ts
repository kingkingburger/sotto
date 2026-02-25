import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConceptTag } from '@/types/recipe';
import type { DayMenu, MealPlan } from '@/types/menu';

const RECIPE_SUMMARY_FIELDS =
  'id, name, thumbnail_url, concept_tags, dish_type, difficulty, calories, cooking_time_minutes';

const POOL_LIMIT = 50;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick `days` items from pool avoiding consecutive same dish_type.
 */
function diversify<T extends { dish_type: string }>(pool: T[], days: number): T[] {
  const picked: T[] = [];
  const remaining = [...pool];
  let lastDishType: string | null = null;

  while (picked.length < days && remaining.length > 0) {
    // Prefer item with different dish_type than previous
    const preferredIdx = remaining.findIndex((r) => r.dish_type !== lastDishType);
    const idx = preferredIdx !== -1 ? preferredIdx : 0;
    const [item] = remaining.splice(idx, 1);
    lastDishType = item.dish_type;
    picked.push(item);
  }

  return picked;
}

export async function getRecommendations(
  supabase: SupabaseClient,
  tags: ConceptTag[],
  days: 5 | 7,
  excludeIds?: string[],
): Promise<MealPlan> {
  let fallback = false;

  // --- Primary query: tag-filtered ---
  let primaryQuery = supabase
    .from('recipes')
    .select(RECIPE_SUMMARY_FIELDS)
    .eq('is_lunchbox_friendly', true)
    .overlaps('concept_tags', tags)
    .limit(POOL_LIMIT);

  if (excludeIds && excludeIds.length > 0) {
    primaryQuery = primaryQuery.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: primaryPool, error: primaryError } = await primaryQuery;

  if (primaryError) {
    throw new Error(`Failed to fetch recommendations: ${primaryError.message}`);
  }

  let pool = primaryPool ?? [];

  // --- Fallback: fill from all lunchbox-friendly if not enough ---
  if (pool.length < days) {
    fallback = true;

    const usedIds = new Set([
      ...(excludeIds ?? []),
      ...pool.map((r) => r.id as string),
    ]);

    let fallbackQuery = supabase
      .from('recipes')
      .select(RECIPE_SUMMARY_FIELDS)
      .eq('is_lunchbox_friendly', true)
      .limit(POOL_LIMIT);

    if (usedIds.size > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${[...usedIds].join(',')})`);
    }

    const { data: fallbackPool, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      throw new Error(`Failed to fetch fallback recommendations: ${fallbackError.message}`);
    }

    pool = [...pool, ...(fallbackPool ?? [])];
  }

  // Shuffle then diversify
  const shuffled = shuffle(pool);
  const selected = diversify(shuffled, days);

  // If still not enough (very small DB), just take what we have
  const menu: DayMenu[] = selected.slice(0, days).map((recipe, index) => ({
    day: index + 1,
    recipe,
  }));

  return { menu, fallback };
}
