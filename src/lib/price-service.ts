/**
 * 통합 가격 조회 서비스
 * 폴백 체인: KAMIS → 참가격 → 네이버 쇼핑 → 정적사전
 */
import {
  fetchDailyPricesByCategory,
  getLatestPrice,
  calcTrend,
  KAMIS_CATEGORIES,
  type KamisPriceItem,
  type KamisCategoryCode,
} from './kamis';
import { getConsumerMedianPrice } from './consumer-price';
import { getIngredientPrices as getNaverPrices } from './naver-shopping';
import { PRICE_DICTIONARY } from './price-dictionary';

export type PriceSource = 'kamis' | 'consumer' | 'naver' | 'static';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface PriceResult {
  price: number;
  unit: string;
  source: PriceSource;
  confidence: number; // 0~1
  trend?: { direction: TrendDirection; changePercent: number };
}

// ─── 재료 → KAMIS 품목 매핑 ──────────────────────────────────────────
interface KamisMapping {
  itemCode: string;
  kindCode: string;
  categoryCode: KamisCategoryCode;
  rank?: string;         // 기본 '상품'
  unitConversion?: number; // KAMIS 단위 → 조리 단위 변환 계수
}

const KAMIS_INGREDIENT_MAP: Record<string, KamisMapping> = {
  // 채소류 (200)
  배추: { itemCode: '211', kindCode: '00', categoryCode: '200' },
  양배추: { itemCode: '212', kindCode: '00', categoryCode: '200' },
  시금치: { itemCode: '213', kindCode: '00', categoryCode: '200' },
  상추: { itemCode: '214', kindCode: '01', categoryCode: '200' },
  깻잎: { itemCode: '215', kindCode: '00', categoryCode: '200' },
  부추: { itemCode: '221', kindCode: '00', categoryCode: '200' },
  피망: { itemCode: '222', kindCode: '00', categoryCode: '200' },
  파프리카: { itemCode: '222', kindCode: '00', categoryCode: '200' },
  양파: { itemCode: '223', kindCode: '00', categoryCode: '200' },
  대파: { itemCode: '224', kindCode: '00', categoryCode: '200' },
  마늘: { itemCode: '225', kindCode: '00', categoryCode: '200' },
  생강: { itemCode: '226', kindCode: '00', categoryCode: '200' },
  당근: { itemCode: '231', kindCode: '00', categoryCode: '200' },
  감자: { itemCode: '232', kindCode: '01', categoryCode: '200' },
  고구마: { itemCode: '232', kindCode: '00', categoryCode: '200' },
  무: { itemCode: '233', kindCode: '00', categoryCode: '200' },
  오이: { itemCode: '241', kindCode: '01', categoryCode: '200' },
  애호박: { itemCode: '242', kindCode: '00', categoryCode: '200' },
  호박: { itemCode: '242', kindCode: '00', categoryCode: '200' },
  토마토: { itemCode: '243', kindCode: '00', categoryCode: '200' },
  고추: { itemCode: '244', kindCode: '00', categoryCode: '200' },
  풋고추: { itemCode: '244', kindCode: '00', categoryCode: '200' },
  // 축산물 (500)
  소고기: { itemCode: '511', kindCode: '00', categoryCode: '500' },
  돼지고기: { itemCode: '521', kindCode: '06', categoryCode: '500' },
  닭고기: { itemCode: '531', kindCode: '00', categoryCode: '500' },
  닭: { itemCode: '531', kindCode: '00', categoryCode: '500' },
  닭가슴살: { itemCode: '531', kindCode: '00', categoryCode: '500' },
  계란: { itemCode: '541', kindCode: '01', categoryCode: '500' },
  달걀: { itemCode: '541', kindCode: '01', categoryCode: '500' },
  // 수산물 (600)
  고등어: { itemCode: '611', kindCode: '00', categoryCode: '600' },
  오징어: { itemCode: '612', kindCode: '00', categoryCode: '600' },
  갈치: { itemCode: '613', kindCode: '00', categoryCode: '600' },
  새우: { itemCode: '615', kindCode: '00', categoryCode: '600' },
  // 식량작물 (100)
  쌀: { itemCode: '111', kindCode: '02', categoryCode: '100' },
  콩: { itemCode: '141', kindCode: '00', categoryCode: '100' },
};

// ─── 재료 → 참가격 검색 키워드 매핑 ─────────────────────────────────
const CONSUMER_KEYWORD_MAP: Record<string, string> = {
  간장: '간장',
  고추장: '고추장',
  된장: '된장',
  참기름: '참기름',
  식용유: '식용유',
  올리브유: '올리브유',
  두부: '두부',
  김: '김',
  밀가루: '밀가루',
  설탕: '설탕',
  소금: '소금',
  식초: '식초',
  굴소스: '굴소스',
  케찹: '케찹',
  마요네즈: '마요네즈',
  카레: '카레',
  후추: '후추',
  미역: '미역',
  고춧가루: '고춧가루',
  깨: '깨',
  버터: '버터',
  우유: '우유',
  치즈: '치즈',
  어묵: '어묵',
  스팸: '스팸',
  소면: '소면',
  당면: '당면',
};

// ─── KAMIS 캐시 (세션 내 메모리 캐시) ──────────────────────────────
let kamisCache: Map<string, KamisPriceItem[]> | null = null;
let kamisCacheTime = 0;
const KAMIS_CACHE_TTL = 60 * 60 * 1000; // 1시간

