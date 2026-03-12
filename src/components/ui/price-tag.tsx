'use client';

import type { PriceResult } from '@/types/price';

/**
 * 재료/항목 옆에 붙는 인라인 가격 태그.
 * trend 방향에 따라 ↑(빨강) / ↓(초록) 아이콘을 표시합니다.
 */
export function PriceTag({
  price,
  loading,
}: {
  price: PriceResult | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="ml-2 inline-block h-4 w-14 animate-pulse rounded bg-sotto-100" />
    );
  }

  if (!price || price.confidence < 0.3) return null;

  const trendIcon =
    price.trend?.direction === 'up'
      ? '↑'
      : price.trend?.direction === 'down'
        ? '↓'
        : null;

  const trendColor =
    price.trend?.direction === 'up'
      ? 'text-red-500'
      : price.trend?.direction === 'down'
        ? 'text-green-600'
        : '';

  return (
    <span className="ml-2 flex shrink-0 items-center gap-1 text-xs font-medium text-accent-600">
      ~{price.price.toLocaleString()}원
      {trendIcon && <span className={trendColor}>{trendIcon}</span>}
    </span>
  );
}
