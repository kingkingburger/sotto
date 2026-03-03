import { NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/recommend';
import { getMockRecommendations } from '@/lib/mock-recommend';
import type { ConceptTag } from '@/types/recipe';
import { RECIPE_SUMMARY_FIELDS, RECIPE_SUMMARY_FIELDS_EXTENDED } from '@/lib/constants';

const VALID_TAGS: ConceptTag[] = ['budget', 'taste', 'volume', 'easy', 'nutrition'];
const VALID_DAYS = [5, 7];

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

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
    if (!isSupabaseConfigured()) {
      // Mock mode: return mock recipes matching IDs
      const result = getMockRecommendations([], recipeIds.length as 5 | 7, undefined, recipeIds as string[]);
      return NextResponse.json(result);
    }

    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: { data: any[] | null; error: any } = await supabase
        .from('recipes')
        .select(RECIPE_SUMMARY_FIELDS_EXTENDED)
        .in('id', recipeIds as string[]);

      // Fall back to base fields if extended columns don't exist yet
      if (result.error?.code === '42703') {
        result = await supabase
          .from('recipes')
          .select(RECIPE_SUMMARY_FIELDS)
          .in('id', recipeIds as string[]);
      }

      const { data, error } = result;

      if (error) throw error;

      // Reorder to match the requested recipeIds order
      const idList = recipeIds as string[];
      const dataMap = new Map((data ?? []).map((r) => [r.id, r]));
      const menu = idList
        .map((id, index) => ({ day: index + 1, recipe: dataMap.get(id) }))
        .filter((d): d is { day: number; recipe: NonNullable<typeof d.recipe> } => d.recipe != null);
      return NextResponse.json({ menu, fallback: false });
    } catch (err) {
      console.error('[recommend] Error fetching by IDs:', err);
      return NextResponse.json(
        { error: 'Failed to fetch recipes' },
        { status: 500 },
      );
    }
  }

  // Validate tags (empty array = random recommendation)
  const validatedTags: ConceptTag[] = [];
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (!VALID_TAGS.includes(tag as ConceptTag)) {
        return NextResponse.json(
          { error: `Invalid tag: ${tag}. Valid tags are: ${VALID_TAGS.join(', ')}` },
          { status: 400 },
        );
      }
      validatedTags.push(tag as ConceptTag);
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

  // Use mock data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    const result = getMockRecommendations(
      validatedTags,
      days as 5 | 7,
      excludeIds as string[] | undefined,
    );
    return NextResponse.json(result);
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const result = await getRecommendations(
      supabase,
      validatedTags,
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
