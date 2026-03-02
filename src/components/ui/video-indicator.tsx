'use client';

import { clsx } from 'clsx';
import { Play } from 'lucide-react';

interface VideoIndicatorProps {
  videoId: string | null;
  onClick?: () => void;
  className?: string;
}

export function VideoIndicator({ videoId, onClick, className }: VideoIndicatorProps) {
  if (!videoId) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-1 text-xs font-medium text-white shadow-sm transition-all hover:bg-red-600 hover:scale-105',
        className,
      )}
      aria-label="레시피 영상 보기"
    >
      <Play className="h-3 w-3 fill-current" />
      영상
    </button>
  );
}
