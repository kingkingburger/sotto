'use client';

import { useMemo } from 'react';
import type { RecipeIngredient } from '@/types/recipe';
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_EMOJI } from '@/lib/constants';
import { useIngredientPrices, PriceTag } from './ingredient-prices';

const CATEGORY_DOT_COLORS: Record<string, string> = {
  vegetable: 'bg-green-400',
  meat: 'bg-red-400',
  seafood: 'bg-blue-400',
  dairy: 'bg-amber-300',
  grain: 'bg-yellow-400',
  seasoning: 'bg-orange-400',
  sauce: 'bg-rose-400',
  noodle: 'bg-purple-400',
  tofu: 'bg-lime-400',
  egg: 'bg-yellow-300',
  oil: 'bg-emerald-400',
  other: 'bg-sotto-300',
};

interface Props {
  ingredients: RecipeIngredient[];
}

export function IngredientsSection({ ingredients }: Props) {
  // Group by category
  const { grouped, orderedCategories } = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>();
    for (const ing of ingredients) {
      const cat = ing.category ?? 'other';
      const existing = map.get(cat) ?? [];
      existing.push(ing);
      map.set(cat, existing);
    }

    const ordered = [
      ...CATEGORY_ORDER.filter((cat) => map.has(cat)),
      ...Array.from(map.keys()).filter(
        (cat) => !CATEGORY_ORDER.includes(cat as (typeof CATEGORY_ORDER)[number]),
      ),
    ];

    return { grouped: map, orderedCategories: ordered };
  }, [ingredients]);

  // Fetch prices
  const names = useMemo(
    () => ingredients.map((ing) => ing.name),
    [ingredients],
  );
  const { prices, loading } = useIngredientPrices(names);

  // 총 가격 계산
  const totalPrice = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const name of names) {
      const p = prices[name];
      if (p?.price) {
        sum += p.price;
        count++;
      }
    }
    return { sum, count };
  }, [prices, names]);

  if (ingredients.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-subtitle font-bold text-sotto-900">재료</h2>
        {!loading && totalPrice.count > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-accent-600">
              예상 ~{totalPrice.sum.toLocaleString()}원
            </span>
            <span className="rounded-full bg-sotto-100 px-1.5 py-0.5 text-[10px] font-medium text-sotto-500">
              {totalPrice.count}/{names.length}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {orderedCategories.map((cat) => {
          const items = grouped.get(cat) ?? [];
          const label =
            CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat;
          const dotColor = CATEGORY_DOT_COLORS[cat] ?? 'bg-sotto-300';
          const emoji = CATEGORY_EMOJI[cat as keyof typeof CATEGORY_EMOJI] ?? '📦';
          return (
            <div key={cat}>
              <div className="mb-1 flex items-center gap-1.5 border-b border-sotto-200 pb-1.5">
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                <h3 className="text-body-sm font-semibold text-sotto-600">
                  {label}
                </h3>
              </div>
              {items.map((ing) => (
                <div
                  key={ing.id}
                  className={`flex items-center border-b border-sotto-200/40 py-2 text-sm ${
                    ing.is_optional ? 'opacity-60' : ''
                  }`}
                >
                  <span className="mr-2.5 text-base leading-none">{emoji}</span>
                  <span
                    className={`flex-1 text-sotto-800 ${
                      ing.is_optional ? 'italic' : ''
                    }`}
                  >
                    {ing.name}
                    {ing.is_optional && (
                      <span className="ml-1 text-xs text-sotto-400">
                        (선택)
                      </span>
                    )}
                  </span>
                  {ing.amount && (
                    <span className="min-w-[60px] text-right text-body-sm text-sotto-600">
                      {ing.amount}
                    </span>
                  )}
                  <PriceTag price={prices[ing.name]} loading={loading} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
