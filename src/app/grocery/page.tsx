'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, ChevronDown, ChevronRight, ShoppingBasket, Coins } from 'lucide-react';
import { toast } from 'sonner';
import type { GroceryResponse, GroceryCategory as GroceryCategoryData } from '@/types/grocery';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';
import { CATEGORY_EMOJI } from '@/lib/constants';

interface PriceInfo {
  price: number;
  unit: string;
  source: string;
  confidence: number;
  trend?: { direction: 'up' | 'down' | 'stable'; changePercent: number };
}

const STORAGE_KEY_PREFIX = 'sotto-grocery-checked';

function getStorageKey(ids: string): string {
  const hash = ids.split(',').sort().join(',');
  return `${STORAGE_KEY_PREFIX}:${hash}`;
}

function loadChecked(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(storageKey: string, checked: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...checked]));
  } catch {
    // ignore
  }
}

function GrocerySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-sotto-200 bg-white p-4 shadow-card">
          <Skeleton className="mb-3 h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CategorySectionProps {
  category: GroceryCategoryData;
  checked: Set<string>;
  onToggle: (key: string) => void;
  prices: Record<string, PriceInfo>;
}

function CategorySection({ category, checked, onToggle, prices }: CategorySectionProps) {
  const checkedCount = category.items.filter((item) => checked.has(`${category.category}:${item.name}`)).length;
  const allChecked = checkedCount === category.items.length;
  const [open, setOpen] = useState(!allChecked);

  const emoji = CATEGORY_EMOJI[category.category] ?? '📦';

  const categoryTotal = category.items.reduce((sum, item) => {
    const p = prices[item.name];
    return p ? sum + p.price : sum;
  }, 0);

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-card transition-all ${allChecked ? 'border-green-200 bg-green-50' : 'border-sotto-200 bg-white'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors ${allChecked ? 'hover:bg-green-100' : 'hover:bg-sotto-50'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none">{emoji}</span>
          <span className={`font-semibold ${allChecked ? 'text-sotto-400 line-through' : 'text-sotto-800'}`}>
            {category.categoryLabel}
          </span>
          <span className="rounded-full bg-sotto-100 px-2 py-0.5 text-xs font-medium text-sotto-600">
            {category.items.length}개
          </span>
        </div>
        <div className="flex items-center gap-2">
          {categoryTotal > 0 && (
            <span className="text-xs font-semibold text-accent-600">
              ~{categoryTotal.toLocaleString()}원
            </span>
          )}
          <span className={`text-xs font-medium ${allChecked ? 'text-green-600' : 'text-sotto-500'}`}>
            {checkedCount}/{category.items.length}
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-sotto-400 transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-sotto-400 transition-transform" />
          )}
        </div>
      </button>

      {open && (
        <ul className="divide-y divide-sotto-100 px-5">
          {category.items.map((item) => {
            const key = `${category.category}:${item.name}`;
            const isChecked = checked.has(key);
            return (
              <li key={key} className="py-3">
                <label className="flex cursor-pointer items-start gap-3 min-h-[44px] py-1" onClick={() => onToggle(key)}>
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="sr-only"
                      aria-label={item.name}
                    />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                        isChecked
                          ? 'border-sotto-700 bg-sotto-700 scale-95'
                          : 'border-sotto-300 bg-white'
                      }`}
                    >
                      {isChecked && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex flex-1 items-start justify-between gap-2 transition-all duration-200 ${isChecked ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div>
                      <span className={`text-sm font-medium text-sotto-800 transition-all ${isChecked ? 'line-through' : ''}`}>
                        {item.name}
                      </span>
                      {item.recipes.length > 0 && (
                        <p className="mt-0.5 text-xs text-sotto-400">
                          {item.recipes.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {item.totalAmount && (
                        <span className="text-sm text-sotto-600">{item.totalAmount}</span>
                      )}
                      {prices[item.name] && (
                        <span className="text-xs font-medium text-accent-600">
                          ~{prices[item.name].price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function GroceryPageWrapper() {
  return (
    <Suspense fallback={<GrocerySkeleton />}>
      <GroceryPage />
    </Suspense>
  );
}

function GroceryPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') ?? '';

  const [groceryData, setGroceryData] = useState<GroceryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});

  const storageKey = getStorageKey(idsParam);

  useEffect(() => {
    setChecked(loadChecked(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!idsParam) return;
    const controller = new AbortController();
    async function fetchGrocery() {
      setLoading(true);
      setError(null);
      try {
        const recipeIds = idsParam.split(',').filter(Boolean);
        const res = await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeIds }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('장보기 목록을 불러올 수 없어요');
        const data: GroceryResponse = await res.json();
        setGroceryData(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : '오류가 발생했어요';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchGrocery();
    return () => controller.abort();
  }, [idsParam]);

  // 가격 조회: grocery 데이터 로드 후
  useEffect(() => {
    if (!groceryData || groceryData.categories.length === 0) return;
    const controller = new AbortController();
    const allNames = groceryData.categories
      .flatMap((cat) => cat.items.map((item) => item.name))
      .slice(0, 30);
    if (allNames.length === 0) return;

    async function fetchPrices() {
      try {
        const res = await fetch(
          `/api/prices?names=${encodeURIComponent(allNames.join(','))}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = await res.json();
        setPrices(data.prices ?? {});
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    fetchPrices();
    return () => controller.abort();
  }, [groceryData]);

  const handleToggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      saveChecked(storageKey, next);
      return next;
    });
  }, [storageKey]);

  function buildPlainText(): string {
    if (!groceryData) return '';
    const lines: string[] = ['장보기 목록\n'];
    for (const cat of groceryData.categories) {
      lines.push(`\n[${cat.categoryLabel}]`);
      for (const item of cat.items) {
        const amt = item.totalAmount ? ` ${item.totalAmount}` : '';
        lines.push(`- ${item.name}${amt}`);
      }
    }
    return lines.join('\n');
  }

  async function handleCopy() {
    const text = buildPlainText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('클립보드 복사에 실패했어요');
    }
  }

  const totalItems = groceryData?.categories.reduce((sum, cat) => sum + cat.items.length, 0) ?? 0;
  const recipeCount = idsParam.split(',').filter(Boolean).length;
  const checkedCount = groceryData
    ? groceryData.categories.reduce(
        (sum, cat) =>
          sum + cat.items.filter((item) => checked.has(`${cat.category}:${item.name}`)).length,
        0
      )
    : 0;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const allDone = totalItems > 0 && checkedCount === totalItems;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      {/* Header */}
      <div className="mb-8">
        <BackButton label="메뉴로 돌아가기" href="/" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-sotto-800 sm:text-3xl">장보기 목록</h1>
            <p className="text-sm text-sotto-500">
              {recipeCount}일 도시락 재료 · 총 {totalItems}개 항목
            </p>
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sotto-100 to-sotto-200">
            <ShoppingBasket className="h-6 w-6 text-sotto-600" />
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      {!loading && groceryData && groceryData.categories.length > 0 && (
        <div className="mb-6 rounded-xl border border-sotto-200 bg-white p-4 shadow-card">
          {allDone && (
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-green-600">
              <Check className="h-4 w-4" strokeWidth={2.5} />
              모두 준비 완료!
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-sotto-700">진행률</span>
            <span className="text-sm text-sotto-500">{checkedCount}/{totalItems}개 완료</span>
          </div>
          <div
            className="h-2.5 rounded-full bg-sotto-200 overflow-hidden"
            role="progressbar"
            aria-valuenow={checkedCount}
            aria-valuemin={0}
            aria-valuemax={totalItems}
            aria-label="장보기 진행률"
          >
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Total estimated cost */}
      {groceryData && Object.keys(prices).length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-sotto-200 bg-gradient-to-br from-sotto-500/[0.08] to-sotto-500/[0.04] px-4 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-sotto-500" />
            <span className="text-sm font-medium text-sotto-600">총 예상 비용</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-sotto-800">
              ~{Object.values(prices).reduce((s, p) => s + p.price, 0).toLocaleString()}원
            </span>
            <span className="ml-1.5 text-xs text-sotto-500">
              ({Object.keys(prices).length}/{totalItems}개 기준)
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <GrocerySkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-card">
          <p className="text-red-700">{error}</p>
        </div>
      ) : !groceryData || groceryData.categories.length === 0 ? (
        <div className="rounded-2xl border border-sotto-200 bg-sotto-50 p-8 text-center shadow-card">
          <p className="text-sotto-500">재료 정보가 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groceryData.categories.map((cat) => (
            <CategorySection
              key={cat.category}
              category={cat}
              checked={checked}
              onToggle={handleToggle}
              prices={prices}
            />
          ))}
        </div>
      )}

      {/* Sticky action bar */}
      {!loading && groceryData && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-sotto-200/60 bg-sotto-50/85 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-[20px] backdrop-saturate-[180%]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-sotto-500 transition-colors hover:text-sotto-700"
            >
              다시 메뉴 보기
            </Link>
            <Button
              variant={copied ? 'secondary' : 'primary'}
              onClick={handleCopy}
              size="md"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  복사 완료!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  목록 복사하기
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
