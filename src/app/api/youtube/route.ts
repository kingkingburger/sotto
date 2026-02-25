import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchYouTubeVideo } from '@/lib/api/youtube';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get('recipeId');

  if (!recipeId) {
    return NextResponse.json(
      { error: 'recipeId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    // Check DB for cached youtube_video_id
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, name, youtube_video_id, youtube_search_query')
      .eq('id', recipeId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 },
      );
    }

    // Return cached value if present
    if (recipe.youtube_video_id) {
      return NextResponse.json({ videoId: recipe.youtube_video_id });
    }

    // No YOUTUBE_API_KEY — return null gracefully
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ videoId: null });
    }

    // Search YouTube
    const searchQuery = recipe.youtube_search_query ?? `${recipe.name} 만들기 레시피`;
    let videoId: string | null = null;

    try {
      videoId = await searchYouTubeVideo(searchQuery);
    } catch (searchErr) {
      console.error('[youtube] Search error:', searchErr);
      return NextResponse.json({ videoId: null });
    }

    // Note: DB caching of youtube_video_id requires service_role key (RLS blocks writes with anon key).
    // In MVP, video IDs are cached at seed time via scripts/seed-recipes.ts.
    // Runtime searches return fresh results without caching.

    return NextResponse.json({ videoId });
  } catch (err) {
    console.error('[youtube] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube video' },
      { status: 500 },
    );
  }
}
