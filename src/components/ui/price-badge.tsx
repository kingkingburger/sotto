import { clsx } from 'clsx';
import { Coins } from 'lucide-react';

interface PriceBadgeProps {
  estimatedPrice: number | null;
  priceConfidence: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    const man = Math.floor(price / 10000);
    const remainder = Math.round((price % 10000) / 1000) * 1000;
    if (remainder === 0) return `${man}만원`;
    return `${man}만 ${remainder.toLocaleString()}원`;
  }
  return `${Math.round(price / 100) * 100}원`;
}

function getPriceColor(price: number): string {
  if (price <= 5000) return 'text-green-600 bg-green-50 border-green-200';
  if (price <= 10000) return 'text-sotto-600 bg-sotto-50 border-sotto-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
}

export function PriceBadge({ estimatedPrice, priceConfidence, size = 'sm', className }: PriceBadgeProps) {
  const isUnknown =
    estimatedPrice === null || priceConfidence === null || priceConfidence < 0.5;

  if (isUnknown) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-sotto-400 bg-sotto-50 border-sotto-200',
          size === 'sm' ? 'text-xs' : 'text-sm',
          className,
        )}
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-current/10">
          <Coins className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </span>
        가격 미정
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
        size === 'sm' ? 'text-xs' : 'text-sm',
        getPriceColor(estimatedPrice),
        className,
      )}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-current/10">
        <Coins className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
      약 {formatPrice(estimatedPrice)}
    </span>
  );
}
