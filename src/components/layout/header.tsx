'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

const STEPS = [
  { href: '/', label: '메뉴', step: 1 },
  { href: '/grocery', label: '장보기', step: 2 },
] as const;

function getCurrentStep(pathname: string): number {
  if (pathname.startsWith('/grocery')) return 2;
  if (pathname === '/' || pathname.startsWith('/recipe')) return 1;
  return 1;
}

function showProgressBar(pathname: string): boolean {
  return pathname.startsWith('/grocery');
}

export function Header() {
  const pathname = usePathname();
  const currentStep = getCurrentStep(pathname);
  const showProgress = showProgressBar(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-sotto-200/60 bg-sotto-50/85 backdrop-blur-[20px] backdrop-saturate-[180%]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight-md text-sotto-800 transition-colors hover:text-sotto-600"
        >
          Sotto
        </Link>

        {showProgress && (
          <nav className="flex items-center gap-0" aria-label="진행 단계">
            {STEPS.map((step, index) => {
              const isDone = currentStep > step.step;
              const isActive = currentStep === step.step;
              const isFuture = currentStep < step.step;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.href} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={clsx(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isDone && 'bg-accent-400 text-white',
                        isActive && 'bg-accent-500 text-white',
                        isFuture && 'bg-sotto-200 text-sotto-400',
                      )}
                    >
                      {isDone ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        step.step
                      )}
                    </div>
                    <span
                      className={clsx(
                        'text-xs leading-none',
                        isDone && 'text-accent-400',
                        isActive && 'font-semibold text-accent-500',
                        isFuture && 'text-sotto-400',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {!isLast && (
                    <div
                      className={clsx(
                        'mb-4 h-0.5 w-8 transition-colors',
                        isDone ? 'bg-accent-400' : 'bg-sotto-200',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
