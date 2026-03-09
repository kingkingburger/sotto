import { NextRequest, NextResponse } from 'next/server';
import { getIngredientPrices } from '@/lib/naver-shopping';

/**
 * 간단한 IP 기반 레이트리밋 (슬라이딩 윈도우)
 * 프로덕션에서는 Redis/Upstash 등으로 교체 권장
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1분
const RATE_LIMIT_MAX = 10; // 1분당 최대 10회

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// 오래된 엔트리 정리 (5분마다)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

/**
 * GET /api/prices?names=양파,당근,간장
 * 재료명 목록으로 네이버 쇼핑 최저가 조회
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
      { status: 429 },
    );
  }

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
    console.error('[api/prices] 가격 조회 실패:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: '가격 조회에 실패했습니다' },
      { status: 500 },
    );
  }
}
