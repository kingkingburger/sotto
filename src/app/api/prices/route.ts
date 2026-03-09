import { NextRequest, NextResponse } from 'next/server';
import { getIngredientPrices } from '@/lib/naver-shopping';

/**
 * GET /api/prices?names=양파,당근,간장
 * 재료명 목록으로 네이버 쇼핑 최저가 조회
 */
export async function GET(request: NextRequest) {
  const namesParam = request.nextUrl.searchParams.get('names');

  if (!namesParam) {
    return NextResponse.json(
      { error: 'names 파라미터가 필요합니다 (콤마 구분)' },
      { status: 400 },
    );
  }

  const names = namesParam
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 30); // 최대 30개

  if (names.length === 0) {
    return NextResponse.json(
      { error: '유효한 재료명이 없습니다' },
      { status: 400 },
    );
  }

  try {
    const results = await getIngredientPrices(names);

    const prices: Record<string, { price: number | null; unit: string; mallName: string | null; confidence: number }> = {};
    for (const [name, result] of results) {
      prices[name] = {
        price: result.price,
        unit: result.unit,
        mallName: result.mallName,
        confidence: result.confidence,
      };
    }

    return NextResponse.json(
      { prices },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      },
    );
  } catch (err) {
    console.error('[api/prices] 가격 조회 실패:', err);
    return NextResponse.json(
      { error: '가격 조회에 실패했습니다' },
      { status: 500 },
    );
  }
}
