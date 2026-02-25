import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ConceptTag, RecipeSummary } from '@/types/recipe';

const VALID_TAGS: ConceptTag[] = ['budget', 'taste', 'volume', 'easy', 'nutrition'];

const RECIPE_SUMMARY_FIELDS =
  'id, name, thumbnail_url, concept_tags, dish_type, difficulty, calories, cooking_time_minutes';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tags, excludeIds, dishType } = body as {
    tags?: unknown;
    excludeIds?: unknown;
    dishType?: unknown;
  };

  // Validate tags
  if (!Array.isArray(tags) || tags.length === 0) {
    return NextResponse.json(
      { error: 'tags must be a non-empty array' },
      { status: 400 },
    );
  }
  for (const tag of tags) {
    if (!VALID_TAGS.includes(tag as ConceptTag)) {
      return NextResponse.json(
        { error: `Invalid tag: ${tag}. Valid tags are: ${VALID_TAGS.join(', ')}` },
        { status: 400 },
      );
    }
  }

  // Validate excludeIds
  if (!Array.isArray(excludeIds) || excludeIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json(
      { error: 'excludeIds must be an array of strings' },
      { status: 400 },
    );
  }

  if (dishType !== undefined && dishType !== null && typeof dishType !== 'string') {
    return NextResponse.json(
      { error: 'dishType must be a string' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    // Build base query: lunchbox-friendly, overlapping tags, excluding IDs, random order
    const buildQuery = (matchDishType?: string) => {
      let q = supabase
        .from('recipes')
        .select(RECIPE_SUMMARY_FIELDS)
        .eq('is_lunchbox_friendly', true)
        .overlaps('concept_tags', tags as ConceptTag[]);

      if ((excludeIds as string[]).length > 0) {
        q = q.not('id', 'in', `(${(excludeIds as string[]).join(',')})`);
      }

      if (matchDishType) {
        q = q.eq('dish_type', matchDishType);
      }

      // Supabase doesn't support ORDER BY random() natively; use limit and shuffle client-side
      q = q.limit(20);
      return q;
    };

    // Try with dishType first if provided
    let recipe: RecipeSummary | null = null;

    if (dishType) {
      const { data, error } = await buildQuery(dishType as string);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        const idx = Math.floor(Math.random() * data.length);
        recipe = data[idx] as RecipeSummary;
      }
    }

    // Fallback to any dish type
    if (!recipe) {
      const { data, error } = await buildQuery();
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        const idx = Math.floor(Math.random() * data.length);
        recipe = data[idx] as RecipeSummary;
      }
    }

    if (!recipe) {
      return NextResponse.json(
        { error: 'No matching recipe found' },
        { status: 404 },
      );
    }

    return NextResponse.json(recipe);
  } catch (err) {
    console.error('[reroll] Error:', err);
    return NextResponse.json(
      { error: 'Failed to reroll recipe' },
      { status: 500 },
    );
  }
}
