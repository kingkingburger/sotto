import { NextResponse } from 'next/server';
import { getRecommendations, queryRecipesByIds } from '@/lib/recommend';
import { getMockRecommendations } from '@/lib/mock-recommend';
import { recommendRequestSchema } from '@/lib/schemas';
import { parseRequestBody } from '@/lib/api-utils';

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export async function POST(request: Request) {
  const result = await parseRequestBody(request, recommendRequestSchema);
  if (result.error) return result.error;

  const { tags, days, excludeIds, recipeIds } = result.data;

  // If recipeIds provided, fetch those specific recipes (for URL reconstruction)
  if (recipeIds && recipeIds.length > 0) {
    if (!isSupabaseConfigured()) {
      const result = getMockRecommendations([], recipeIds.length as 5 | 7, undefined, recipeIds);
      return NextResponse.json(result);
    }

    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const data = await queryRecipesByIds(supabase, recipeIds);

      const dataMap = new Map(data.map((r) => [r.id, r]));
      const menu = recipeIds
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

  // Use mock data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    const result = getMockRecommendations(tags, days, excludeIds);
    return NextResponse.json(result);
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const result = await getRecommendations(supabase, tags, days, excludeIds);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[recommend] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 },
    );
  }
}
