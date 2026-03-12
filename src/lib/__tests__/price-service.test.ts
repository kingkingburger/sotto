/**
 * price-service.ts 유닛 테스트
 *
 * 외부 API(KAMIS, 참가격, 네이버)는 모두 vi.mock으로 격리.
 * 테스트 대상: 매핑 헬퍼, 폴백 체인, 정적사전, normalizeName 동작.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── 외부 의존성 모킹 ──────────────────────────────────────────────────
vi.mock('@/lib/kamis', () => ({
  fetchAllDailyPrices: vi.fn().mockResolvedValue([]),
  getLatestPrice: vi.fn().mockReturnValue(null),
  calcTrend: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/consumer-price', () => ({
  getConsumerMedianPrice: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/naver-shopping', () => ({
  getIngredientPrices: vi.fn().mockResolvedValue(new Map()),
}));

import {
  KAMIS_INGREDIENT_MAP,
  CONSUMER_KEYWORD_MAP,
  getIngredientPrice,
  getIngredientPrices,
  type PriceResult,
} from '@/lib/price-service';
import * as kamis from '@/lib/kamis';
import * as consumerPrice from '@/lib/consumer-price';
import * as naverShopping from '@/lib/naver-shopping';

// 모든 테스트 전 mock 초기화 + 캐시 리셋
// price-service.ts 모듈 캐시(kamisCache)를 초기화하기 위해
// fetchAllDailyPrices가 빈 배열을 반환하게 하고,
// 이전 테스트에서 채워진 캐시가 다음 테스트에 영향을 주지 않도록
// 각 테스트마다 모듈을 새로 import하는 대신 mock을 충분히 제어한다.
beforeEach(() => {
  vi.mocked(kamis.fetchAllDailyPrices).mockResolvedValue([]);
  vi.mocked(kamis.getLatestPrice).mockReturnValue(null);
  vi.mocked(kamis.calcTrend).mockReturnValue(null);
  vi.mocked(consumerPrice.getConsumerMedianPrice).mockResolvedValue(null);
  vi.mocked(naverShopping.getIngredientPrices).mockResolvedValue(new Map());
});

// ── KAMIS_INGREDIENT_MAP ─────────────────────────────────────────────
describe('KAMIS_INGREDIENT_MAP', () => {
  it('주요 채소가 매핑에 존재한다', () => {
    expect(KAMIS_INGREDIENT_MAP['양파']).toBeDefined();
    expect(KAMIS_INGREDIENT_MAP['당근']).toBeDefined();
    expect(KAMIS_INGREDIENT_MAP['마늘']).toBeDefined();
    expect(KAMIS_INGREDIENT_MAP['대파']).toBeDefined();
  });

  it('주요 축산물이 매핑에 존재한다', () => {
    expect(KAMIS_INGREDIENT_MAP['계란']).toBeDefined();
    expect(KAMIS_INGREDIENT_MAP['닭고기']).toBeDefined();
    expect(KAMIS_INGREDIENT_MAP['돼지고기']).toBeDefined();
  });

  it('양파 매핑의 categoryCode는 채소류(200)다', () => {
    expect(KAMIS_INGREDIENT_MAP['양파'].categoryCode).toBe('200');
  });

  it('계란 매핑의 categoryCode는 축산물(500)다', () => {
    expect(KAMIS_INGREDIENT_MAP['계란'].categoryCode).toBe('500');
  });

  it('각 매핑 항목은 itemCode와 kindCode를 갖는다', () => {
    for (const [, mapping] of Object.entries(KAMIS_INGREDIENT_MAP)) {
      expect(mapping.itemCode).toBeTruthy();
      expect(mapping.kindCode).toBeDefined();
      expect(mapping.categoryCode).toBeTruthy();
    }
  });
});

// ── CONSUMER_KEYWORD_MAP ─────────────────────────────────────────────
describe('CONSUMER_KEYWORD_MAP', () => {
  it('주요 가공식품 키워드가 존재한다', () => {
    expect(CONSUMER_KEYWORD_MAP['간장']).toBe('간장');
    expect(CONSUMER_KEYWORD_MAP['고추장']).toBe('고추장');
    expect(CONSUMER_KEYWORD_MAP['참기름']).toBe('참기름');
  });

  it('멸치액젓은 "액젓"으로 매핑된다', () => {
    expect(CONSUMER_KEYWORD_MAP['멸치액젓']).toBe('액젓');
  });

  it('스파게티면은 "스파게티"로 매핑된다', () => {
    expect(CONSUMER_KEYWORD_MAP['스파게티면']).toBe('스파게티');
  });
});

// ── 폴백 체인: 정적사전 ──────────────────────────────────────────────
describe('getIngredientPrice — 정적사전 폴백', () => {
  it('KAMIS/참가격/네이버 모두 실패 시 정적사전에서 결과를 반환한다', async () => {
    // 소금은 PRICE_DICTIONARY에 있고 KAMIS/참가격 매핑 없음
    const result = await getIngredientPrice('소금');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('static');
    expect(result!.price).toBeGreaterThan(0);
    expect(result!.confidence).toBe(0.5);
  });

  it('사전에 없는 재료는 null을 반환한다', async () => {
    const result = await getIngredientPrice('존재하지않는재료xyz');
    expect(result).toBeNull();
  });

  it('정적사전 결과에 unit 필드가 있다', async () => {
    const result = await getIngredientPrice('설탕');
    expect(result).not.toBeNull();
    expect(typeof result!.unit).toBe('string');
    expect(result!.unit.length).toBeGreaterThan(0);
  });
});

// ── 폴백 체인: KAMIS 성공 ────────────────────────────────────────────
describe('getIngredientPrice — KAMIS 폴백', () => {
  beforeEach(() => {
    vi.mocked(kamis.fetchAllDailyPrices).mockResolvedValue([
      {
        itemCode: '223',
        kindCode: '00',
        itemName: '양파',
        kindName: '양파',
        unit: '1kg',
        rank: '상품',
        countyCode: '1101',
        countyName: '서울',
        marketCode: '2',
        marketName: '경동시장',
        day1: '2000',
        day2: '2100',
        day3: '1900',
        day4: '-',
        day5: '-',
        day6: '-',
        day7: '-',
      },
    ]);
    vi.mocked(kamis.getLatestPrice).mockReturnValue(2000);
    vi.mocked(kamis.calcTrend).mockReturnValue({
      direction: 'up',
      changePercent: 5,
    });
  });

  it('KAMIS 데이터가 있으면 source가 kamis다', async () => {
    const result = await getIngredientPrice('양파');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('kamis');
    expect(result!.price).toBe(2000);
    expect(result!.confidence).toBe(0.95);
  });

  it('KAMIS 결과에 trend 정보가 포함된다', async () => {
    const result = await getIngredientPrice('양파');
    expect(result!.trend).toBeDefined();
    expect(result!.trend!.direction).toBe('up');
    expect(result!.trend!.changePercent).toBe(5);
  });
});

// ── 폴백 체인: 참가격 성공 ──────────────────────────────────────────
describe('getIngredientPrice — 참가격 폴백', () => {
  beforeEach(() => {
    vi.mocked(consumerPrice.getConsumerMedianPrice).mockResolvedValue({
      price: 3500,
      unit: '500ml',
    });
  });

  it('참가격 데이터가 있으면 source가 consumer다', async () => {
    const result = await getIngredientPrice('간장');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('consumer');
    expect(result!.price).toBe(3500);
    expect(result!.confidence).toBe(0.85);
  });
});

// ── 폴백 체인: 네이버 성공 ──────────────────────────────────────────
describe('getIngredientPrice — 네이버 폴백', () => {
  beforeEach(() => {
    vi.mocked(naverShopping.getIngredientPrices).mockResolvedValue(
      new Map([['연어', { price: 5000, unit: '100g', confidence: 0.7 }]]),
    );
  });

  it('네이버 데이터가 있으면 source가 naver다', async () => {
    // 연어는 KAMIS/참가격 매핑 없음 → 네이버로 넘어감
    const result = await getIngredientPrice('연어');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('naver');
    expect(result!.price).toBe(5000);
    expect(result!.confidence).toBe(0.7);
  });
});

// ── normalizeName 간접 테스트 ────────────────────────────────────────
describe('이름 정규화 동작 (findKamisMapping 경유)', () => {
  it('괄호 포함 재료명에서 KAMIS 매핑을 찾는다 (달걀(대)→달걀 정규화)', async () => {
    // 달걀(대)에서 괄호 제거 → 달걀 → KAMIS 매핑 발견
    // fetchAllDailyPrices는 빈 배열 → getLatestPrice null → KAMIS 실패
    // 참가격/네이버도 null → 정적사전 폴백 (달걀은 정적사전에 있음)
    const result = await getIngredientPrice('달걀(대)');
    // KAMIS 매핑은 발견되지만 데이터 없음 → 정적사전까지 내려감
    expect(result).not.toBeNull();
    // 정규화로 KAMIS 매핑 경로를 시도했으므로 source는 static (데이터 없으므로 폴백)
    expect(['kamis', 'static']).toContain(result!.source);
  });

  it('수량+단위가 포함된 재료명도 정규화된다 (마늘200g→마늘)', async () => {
    // 마늘200g에서 수량 제거 → 마늘 → KAMIS 매핑 발견 → 데이터 없음 → 정적사전
    const result = await getIngredientPrice('마늘200g');
    expect(result).not.toBeNull();
  });
});

// ── getIngredientPrices (배치) ────────────────────────────────────────
describe('getIngredientPrices — 배치 조회', () => {
  it('빈 배열을 전달하면 빈 Map을 반환한다', async () => {
    const results = await getIngredientPrices([]);
    expect(results.size).toBe(0);
  });

  it('정적사전에 있는 여러 재료를 일괄 조회한다', async () => {
    const results = await getIngredientPrices(['소금', '설탕', '후추']);
    expect(results.size).toBe(3);
    expect(results.get('소금')!.source).toBe('static');
    expect(results.get('설탕')!.source).toBe('static');
    expect(results.get('후추')!.source).toBe('static');
  });

  it('미매핑 재료는 결과 Map에 포함되지 않는다', async () => {
    const results = await getIngredientPrices(['없는재료abc']);
    expect(results.has('없는재료abc')).toBe(false);
  });

  it('PriceResult 구조가 올바르다', async () => {
    const results = await getIngredientPrices(['간장']);
    const item = results.get('간장') as PriceResult;
    expect(item).toBeDefined();
    expect(typeof item.price).toBe('number');
    expect(typeof item.unit).toBe('string');
    expect(typeof item.source).toBe('string');
    expect(typeof item.confidence).toBe('number');
    expect(item.confidence).toBeGreaterThanOrEqual(0);
    expect(item.confidence).toBeLessThanOrEqual(1);
  });
});
