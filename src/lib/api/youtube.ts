const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';

interface YouTubeSearchResponse {
  items?: Array<{
    id?: {
      kind: string;
      videoId?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Search YouTube for a video matching `query`.
 * Returns the videoId of the first result, or null if none found or on error.
 * Uses YOUTUBE_API_KEY from the server-side environment (never expose to client).
 */
export async function searchYouTubeVideo(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY is not set — skipping YouTube search');
    return null;
  }

  const params = new URLSearchParams({
    part: 'id',
    type: 'video',
    maxResults: '1',
    q: query,
    key: apiKey,
    relevanceLanguage: 'ko',
    regionCode: 'KR',
  });

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}?${params.toString()}`, {
      // Next.js revalidation: cache for 24h since video links are stable
      next: { revalidate: 86400 },
    } as RequestInit);

    if (!res.ok) {
      console.error(`[youtube] API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const json: YouTubeSearchResponse = await res.json();

    if (json.error) {
      console.error(`[youtube] API returned error: ${json.error.message}`);
      return null;
    }

    const videoId = json.items?.[0]?.id?.videoId ?? null;
    return videoId;
  } catch (err) {
    console.error('[youtube] Fetch failed:', err);
    return null;
  }
}
