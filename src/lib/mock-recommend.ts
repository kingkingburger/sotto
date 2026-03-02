import type { ConceptTag } from '@/types/recipe';
import type { MealPlan } from '@/types/menu';
import { MOCK_RECIPES } from './mock-data';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getMockRecommendations(
  tags: ConceptTag[],
  days: 5 | 7,
  excludeIds?: string[],
  recipeIds?: string[],
): MealPlan {
  // Reconstruct from specific IDs
  if (recipeIds && recipeIds.length > 0) {
    const idMap = new Map(MOCK_RECIPES.map((r) => [r.id, r]));
    const menu = recipeIds
      .map((id, index) => ({ day: index + 1, recipe: idMap.get(id) }))
      .filter((d): d is { day: number; recipe: NonNullable<typeof d.recipe> } => d.recipe != null);
    return { menu, fallback: false };
  }

  let pool = [...MOCK_RECIPES];

  // Filter by tags if provided
  if (tags.length > 0) {
    const tagged = pool.filter((r) =>
      r.concept_tags.some((t) => tags.includes(t)),
    );
    if (tagged.length >= days) {
      pool = tagged;
    }
  }

  // Exclude IDs
  if (excludeIds && excludeIds.length > 0) {
    const excludeSet = new Set(excludeIds);
    pool = pool.filter((r) => !excludeSet.has(r.id));
  }

  const shuffled = shuffle(pool);
  const selected = shuffled.slice(0, days);

  const menu = selected.map((recipe, index) => ({
    day: index + 1,
    recipe,
  }));

  return { menu, fallback: tags.length > 0 && selected.length < days };
}
