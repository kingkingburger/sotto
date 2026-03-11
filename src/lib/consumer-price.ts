/**
 * 참가격 (한국소비자원 생필품 가격 정보) API 클라이언트
 * @see https://www.data.go.kr/data/15083256/openapi.do
 */

const BASE_URL = 'https://api.odcloud.kr/api/15083256/v1';
const TIMEOUT_MS = 8000;

// 최신 데이터셋 UUID (2026-01-30 기준) — 월별 업데이트 시 갱신 필요
const LATEST_UUID = 'uddi:018577ec-a736-4341-8a14-8d6051d25f6c';

export interface ConsumerPriceItem {
  productName: string;  // 상품명 (브랜드+규격 포함)
  surveyDate: string;   // 조사일
  price: number;        // 판매가격 (원)
  store: string;        // 판매업소
  manufacturer: string; // 제조사
  onSale: boolean;      // 세일 여부
}

interface RawConsumerItem {
  상품명: string;
  조사일: string;
  판매가격: number;
  판매업소: string;
  제조사: string;
  세일여부: string | null;
  원플러스원: string | null;
}

interface ConsumerResponse {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: RawConsumerItem[];
}

function getApiKey(): string | null {
  return process.env.DATA_GO_KR_API_KEY ?? null;
}

/**
 * 상품명 키워드로 가격 검색
 * @param keyword 검색어 (예: '간장', '참기름', '계란')
 * @param options.perPage 결과 수 (기본 20, 최대 100)
 * @param options.uuid 데이터셋 UUID (기본 최신)
 */
export async function searchConsumerPrices(
  keyword: string,
  options?: { perPage?: number; uuid?: string },
): Promise<ConsumerPriceItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const uuid = options?.uuid ?? LATEST_UUID;
  const perPage = options?.perPage ?? 20;

  const url = new URL(`${BASE_URL}/${uuid}`);
  url.searchParams.set('page', '1');
  url.searchParams.set('perPage', String(perPage));
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('cond[상품명::LIKE]', keyword);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`참가격 API error: ${res.status}`);
    }

    const json: ConsumerResponse = await res.json();

    return json.data.map((raw) => ({
      productName: raw.상품명,
      surveyDate: raw.조사일,
      price: raw.판매가격,
      store: raw.판매업소,
      manufacturer: raw.제조사,
      onSale: raw.세일여부 === 'Y',
    }));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`참가격 timeout for keyword "${keyword}"`);
      return [];
    }
    console.error(`참가격 fetch failed for "${keyword}":`, err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 재료 키워드의 대표 가격 산출
 * - 세일 상품 제외
 * - 중앙값 사용 (극단값 영향 최소화)
 */
export async function getConsumerMedianPrice(
  keyword: string,
): Promise<{ price: number; unit: string; store: string; surveyDate: string } | null> {
  const items = await searchConsumerPrices(keyword, { perPage: 50 });

  // 세일 상품 제외
  const nonSale = items.filter((item) => !item.onSale);
  if (nonSale.length === 0) return null;

  // 가격 기준 정렬 → 중앙값
  const sorted = nonSale.sort((a, b) => a.price - b.price);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];

  // 상품명에서 규격 추출 (예: "백설 카놀라유(900ml)" → "900ml")
  const unitMatch = median.productName.match(/\(([^)]+)\)\s*$/);
  const unit = unitMatch ? unitMatch[1] : '1개';

  return {
    price: median.price,
    unit,
    store: median.store,
    surveyDate: median.surveyDate,
  };
}

/**
 * 여러 재료의 참가격 일괄 조회
 */
export async function getConsumerPrices(
  keywords: string[],
): Promise<Map<string, { price: number; unit: string }>> {
  const result = new Map<string, { price: number; unit: string }>();

  // 순차 호출 (API 부하 방지)
  for (const keyword of keywords) {
    const data = await getConsumerMedianPrice(keyword);
    if (data) {
      result.set(keyword, { price: data.price, unit: data.unit });
    }
  }

  return result;
}
