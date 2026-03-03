import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-accent-500 text-white font-semibold transition-all duration-200 hover:bg-accent-600 hover:shadow-accent-glow active:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-sotto-200 bg-white text-sotto-700 font-semibold transition-colors hover:bg-sotto-50 active:bg-sotto-100 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'inline-flex items-center justify-center rounded-xl text-sotto-600 font-medium transition-colors hover:bg-sotto-100 active:bg-sotto-200 disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(clsx(variantClasses[variant], sizeClasses[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
