'use client';

import { useEffect, useState } from 'react';

interface PriceData {
  price: number | null;
  unit: string;
  mallName: string | null;
  confidence: number;
}

/**
 * 재료 목록 옆에 가격을 표시하는 Client Component
 * 재료명 목록을 받아 /api/prices로 조회 후 Map 형태로 제공
 */
export function useIngredientPrices(names: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  // 배열 참조 안정화 — 문자열 키로 변환하여 무한 루프 방지
  const namesKey = names.join(',');

  useEffect(() => {
    if (namesKey.length === 0) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchPrices() {
      try {
        const res = await fetch(`/api/prices?names=${encodeURIComponent(namesKey)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setPrices(data.prices ?? {});
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('가격 로딩 실패:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
    return () => controller.abort();
  }, [namesKey]);

  return { prices, loading };
}

/**
 * 인라인 가격 태그
 */
export function PriceTag({
  price,
  loading,
}: {
  price: PriceData | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="ml-2 inline-block h-4 w-14 animate-pulse rounded bg-sotto-100" />
    );
  }

  if (!price || price.price === null || price.confidence < 0.5) return null;

  return (
    <span className="ml-2 shrink-0 text-xs font-medium text-accent-600">
      ~{price.price.toLocaleString()}원
    </span>
  );
}
