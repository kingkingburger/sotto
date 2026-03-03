import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-shimmer rounded-lg bg-gradient-to-r from-sotto-200 via-sotto-100 to-sotto-200 bg-[length:200%_100%]',
        className,
      )}
    />
  );
}
