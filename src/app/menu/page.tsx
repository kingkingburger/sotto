'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dices, Clock, Flame, ArrowLeft, AlertTriangle, Coins } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CONCEPT_TAGS, DAY_LABELS, DIFFICULTY_LABELS, TAG_COLORS } from '@/lib/constants';
import type { ConceptTag } from '@/types/recipe';
import type { MealPlan, DayMenu } from '@/types/menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PriceBadge } from '@/components/ui/price-badge';
import { VideoIndicator } from '@/components/ui/video-indicator';

function MenuCardSkeleton() {
  return (
    <div className="rounded-2xl border border-sotto-200 bg-white shadow-card">
      <Skeleton className="h-44 w-full rounded-t-2xl" />
      <div className="p-4">
        <Skeleton className="mb-2 h-5 w-2/3" />
        <Skeleton className="mb-3 h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function MenuPageLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8">
      <Skeleton className="mb-3 h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => <MenuCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export default function MenuPageWrapper() {
  return (
    <Suspense fallback={<MenuPageLoading />}>
      <MenuPage />
    </Suspense>
  );
}

function MenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tagsParam = searchParams.get('tags') ?? '';
  const daysParam = searchParams.get('days') ?? '5';
  const idsParam = searchParams.get('ids') ?? '';

  const tags = tagsParam ? (tagsParam.split(',') as ConceptTag[]) : [];
  const days = (daysParam === '7' ? 7 : 5) as 5 | 7;

  const [menu, setMenu] = useState<DayMenu[]>([]);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rerollingDay, setRerollingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const updateUrlIds = useCallback(
    (newMenu: DayMenu[]) => {
      const ids = newMenu.map((d) => d.recipe.id).join(',');
      const params = new URLSearchParams(searchParams.toString());
      params.set('ids', ids);
      router.replace(`/menu?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchMenu() {
      setLoading(true);
      setError(null);
      try {
        if (idsParam) {
          const idList = idsParam.split(',').filter(Boolean);
          const res = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags, days, recipeIds: idList }),
          });
          if (!res.ok) throw new Error('추천 불러오기 실패');
          const data: MealPlan = await res.json();
          setMenu(data.menu);
          setFallback(data.fallback);
        } else {
          const res = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags, days }),
          });
          if (!res.ok) throw new Error('추천 불러오기 실패');
          const data: MealPlan = await res.json();
          setMenu(data.menu);
          setFallback(data.fallback);
          updateUrlIds(data.menu);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReroll(dayItem: DayMenu) {
    setRerollingDay(dayItem.day);
    try {
      const excludeIds = menu.map((d) => d.recipe.id);
      const res = await fetch('/api/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags,
          excludeIds,
          dishType: dayItem.recipe.dish_type,
        }),
      });
      if (!res.ok) throw new Error('다시 뽑기 실패');
      const newRecipe = await res.json();
      setMenu((prev) => {
        const updated = prev.map((d) =>
          d.day === dayItem.day ? { ...d, recipe: newRecipe } : d,
        );
        updateUrlIds(updated);
        return updated;
      });
    } catch {
      // silently ignore reroll errors
    } finally {
      setRerollingDay(null);
    }
  }

  const selectedTagObjects = CONCEPT_TAGS.filter((t) => tags.includes(t.id));
  const groceryIds = menu.map((d) => d.recipe.id).join(',');

  // Total estimated price
  const totalPrice = menu.reduce((sum, d) => {
    const p = d.recipe.estimated_price;
    const c = d.recipe.price_confidence;
    if (p && c && c >= 0.5) return sum + p;
    return sum;
  }, 0);
  const pricedCount = menu.filter(
    (d) => d.recipe.estimated_price && d.recipe.price_confidence && d.recipe.price_confidence >= 0.5,
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/select"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-sotto-500 transition-colors hover:text-sotto-700"
        >
          <ArrowLeft className="h-4 w-4" />
          다시 선택
        </Link>
        <h1 className="mb-3 text-2xl font-bold text-sotto-800 sm:text-3xl">이번 주 도시락 메뉴</h1>
        <div className="flex flex-wrap items-center gap-2">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              label={`${tag.emoji} ${tag.label}`}
              colorClass={TAG_COLORS[tag.id]}
            />
          ))}
          <Badge label={`${days}일치`} />
        </div>
      </div>

      {/* Price summary */}
      {!loading && pricedCount > 0 && totalPrice > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-sotto-200 bg-white px-4 py-3 shadow-card">
          <Coins className="h-4 w-4 text-sotto-400" />
          <span className="text-sm font-medium text-sotto-500">이번 주 예상 재료비:</span>
          <span className="text-sm font-bold text-sotto-800">
            약 {totalPrice.toLocaleString()}원
          </span>
          {pricedCount < menu.length && (
            <span className="text-xs text-sotto-400">({pricedCount}/{menu.length}개 기준)</span>
          )}
        </div>
      )}

      {/* Fallback notice */}
      {fallback && !loading && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            일부 메뉴는 선택한 컨셉과 다를 수 있어요. 다시 뽑기로 교체해 보세요.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-4 text-red-700">{error}</p>
          <Button variant="secondary" onClick={() => { hasFetched.current = false; setError(null); setLoading(true); window.location.reload(); }}>
            다시 시도
          </Button>
        </div>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: days }).map((_, i) => <MenuCardSkeleton key={i} />)
          : menu.map((dayItem, index) => {
              const { recipe, day } = dayItem;
              const isRerolling = rerollingDay === day;

              return (
                <div
                  key={day}
                  className="group relative overflow-hidden rounded-2xl border border-sotto-200 bg-white shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 animate-fadeIn opacity-0"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Day label */}
                  <div className="absolute left-3 top-3 z-10">
                    <span className="rounded-lg bg-sotto-700/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      {DAY_LABELS[day - 1]}
                    </span>
                  </div>

                  {/* Video indicator */}
                  <div className="absolute left-3 bottom-[calc(50%+0.75rem)] z-10">
                    <VideoIndicator
                      videoId={recipe.youtube_video_id}
                      onClick={() => router.push(`/recipe/${recipe.id}`)}
                    />
                  </div>

                  {/* Reroll button */}
                  <button
                    onClick={() => handleReroll(dayItem)}
                    disabled={isRerolling}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-sotto-500 shadow-sm backdrop-blur-sm transition-all hover:bg-sotto-100 hover:text-sotto-700 disabled:opacity-50"
                    title="다시 뽑기"
                  >
                    <Dices className={`h-4 w-4 ${isRerolling ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Thumbnail */}
                  <Link href={`/recipe/${recipe.id}`} className="block">
                    <div className="relative h-44 overflow-hidden bg-sotto-100">
                      {recipe.thumbnail_url ? (
                        <Image
                          src={recipe.thumbnail_url}
                          alt={recipe.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          🍱
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-1 text-base font-bold text-sotto-800">
                        {recipe.name}
                      </h3>

                      {/* Meta */}
                      <div className="mb-3 flex items-center gap-3 text-xs text-sotto-500">
                        {recipe.cooking_time_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {recipe.cooking_time_minutes}분
                          </span>
                        )}
                        {recipe.calories && (
                          <span className="flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5" />
                            {recipe.calories}kcal
                          </span>
                        )}
                      </div>

                      {/* Tags + Price */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PriceBadge
                          estimatedPrice={recipe.estimated_price}
                          priceConfidence={recipe.price_confidence}
                        />
                        <Badge
                          label={DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}
                          colorClass="bg-sotto-100 text-sotto-600 border-sotto-200"
                        />
                        {recipe.concept_tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            label={CONCEPT_TAGS.find((t) => t.id === tag)?.label ?? tag}
                            colorClass={TAG_COLORS[tag]}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
      </div>

      {/* Sticky action bar */}
      {!loading && menu.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-sotto-200 bg-sotto-50/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <Link
              href="/select"
              className="text-sm font-medium text-sotto-500 hover:text-sotto-700"
            >
              처음부터 다시
            </Link>
            <Button
              onClick={() => router.push(`/grocery?ids=${groceryIds}`)}
              size="md"
              className="flex-1 max-w-xs"
            >
              메뉴 확정하기 →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
