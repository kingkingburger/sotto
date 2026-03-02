'use client';

import { useEffect, useState } from 'react';
import { Youtube } from 'lucide-react';

interface YouTubeSectionProps {
  recipeId: string;
  existingVideoId: string | null;
}

export function YouTubeSection({ recipeId, existingVideoId }: YouTubeSectionProps) {
  const [videoId, setVideoId] = useState<string | null>(existingVideoId);
  const [loading, setLoading] = useState(!existingVideoId);

  useEffect(() => {
    if (existingVideoId) return;
    async function fetchVideo() {
      try {
        const res = await fetch(`/api/youtube?recipeId=${recipeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.videoId) setVideoId(data.videoId);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [recipeId, existingVideoId]);

  if (loading) {
    return (
      <div className="mb-8 h-48 animate-pulse rounded-2xl bg-sotto-100" />
    );
  }

  if (!videoId) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-sotto-800">
        <Youtube className="h-5 w-5 text-red-500" />
        레시피 영상
      </h2>
      <div className="overflow-hidden rounded-2xl border border-sotto-200 shadow-card">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="레시피 영상"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
