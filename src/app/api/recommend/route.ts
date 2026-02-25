import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecommendations } from '@/lib/recommend';
import type { ConceptTag } from '@/types/recipe';

const VALID_TAGS: ConceptTag[] = ['budget', 'taste', 'volume', 'easy', 'nutrition'];
const VALID_DAYS = [5, 7];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tags, days, excludeIds, recipeIds } = body as {
    tags?: unknown;
    days?: unknown;
    excludeIds?: unknown;
    recipeIds?: unknown;
  };

  // If recipeIds provided, fetch those specific recipes (for URL reconstruction)
  if (Array.isArray(recipeIds) && recipeIds.length > 0) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, thumbnail_url, concept_tags, dish_type, difficulty, calories, cooking_time_minutes')
        .in('id', recipeIds as string[]);

      if (error) throw error;

      const menu = (data ?? []).map((recipe, index) => ({
        day: index + 1,
        recipe,
      }));
      return NextResponse.json({ menu, fallback: false });
    } catch (err) {
      console.error('[recommend] Error fetching by IDs:', err);
      return NextResponse.json(
        { error: 'Failed to fetch recipes' },
        { status: 500 },
      );
    }
  }

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

  // Validate days
  if (!VALID_DAYS.includes(days as number)) {
    return NextResponse.json(
      { error: 'days must be 5 or 7' },
      { status: 400 },
    );
  }

  // Validate excludeIds
  if (excludeIds !== undefined && excludeIds !== null) {
    if (!Array.isArray(excludeIds) || excludeIds.some((id) => typeof id !== 'string')) {
      return NextResponse.json(
        { error: 'excludeIds must be an array of strings' },
        { status: 400 },
      );
    }
  }

  try {
    const supabase = await createClient();
    const result = await getRecommendations(
      supabase,
      tags as ConceptTag[],
      days as 5 | 7,
      excludeIds as string[] | undefined,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error('[recommend] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 },
    );
  }
}
