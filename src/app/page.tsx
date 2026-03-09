'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Clock, Flame, RefreshCw, ShoppingBasket, Coins, AlertTriangle, Play, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMenuStore } from '@/lib/store';
import { saveCurrentMenu } from '@/lib/history';
import { CONCEPT_TAGS, DAY_LABELS, DIFFICULTY_LABELS, TAG_COLORS } from '@/lib/constants';
import { FilterSheet } from '@/components/ui/filter-sheet';
import type { ConceptTag } from '@/types/recipe';
import type { MealPlan, DayMenu } from '@/types/menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceBadge } from '@/components/ui/price-badge';
import { CoachBanner } from '@/components/ui/coach-banner';

/* ─── Skeleton ─── */
function MenuCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="rounded-2xl border border-sotto-200 bg-white shadow-card"
    >
      <Skeleton className="h-48 w-full rounded-t-2xl" />
      <div className="p-4">
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-3 h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Card ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

function MenuCard({
  dayItem,
  index,
  isRerolling,
  onReroll,
}: {
  dayItem: DayMenu;
  index: number;
  isRerolling: boolean;
  onReroll: () => void;
}) {
  const { recipe, day } = dayItem;
  const imageUrl = recipe.main_image_url ?? recipe.thumbnail_url;

  return (
    <motion.div
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Day label */}
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-sotto-400">
        DAY {day}
        <span className="ml-1.5 text-sotto-300">{DAY_LABELS[day - 1]}</span>
      </p>

      <motion.div
        className="group relative overflow-hidden rounded-2xl border border-sotto-200 bg-white shadow-card transition-shadow hover:shadow-card-hover"
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {isRerolling ? (
            <motion.div
              key="rerolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-48 items-center justify-center bg-sotto-50"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Dices className="h-8 w-8 text-sotto-300" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Thumbnail */}
              <Link href={`/recipe/${recipe.id}`} className="block">
                <div className="relative h-48 overflow-hidden bg-sotto-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={recipe.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={85}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      🍱
                    </div>
                  )}

                  {/* YouTube overlay */}
                  {recipe.youtube_video_id && (
                    <div className="absolute bottom-2 left-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                        <Play className="h-3 w-3 fill-current" />
                        영상
                      </span>
                    </div>
                  )}

                  {/* Reroll button overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReroll();
                    }}
                    className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-sotto-500 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-sotto-700 hover:scale-110 active:scale-95"
                    aria-label="이 메뉴 다시 뽑기"
                  >
                    <Dices className="h-5 w-5" />
                  </button>
                </div>
              </Link>

              {/* Content */}
              <Link href={`/recipe/${recipe.id}`} className="block p-4">
                <h3 className="mb-2 line-clamp-1 text-base font-bold text-sotto-800">
                  {recipe.name}
                </h3>

                {/* Meta row */}
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

                {/* Tags */}
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
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function HomePage() {
  const router = useRouter();
  const store = useMenuStore();
  const [loading, setLoading] = useState(true);
  const [rerollingDay, setRerollingDay] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const fetchMenu = useCallback(
    async (tags: ConceptTag[], days: 5 | 7) => {
      setLoading(true);
      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags, days }),
        });
        if (!res.ok) throw new Error('추천 불러오기 실패');
        const data: MealPlan = await res.json();
        store.setMenu(data.menu, data.fallback);
        saveCurrentMenu(data.menu);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '메뉴를 불러오지 못했어요');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Initial load: wait for hydration, then use stored menu or fetch new
  useEffect(() => {
    if (!store._hasHydrated) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (store.menu.length > 0 && !store.isExpired()) {
      setLoading(false);
    } else {
      store.resetMenu();
      fetchMenu(store.tags, store.days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store._hasHydrated]);

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: store.tags, days: store.days }),
      });
      if (!res.ok) throw new Error('새 메뉴 불러오기 실패');
      const data: MealPlan = await res.json();
      store.setMenu(data.menu, data.fallback);
      saveCurrentMenu(data.menu);
      toast.success('새로운 메뉴가 준비됐어요!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '새 메뉴를 불러오지 못했어요');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleReroll(dayItem: DayMenu) {
    setRerollingDay(dayItem.day);
    try {
      const excludeIds = store.menu.map((d) => d.recipe.id);
      const res = await fetch('/api/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: store.tags,
          excludeIds,
          dishType: dayItem.recipe.dish_type,
        }),
      });
      if (!res.ok) throw new Error('다시 뽑기 실패');
      const newRecipe = await res.json();
      store.updateMenuItem(dayItem.day, { ...dayItem, recipe: newRecipe });
      toast.success(`Day ${dayItem.day} 메뉴가 바뀌었어요!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '다시 뽑기에 실패했어요');
    } finally {
      setRerollingDay(null);
    }
  }

  function handleFilterApply(newTags: ConceptTag[], newDays: 5 | 7) {
    store.setTags(newTags);
    store.setDays(newDays);
    store.resetMenu();
    fetchMenu(newTags, newDays);
  }

  // Price summary
  const totalPrice = store.menu.reduce((sum, d) => {
    const p = d.recipe.estimated_price;
    const c = d.recipe.price_confidence;
    if (p && c && c >= 0.5) return sum + p;
    return sum;
  }, 0);
  const pricedCount = store.menu.filter(
    (d) => d.recipe.estimated_price && d.recipe.price_confidence && d.recipe.price_confidence >= 0.5,
  ).length;

  const groceryIds = store.menu.map((d) => d.recipe.id).join(',');

  return (
    <div className="gradient-warm min-h-screen">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">
        <CoachBanner />
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-sotto-800 sm:text-3xl">
                이번 주 도시락
              </h1>
              <p className="mt-1 text-sm text-sotto-400">
                {store.days}일치 메뉴가 준비됐어요
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/history"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-sotto-200 bg-white text-sotto-500 shadow-sm transition-colors hover:border-sotto-300 hover:bg-sotto-50 hover:text-sotto-700"
                title="지난 메뉴"
              >
                <History className="h-4 w-4" />
              </Link>
              <FilterSheet
                tags={store.tags}
                days={store.days}
                onApply={handleFilterApply}
              />
              <motion.button
                whileTap={{ rotate: 180, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                onClick={handleRefreshAll}
                disabled={loading || refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-sotto-200 bg-white text-sotto-500 shadow-sm transition-colors hover:border-sotto-300 hover:bg-sotto-50 hover:text-sotto-700 disabled:opacity-50"
                title="전체 새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>

          {/* Active tags */}
          <AnimatePresence>
            {store.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-wrap gap-1.5"
              >
                {store.tags.map((tagId) => {
                  const tag = CONCEPT_TAGS.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      label={`${tag.emoji} ${tag.label}`}
                      colorClass={TAG_COLORS[tagId]}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Price summary */}
        <AnimatePresence>
          {!loading && pricedCount > 0 && totalPrice > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-sotto-200 bg-white/80 px-5 py-3.5 shadow-card backdrop-blur-sm"
            >
              <Coins className="h-4 w-4 text-sotto-400" />
              <span className="text-sm font-medium text-sotto-500">이번 주 예상 재료비</span>
              <span className="text-sm font-bold text-sotto-800">
                약 {totalPrice.toLocaleString()}원
              </span>
              {pricedCount < store.menu.length && (
                <span className="text-xs text-sotto-400">
                  ({pricedCount}/{store.menu.length}개 기준)
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fallback notice */}
        <AnimatePresence>
          {store.fallback && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/80 p-4 backdrop-blur-sm"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                일부 메뉴는 선택한 컨셉과 다를 수 있어요. 다시 뽑기로 교체해 보세요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: store.days }).map((_, i) => (
                <MenuCardSkeleton key={i} index={i} />
              ))
            : store.menu.length === 0
            ? null
            : store.menu.map((dayItem, index) => (
                <MenuCard
                  key={dayItem.day}
                  dayItem={dayItem}
                  index={index}
                  isRerolling={rerollingDay === dayItem.day}
                  onReroll={() => handleReroll(dayItem)}
                />
              ))}
        </div>

        {/* Empty State */}
        {!loading && store.menu.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-4 text-5xl">🍽️</div>
            <h3 className="mb-2 text-lg font-semibold text-sotto-700">
              조건에 맞는 메뉴가 없어요
            </h3>
            <p className="mb-6 text-sm text-sotto-500">
              필터를 줄이거나 초기화해 보세요
            </p>
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 rounded-xl bg-sotto-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sotto-600"
            >
              <RefreshCw className="h-4 w-4" />
              필터 없이 새로 추천받기
            </button>
          </motion.div>
        )}

        {/* Sticky bottom bar */}
        <AnimatePresence>
          {!loading && store.menu.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
              className="fixed bottom-0 left-0 right-0 z-40"
            >
              <div className="border-t border-sotto-200 bg-white/90 px-4 py-4 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/grocery?ids=${groceryIds}`)}
                    className="inline-flex flex-1 max-w-xs items-center justify-center gap-2 rounded-2xl bg-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-600 active:bg-accent-700"
                  >
                    <ShoppingBasket className="h-5 w-5" />
                    장보기 목록 보기
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
