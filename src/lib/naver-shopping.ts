/**
 * 네이버 쇼핑 검색 API 클라이언트
 * 식재료 가격 조회용 — 최저가 기반
 * API 문서: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 */

const NAVER_API_URL = 'https://openapi.naver.com/v1/search/shop.json';

export interface NaverShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string; // 최저가
  hprice: string; // 최고가
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

interface NaverShoppingResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingItem[];
}

export interface IngredientPriceResult {
  name: string;
  price: number | null;
  unit: string;
  source: 'naver';
  mallName: string | null;
  confidence: number; // 0~1, 검색 결과 신뢰도
  rawQuery: string;
  fetchedAt: string;
}

/**
 * 식재료용 검색 쿼리 생성
 * "돼지고기" → "돼지고기 식재료"로 검색하여 식품 결과 우선
 */
function buildQuery(ingredientName: string): string {
  const cleaned = ingredientName.trim().replace(/[()（）]/g, '');
  // 이미 충분히 구체적인 경우 그대로 사용
  if (cleaned.length >= 4) return cleaned;
  return `${cleaned} 식재료`;
}

/**
 * HTML 태그 제거 (네이버 API 응답에 <b> 태그 포함)
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * 네이버 쇼핑 API 호출
 */
export async function searchNaverShopping(
  query: string,
  display: number = 5,
): Promise<NaverShoppingItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수가 필요합니다');
  }

  const url = new URL(NAVER_API_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', 'sim'); // 정확도순

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 쇼핑 API 오류 (${res.status}): ${text}`);
  }

  const data: NaverShoppingResponse = await res.json();
  return data.items.map((item) => ({
    ...item,
    title: stripHtml(item.title),
  }));
}

/**
 * 식재료 이름으로 가격 조회
 * 상위 결과 중 식품 카테고리 필터링 후 최저가 반환
 */
export async function getIngredientPrice(
  ingredientName: string,
): Promise<IngredientPriceResult> {
  const query = buildQuery(ingredientName);

  try {
    const items = await searchNaverShopping(query, 10);

    // 식품 카테고리 필터
    const foodItems = items.filter(
      (item) =>
        item.category1 === '식품' ||
        item.category2?.includes('식품') ||
        item.category1 === '출산/육아', // 분유 등
    );

    const candidates = foodItems.length > 0 ? foodItems : items;

    if (candidates.length === 0) {
      return {
        name: ingredientName,
        price: null,
        unit: '',
        source: 'naver',
        mallName: null,
        confidence: 0,
        rawQuery: query,
        fetchedAt: new Date().toISOString(),
      };
    }

    // 최저가 상품 선택
    const best = candidates.reduce((min, item) => {
      const price = parseInt(item.lprice, 10);
      const minPrice = parseInt(min.lprice, 10);
      return price < minPrice ? item : min;
    });

    const price = parseInt(best.lprice, 10);
    const confidence = foodItems.length > 0 ? 0.8 : 0.4;

    return {
      name: ingredientName,
      price,
      unit: '1개/1팩', // 네이버 쇼핑은 단위 표준화가 어려움
      source: 'naver',
      mallName: best.mallName || null,
      confidence,
      rawQuery: query,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[naver-shopping] ${ingredientName} 조회 실패:`, err);
    return {
      name: ingredientName,
      price: null,
      unit: '',
      source: 'naver',
      mallName: null,
      confidence: 0,
      rawQuery: query,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * 여러 재료 가격 일괄 조회
 * API 부하 분산을 위해 100ms 간격으로 호출
 */
export async function getIngredientPrices(
  names: string[],
): Promise<Map<string, IngredientPriceResult>> {
  const results = new Map<string, IngredientPriceResult>();

  for (const name of names) {
    const result = await getIngredientPrice(name);
    results.set(name, result);
    // Rate limiting: 100ms 간격
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}
