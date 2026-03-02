'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Copy, Check, ChevronDown, ChevronRight, ShoppingBasket, ArrowLeft } from 'lucide-react';
import type { GroceryResponse, GroceryCategory as GroceryCategoryData } from '@/types/grocery';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const STORAGE_KEY_PREFIX = 'sotto-grocery-checked';

function getStorageKey(ids: string): string {
  // Use a simple hash of recipe IDs to scope checked state per menu
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
        <div key={i} className="rounded-2xl border border-sotto-200 bg-white p-4">
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
}

function CategorySection({ category, checked, onToggle }: CategorySectionProps) {
  const [open, setOpen] = useState(true);
  const checkedCount = category.items.filter((item) => checked.has(`${category.category}:${item.name}`)).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-sotto-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-sotto-50"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sotto-800">{category.categoryLabel}</span>
          <span className="rounded-full bg-sotto-100 px-2 py-0.5 text-xs font-medium text-sotto-600">
            {category.items.length}개
          </span>
          {checkedCount > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {checkedCount} 완료
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-sotto-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-sotto-400" />
        )}
      </button>

      {open && (
        <ul className="divide-y divide-sotto-100 px-5">
          {category.items.map((item) => {
            const key = `${category.category}:${item.name}`;
            const isChecked = checked.has(key);
            return (
              <li key={key} className="py-3">
                <label className="flex cursor-pointer items-start gap-3" onClick={() => onToggle(key)}>
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(key)}
                      className="sr-only"
                      aria-label={item.name}
                    />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                        isChecked
                          ? 'border-sotto-700 bg-sotto-700'
                          : 'border-sotto-300 bg-white'
                      }`}
                    >
                      {isChecked && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex flex-1 items-start justify-between gap-2 transition-opacity ${isChecked ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div>
                      <span className={`text-sm font-medium text-sotto-800 ${isChecked ? 'line-through' : ''}`}>
                        {item.name}
                      </span>
                      {item.recipes.length > 0 && (
                        <p className="mt-0.5 text-xs text-sotto-400">
                          {item.recipes.join(', ')}
                        </p>
                      )}
                    </div>
                    {item.totalAmount && (
                      <span className="flex-shrink-0 text-sm text-sotto-600">{item.totalAmount}</span>
                    )}
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
  const router = useRouter();
  const idsParam = searchParams.get('ids') ?? '';

  const [groceryData, setGroceryData] = useState<GroceryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const storageKey = getStorageKey(idsParam);

  useEffect(() => {
    setChecked(loadChecked(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!idsParam) return;
    async function fetchGrocery() {
      setLoading(true);
      setError(null);
      try {
        const recipeIds = idsParam.split(',').filter(Boolean);
        const res = await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeIds }),
        });
        if (!res.ok) throw new Error('장보기 목록을 불러올 수 없어요');
        const data: GroceryResponse = await res.json();
        setGroceryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    }
    fetchGrocery();
  }, [idsParam]);

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
      // fallback: do nothing
    }
  }

  const totalItems = groceryData?.categories.reduce((sum, cat) => sum + cat.items.length, 0) ?? 0;
  const recipeCount = idsParam.split(',').filter(Boolean).length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-sotto-500 hover:text-sotto-700"
        >
          <ArrowLeft className="h-4 w-4" />
          메뉴로 돌아가기
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-sotto-800 sm:text-3xl">장보기 목록</h1>
            <p className="text-sm text-sotto-500">
              {recipeCount}일 도시락 재료 · 총 {totalItems}개 항목
            </p>
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sotto-100">
            <ShoppingBasket className="h-6 w-6 text-sotto-600" />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GrocerySkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : !groceryData || groceryData.categories.length === 0 ? (
        <div className="rounded-2xl border border-sotto-200 bg-sotto-50 p-8 text-center">
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
            />
          ))}
        </div>
      )}

      {/* Sticky action bar */}
      {!loading && groceryData && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-sotto-200 bg-sotto-50/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="text-sm font-medium text-sotto-500 hover:text-sotto-700"
            >
              다시 메뉴 보기
            </button>
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
