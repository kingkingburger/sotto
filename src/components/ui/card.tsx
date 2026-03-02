import { clsx } from 'clsx';

type CardVariant = 'default' | 'elevated' | 'interactive';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'rounded-2xl border border-sotto-200 bg-white shadow-card',
  elevated: 'rounded-2xl border border-sotto-200 bg-white shadow-elevated',
  interactive:
    'rounded-2xl border border-sotto-200 bg-white shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
};

export function Card({ children, variant = 'default', className, onClick }: CardProps) {
  return (
    <div className={clsx(variantClasses[variant], className)} onClick={onClick}>
      {children}
    </div>
  );
}
