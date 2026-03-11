import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/weekly-trend?recipeIds=id1,id2,id3
 * DB의 ingredient_prices 테이블에서 오늘 vs 7일 전 가격을 비교하여 트렌드 반환
 */
export async function GET(request: NextRequest) {
  const recipeIds = request.nextUrl.searchParams.get('recipeIds');

  if (!recipeIds) {
    return NextResponse.json(
      { error: 'recipeIds 파라미터가 필요합니다 (콤마 구분)' },
      { status: 400 },
    );
  }

  const ids = recipeIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json(
      { error: '유효한 recipeId가 없습니다' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    // 1. recipeIds로 재료명 조회
    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select('name')
      .in('recipe_id', ids);

    if (error) {
      throw new Error(`재료 조회 실패: ${error.message}`);
    }

    const uniqueNames = [
      ...new Set((ingredients ?? []).map((r) => r.name).filter(Boolean)),
    ];

    if (uniqueNames.length === 0) {
      return NextResponse.json({
        currentTotal: 0,
        weekAgoTotal: 0,
        changeAmount: 0,
        changePercent: 0,
        direction: 'stable' as const,
        pricedCount: 0,
        totalCount: 0,
      });
    }

    // 2. DB에서 최신 가격 조회 (가장 최근 fetched_at 기준)
    const { data: latestPrices } = await supabase
      .from('ingredient_prices')
      .select('ingredient_name, price, fetched_at')
      .in('ingredient_name', uniqueNames)
      .order('fetched_at', { ascending: false });

    // 재료별 최신 가격만 추출
    const currentPriceMap = new Map<string, number>();
    for (const row of latestPrices ?? []) {
      if (!currentPriceMap.has(row.ingredient_name)) {
        currentPriceMap.set(row.ingredient_name, row.price);
      }
    }

    if (currentPriceMap.size === 0) {
      return NextResponse.json({
        currentTotal: 0,
        weekAgoTotal: 0,
        changeAmount: 0,
        changePercent: 0,
        direction: 'stable' as const,
        pricedCount: 0,
        totalCount: uniqueNames.length,
      });
    }

    // 3. 7일 전 가격 조회
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data: oldPrices } = await supabase
      .from('ingredient_prices')
      .select('ingredient_name, price')
      .in('ingredient_name', [...currentPriceMap.keys()])
      .lte('fetched_at', weekAgoStr)
      .order('fetched_at', { ascending: false });

    const oldPriceMap = new Map<string, number>();
    for (const row of oldPrices ?? []) {
      if (!oldPriceMap.has(row.ingredient_name)) {
        oldPriceMap.set(row.ingredient_name, row.price);
      }
    }

    // 4. 실제 합산으로 변동 계산
    let currentTotal = 0;
    let weekAgoTotal = 0;
    let trendableCount = 0;

    for (const [name, price] of currentPriceMap) {
      currentTotal += price;
      const oldPrice = oldPriceMap.get(name);
      if (oldPrice !== undefined) {
        weekAgoTotal += oldPrice;
        trendableCount++;
      } else {
        weekAgoTotal += price; // 이전 데이터 없으면 현재 가격으로 대체
      }
    }

    const changeAmount = Math.round(currentTotal - weekAgoTotal);
    const changePercent = weekAgoTotal > 0
      ? Math.round(((currentTotal - weekAgoTotal) / weekAgoTotal) * 1000) / 10
      : 0;

    const direction: 'up' | 'down' | 'stable' =
      changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

    return NextResponse.json(
      {
        currentTotal: Math.round(currentTotal),
        weekAgoTotal: Math.round(weekAgoTotal),
        changeAmount,
        changePercent,
        direction,
        pricedCount: currentPriceMap.size,
        totalCount: uniqueNames.length,
        hasHistory: trendableCount > 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      },
    );
  } catch (err) {
    console.error('[api/weekly-trend] 실패:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: '주간 트렌드 조회에 실패했습니다' },
      { status: 500 },
    );
  }
}
