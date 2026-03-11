import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIngredientPrices } from '@/lib/price-service';

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

    // 2. 가격 조회 (trend 포함)
    const prices = await getIngredientPrices(uniqueNames);

    let currentTotal = 0;
    let trendSum = 0;
    let trendCount = 0;
    let pricedCount = 0;

    for (const [, result] of prices) {
      currentTotal += result.price;
      pricedCount++;

      if (result.trend) {
        trendSum += result.trend.changePercent;
        trendCount++;
      }
    }

    // 3. 가중 평균 트렌드 계산
    const avgChangePercent = trendCount > 0
      ? Math.round((trendSum / trendCount) * 10) / 10
      : 0;

    const changeAmount = Math.round(currentTotal * (avgChangePercent / 100));
    const weekAgoTotal = currentTotal - changeAmount;

    const direction: 'up' | 'down' | 'stable' =
      avgChangePercent > 2 ? 'up' : avgChangePercent < -2 ? 'down' : 'stable';

    return NextResponse.json(
      {
        currentTotal: Math.round(currentTotal),
        weekAgoTotal: Math.round(weekAgoTotal),
        changeAmount,
        changePercent: avgChangePercent,
        direction,
        pricedCount,
        totalCount: uniqueNames.length,
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
