import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConceptTag } from '@/types/recipe';
import type { DayMenu, MealPlan } from '@/types/menu';
import { RECIPE_SUMMARY_FIELDS, RECIPE_SUMMARY_FIELDS_EXTENDED, LUNCHBOX_DISH_TYPES } from '@/lib/constants';

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

/**
 * Try selecting with extended fields (price_tier etc.), fall back to base fields
 * if DB migration hasn't been applied yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryRecipes(
  query: ReturnType<SupabaseClient['from']>,
  filters: {
    isLunchboxFriendly?: boolean;
    tags?: ConceptTag[];
    excludeIds?: string[];
    limit?: number;
  },
): Promise<any[]> {
  const { tags, excludeIds, limit = POOL_LIMIT } = filters;

  function applyFilters(q: ReturnType<ReturnType<SupabaseClient['from']>['select']>) {
    let filtered = q.eq('is_lunchbox_friendly', true).in('dish_type', LUNCHBOX_DISH_TYPES).limit(limit);
    if (tags && tags.length > 0) {
      filtered = filtered.overlaps('concept_tags', tags);
    }
    if (excludeIds && excludeIds.length > 0) {
      filtered = filtered.not('id', 'in', `(${excludeIds.join(',')})`);
    }
    return filtered;
  }

  // Try extended fields first
  const extended = applyFilters(query.select(RECIPE_SUMMARY_FIELDS_EXTENDED));
  const { data, error } = await extended;

  if (!error) return (data ?? []) as any[];

  // Fall back to base fields if extended columns don't exist
  if (error.code === '42703') {
    const base = applyFilters(
      query.select(RECIPE_SUMMARY_FIELDS),
    );
    const { data: baseData, error: baseError } = await base;
    if (baseError) throw new Error(`Failed to fetch recipes: ${baseError.message}`);
    return (baseData ?? []) as any[];
  }

  throw new Error(`Failed to fetch recipes: ${error.message}`);
}

export async function getRecommendations(
  supabase: SupabaseClient,
  tags: ConceptTag[],
  days: 5 | 7,
  excludeIds?: string[],
): Promise<MealPlan> {
  let fallback = false;

  // --- Primary query: tag-filtered (or all if no tags) ---
  let pool = await queryRecipes(supabase.from('recipes'), {
    tags: tags.length > 0 ? tags : undefined,
    excludeIds,
  });

  // --- Fallback: fill from all lunchbox-friendly if not enough ---
  if (pool.length < days) {
    fallback = true;

    const usedIds = [
      ...(excludeIds ?? []),
      ...pool.map((r) => r.id as string),
    ];

    const extra = await queryRecipes(supabase.from('recipes'), {
      excludeIds: usedIds.length > 0 ? usedIds : undefined,
    });

    pool = [...pool, ...extra];
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
