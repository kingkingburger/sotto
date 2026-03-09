'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { loadHistory, formatWeekLabel, formatDateRange, type WeeklyHistory } from '@/lib/history';
import type { DayMenu } from '@/types/menu';
import { DAY_LABELS } from '@/lib/constants';

function HistoryCard({ dayItem }: { dayItem: DayMenu }) {
  const { recipe, day } = dayItem;
  const imageUrl = recipe.main_image_url ?? recipe.thumbnail_url;

  return (
    <Link href={`/recipe/${recipe.id}`} className="block flex-shrink-0 w-[120px]">
      <motion.div
        whileHover={{ y: -2 }}
        className="overflow-hidden rounded-2xl border border-sotto-200 bg-white transition-transform"
      >
        <div className="relative h-20 bg-gradient-to-br from-sotto-200 to-sotto-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={recipe.name}
              fill
              sizes="120px"
              quality={75}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">🍱</div>
          )}
        </div>
        <div className="px-2.5 py-2">
          <p className="truncate text-xs font-semibold text-sotto-800">
            {recipe.name}
          </p>
          <p className="mt-0.5 text-label text-sotto-500">{DAY_LABELS[day - 1]}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function WeekSection({ week, index }: { week: WeeklyHistory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-6"
      data-testid="history-week-card"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-body font-bold text-sotto-900">{formatWeekLabel(week.weekStart)}</h3>
        <span className="text-xs text-sotto-500">
          {formatDateRange(week.weekStart, week.weekEnd)}
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {week.menu.map((dayItem) => (
          <HistoryCard key={`${week.weekStart}-${dayItem.day}`} dayItem={dayItem} />
        ))}
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<WeeklyHistory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setLoaded(true);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-sotto-500 transition-colors hover:text-sotto-700"
        >
          <ArrowLeft className="h-4 w-4" />
          메뉴로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-sotto-800 sm:text-3xl">지난 메뉴</h1>
        <p className="mt-1 text-sm text-sotto-500">최근 4주간 추천받은 메뉴를 볼 수 있어요</p>
      </div>

      {!loaded ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-2.5 h-5 w-24 rounded bg-sotto-200" />
              <div className="flex gap-2.5 overflow-hidden">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-[120px] w-[120px] flex-shrink-0 rounded-2xl bg-sotto-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <Clock className="mx-auto mb-4 h-12 w-12 text-sotto-300" />
          <h3 className="mb-2 text-lg font-semibold text-sotto-700">아직 히스토리가 없어요</h3>
          <p className="mb-6 text-sm text-sotto-500">메뉴를 추천받으면 자동으로 저장돼요</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            메뉴 추천받기
          </Link>
        </motion.div>
      ) : (
        <div>
          {history.map((week, i) => (
            <WeekSection key={week.weekStart} week={week} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
