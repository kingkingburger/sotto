/**
 * KAMIS (한국농수산식품유통공사) API 클라이언트
 * 농수산물 소매가격 조회
 * @see http://www.kamis.or.kr/customer/reference/openapi_list.do
 */

const KAMIS_BASE = 'https://www.kamis.or.kr/service/price/xml.do';
const TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; SottoBot/1.0; +https://sotto.app)';

/** KAMIS 카테고리 코드 */
export const KAMIS_CATEGORIES = {
  GRAIN: '100',     // 식량작물
  VEGETABLE: '200', // 채소류
  SPECIAL: '300',   // 특용작물
  FRUIT: '400',     // 과일류
  LIVESTOCK: '500', // 축산물
  SEAFOOD: '600',   // 수산물
} as const;

export type KamisCategoryCode =
  (typeof KAMIS_CATEGORIES)[keyof typeof KAMIS_CATEGORIES];

export interface KamisPriceItem {
  itemName: string;
  itemCode: string;
  kindName: string;
  kindCode: string;
  rank: string;         // 상품/중품
  unit: string;         // 단위 (1kg, 100g 등)
  todayPrice: number | null;     // dpr1 당일
  yesterdayPrice: number | null; // dpr2 1일전
  weekAgoPrice: number | null;   // dpr3 1주전
  twoWeekAgoPrice: number | null; // dpr4 2주전
  monthAgoPrice: number | null;  // dpr5 1개월전
  yearAgoPrice: number | null;   // dpr6 1년전
}

interface KamisRawItem {
  item_name: string;
  item_code: string;
  kind_name: string;
  kind_code: string;
  rank: string;
  unit: string;
  dpr1: string;
  dpr2: string;
  dpr3: string;
  dpr4: string;
  dpr5: string;
  dpr6: string;
  dpr7: string;
}

interface KamisResponse {
  condition: unknown[];
  data: {
    error_code: string;
    item?: KamisRawItem[];
  };
}

function parsePrice(raw: string): number | null {
  if (!raw || raw === '-' || raw === '0') return null;
  const cleaned = raw.replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function getCredentials(): { certKey: string; certId: string } | null {
  const certKey = process.env.KAMIS_CERT_KEY;
  const certId = process.env.KAMIS_CERT_ID;
  if (!certKey || !certId) return null;
  return { certKey, certId };
}

/**
 * 카테고리별 일일 소매가격 조회
 */
export async function fetchDailyPricesByCategory(
  categoryCode: KamisCategoryCode,
  options?: { date?: string; countryCode?: string; retry?: boolean },
): Promise<KamisPriceItem[]> {
  const creds = getCredentials();
  if (!creds) return [];

  const date = options?.date ?? formatDate(new Date());
  const countryCode = options?.countryCode ?? '1101'; // 서울

  const url = new URL(KAMIS_BASE);
  url.searchParams.set('action', 'dailyPriceByCategoryList');
  url.searchParams.set('p_cert_key', creds.certKey);
  url.searchParams.set('p_cert_id', creds.certId);
  url.searchParams.set('p_returntype', 'json');
  url.searchParams.set('p_product_cls_code', '01'); // 소매
  url.searchParams.set('p_item_category_code', categoryCode);
  url.searchParams.set('p_country_code', countryCode);
  url.searchParams.set('p_regday', date);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`KAMIS API error: ${res.status}`);
    }

    const json: KamisResponse = await res.json();

    if (json.data.error_code === '001') return []; // 데이터 없음
    if (json.data.error_code !== '000') {
      throw new Error(`KAMIS error code: ${json.data.error_code}`);
    }

    return (json.data.item ?? []).map((raw) => ({
      itemName: raw.item_name,
      itemCode: raw.item_code,
      kindName: raw.kind_name,
      kindCode: raw.kind_code,
      rank: raw.rank,
      unit: raw.unit,
      todayPrice: parsePrice(raw.dpr1),
      yesterdayPrice: parsePrice(raw.dpr2),
      weekAgoPrice: parsePrice(raw.dpr3),
      twoWeekAgoPrice: parsePrice(raw.dpr4),
      monthAgoPrice: parsePrice(raw.dpr5),
      yearAgoPrice: parsePrice(raw.dpr6),
    }));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`KAMIS timeout for category ${categoryCode}`);
      return [];
    }
    // 1회 재시도
    if (options?.retry !== false) {
      return fetchDailyPricesByCategory(categoryCode, {
        ...options,
        retry: false,
      });
    }
    console.error(`KAMIS fetch failed for category ${categoryCode}:`, err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 전체 카테고리 일일 가격 일괄 조회
 */
export async function fetchAllDailyPrices(
  date?: string,
): Promise<KamisPriceItem[]> {
  const categories = Object.values(KAMIS_CATEGORIES);
  const results: KamisPriceItem[] = [];

  // 순차 호출 (API 부하 방지)
  for (const cat of categories) {
    const items = await fetchDailyPricesByCategory(cat, { date });
    results.push(...items);
  }

  return results;
}

/**
 * 특정 품목의 최신 가격 조회
 * @returns 가장 최근 유효 가격 (당일 → 1일전 → 1주전 순)
 */
export function getLatestPrice(item: KamisPriceItem): number | null {
  return (
    item.todayPrice ??
    item.yesterdayPrice ??
    item.weekAgoPrice ??
    item.twoWeekAgoPrice ??
    null
  );
}

/**
 * 가격 트렌드 계산
 */
export function calcTrend(
  item: KamisPriceItem,
): { direction: 'up' | 'down' | 'stable'; changePercent: number } | null {
  const current = getLatestPrice(item);
  const prev = item.weekAgoPrice ?? item.twoWeekAgoPrice;
  if (current === null || prev === null || prev === 0) return null;

  const change = ((current - prev) / prev) * 100;
  const direction =
    change > 2 ? 'up' : change < -2 ? 'down' : 'stable';

  return { direction, changePercent: Math.round(change * 10) / 10 };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
