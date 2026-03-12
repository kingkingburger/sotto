'use client';

import { Youtube, ExternalLink } from 'lucide-react';
import { useFetch } from '@/hooks/use-fetch';

interface YouTubeSectionProps {
  recipeId: string;
  existingVideoId: string | null;
}

export function YouTubeSection({ recipeId, existingVideoId }: YouTubeSectionProps) {
  const url = existingVideoId ? null : `/api/youtube?recipeId=${recipeId}`;
  const { data, loading } = useFetch<{ videoId: string | null }>(url);
  const videoId = existingVideoId ?? data?.videoId ?? null;

  if (loading) {
    return (
      <div className="mb-8 h-16 animate-pulse rounded-2xl bg-sotto-100" />
    );
  }

  if (!videoId) return null;

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="mb-8">
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 rounded-2xl border border-sotto-200 bg-white p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
          <Youtube className="h-6 w-6 text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sotto-800">레시피 영상 보기</p>
          <p className="text-xs text-sotto-400">YouTube에서 조리 과정을 확인하세요</p>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-sotto-300 transition-colors group-hover:text-sotto-500" />
      </a>
    </div>
  );
}
