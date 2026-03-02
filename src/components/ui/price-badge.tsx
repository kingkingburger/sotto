import { clsx } from 'clsx';
import { Coins } from 'lucide-react';

interface PriceBadgeProps {
  priceTier: number | null;
  priceConfidence: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

const tierLabels: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
};

const tierColors: Record<number, string> = {
  1: 'text-green-600 bg-green-50 border-green-200',
  2: 'text-sotto-600 bg-sotto-50 border-sotto-200',
  3: 'text-amber-600 bg-amber-50 border-amber-200',
};

export function PriceBadge({ priceTier, priceConfidence, size = 'sm', className }: PriceBadgeProps) {
  const isUnknown =
    priceTier === null || priceConfidence === null || priceConfidence < 0.5;

  if (isUnknown) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-sotto-400 bg-sotto-50 border-sotto-200',
          size === 'sm' ? 'text-xs' : 'text-sm',
          className,
        )}
      >
        <Coins className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        가격 미정
      </span>
    );
  }

  const tier = Math.max(1, Math.min(3, priceTier));

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
        size === 'sm' ? 'text-xs' : 'text-sm',
        tierColors[tier],
        className,
      )}
    >
      <Coins className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      약 {tierLabels[tier]}
    </span>
  );
}
