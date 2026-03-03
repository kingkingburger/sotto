import { clsx } from 'clsx';

interface BadgeProps {
  label: string;
  colorClass?: string;
  className?: string;
}

export function Badge({ label, colorClass, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colorClass ?? 'bg-gradient-to-r from-sotto-100 to-sotto-50 text-sotto-700 border-sotto-200',
        className,
      )}
    >
      {label}
    </span>
  );
}
