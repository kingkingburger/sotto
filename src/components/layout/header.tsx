'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ChefHat } from 'lucide-react';

const NAV_STEPS = [
  { href: '/select', label: '태그 선택', step: 1 },
  { href: '/menu', label: '메뉴 추천', step: 2 },
  { href: '/grocery', label: '장보기', step: 3 },
] as const;

function getCurrentStep(pathname: string): number {
  if (pathname.startsWith('/grocery')) return 3;
  if (pathname.startsWith('/recipe') || pathname.startsWith('/menu')) return 2;
  if (pathname.startsWith('/select')) return 1;
  return 0;
}

export function Header() {
  const pathname = usePathname();
  const currentStep = getCurrentStep(pathname);
  const showSteps = currentStep > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-sotto-200 bg-sotto-50/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-sotto-700 transition-colors hover:text-sotto-600"
        >
          <ChefHat className="h-5 w-5" />
          Sotto
        </Link>

        {showSteps && (
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_STEPS.map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  currentStep === nav.step
                    ? 'bg-sotto-700 text-white'
                    : currentStep > nav.step
                      ? 'text-sotto-500 hover:text-sotto-700'
                      : 'text-sotto-300',
                )}
              >
                <span
                  className={clsx(
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                    currentStep === nav.step
                      ? 'bg-white/20 text-white'
                      : currentStep > nav.step
                        ? 'bg-sotto-200 text-sotto-600'
                        : 'bg-sotto-100 text-sotto-300',
                  )}
                >
                  {nav.step}
                </span>
                {nav.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