async function getKamisData(): Promise<Map<string, KamisPriceItem[]>> {
  if (kamisCache && Date.now() - kamisCacheTime < KAMIS_CACHE_TTL) {
    return kamisCache;
  }

  const allItems = new Map<string, KamisPriceItem[]>();
  const categories: KamisCategoryCode[] = [
    KAMIS_CATEGORIES.VEGETABLE,
    KAMIS_CATEGORIES.LIVESTOCK,
    KAMIS_CATEGORIES.SEAFOOD,
    KAMIS_CATEGORIES.GRAIN,
  ];

  for (const cat of categories) {
    const items = await fetchDailyPricesByCategory(cat);
    for (const item of items) {
      const key = `${item.itemCode}:${item.kindCode}`;
      const existing = allItems.get(key) ?? [];
      existing.push(item);
      allItems.set(key, existing);
    }
  }

  kamisCache = allItems;
  kamisCacheTime = Date.now();
  return allItems;
}

// ─── 메인 API ─────────────────────────────────────────────────────
/**
 * 단일 재료 가격 조회
 */
export async function getIngredientPrice(
  name: string,
): Promise<PriceResult | null> {
  // 1. KAMIS 매핑 확인
  const kamisMapping = findKamisMapping(name);
  if (kamisMapping) {
    const result = await tryKamis(name, kamisMapping);
    if (result) return result;
  }

  // 2. 참가격 매핑 확인
  const consumerKeyword = findConsumerKeyword(name);
  if (consumerKeyword) {
    const result = await tryConsumer(name, consumerKeyword);
    if (result) return result;
  }

  // 3. 네이버 쇼핑 폴백
  const naverResult = await tryNaver(name);
  if (naverResult) return naverResult;

  // 4. 정적사전 폴백
  return tryStatic(name);
}

/**
 * 여러 재료 일괄 가격 조회
 */
export async function getIngredientPrices(
  names: string[],
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // KAMIS 데이터 미리 로드 (1회 호출로 전체 캐시)
  const hasKamisNames = names.some((n) => findKamisMapping(n) !== null);
  if (hasKamisNames) {
    await getKamisData();
  }

  // 순차 처리 (API 레이트리밋 보호)
  for (const name of names) {
    const result = await getIngredientPrice(name);
    if (result) {
      results.set(name, result);
    }
  }

  return results;
}

// ─── 소스별 조회 함수 ──────────────────────────────────────────────
async function tryKamis(
  name: string,
  mapping: KamisMapping,
): Promise<PriceResult | null> {
  try {
    const data = await getKamisData();
    const key = `${mapping.itemCode}:${mapping.kindCode}`;
    const items = data.get(key);
    if (!items || items.length === 0) return null;

    // 상품 등급 우선
    const preferred =
      items.find((i) => i.rank === (mapping.rank ?? '상품')) ?? items[0];
    const price = getLatestPrice(preferred);
    if (price === null) return null;

    const trend = calcTrend(preferred) ?? undefined;

    return {
      price,
      unit: preferred.unit,
      source: 'kamis',
      confidence: 0.95,
      trend,
    };
  } catch {
    return null;
  }
}

async function tryConsumer(
  _name: string,
  keyword: string,
): Promise<PriceResult | null> {
  try {
    const result = await getConsumerMedianPrice(keyword);
    if (!result) return null;

    return {
      price: result.price,
      unit: result.unit,
      source: 'consumer',
      confidence: 0.85,
    };
  } catch {
    return null;
  }
}

async function tryNaver(name: string): Promise<PriceResult | null> {
  try {
    const results = await getNaverPrices([name]);
    const item = results.get(name);
    if (!item || item.price === null) return null;

    return {
      price: item.price,
      unit: item.unit,
      source: 'naver',
      confidence: item.confidence,
    };
  } catch {
    return null;
  }
}

function tryStatic(name: string): PriceResult | null {
  // 정적 사전에서 정확한 매칭 또는 부분 매칭
  const entry = PRICE_DICTIONARY[name];
  if (entry) {
    return {
      price: entry.pricePerUnit,
      unit: entry.unit,
      source: 'static',
      confidence: 0.5,
    };
  }

  // 부분 매칭 시도 (재료명이 더 긴 경우)
  for (const [key, val] of Object.entries(PRICE_DICTIONARY)) {
    if (name.includes(key) || key.includes(name)) {
      return {
        price: val.pricePerUnit,
        unit: val.unit,
        source: 'static',
        confidence: 0.3,
      };
    }
  }

  return null;
}

// ─── 매핑 헬퍼 ────────────────────────────────────────────────────
function findKamisMapping(name: string): KamisMapping | null {
  // 정확한 매칭
  if (KAMIS_INGREDIENT_MAP[name]) return KAMIS_INGREDIENT_MAP[name];

  // 부분 매칭 (예: "돼지고기 앞다리" → "돼지고기")
  for (const [key, mapping] of Object.entries(KAMIS_INGREDIENT_MAP)) {
    if (name.includes(key)) return mapping;
  }
  return null;
}

function findConsumerKeyword(name: string): string | null {
  if (CONSUMER_KEYWORD_MAP[name]) return CONSUMER_KEYWORD_MAP[name];

  for (const [key, keyword] of Object.entries(CONSUMER_KEYWORD_MAP)) {
    if (name.includes(key)) return keyword;
  }
  return null;
}
