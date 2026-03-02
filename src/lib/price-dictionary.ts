/**
 * 재료별 가격 사전
 * 기준: 2026 Q1 대형마트 평균가
 * tier: 1=저렴, 2=보통, 3=고가
 */

export const PRICE_BASE_DATE = '2026-Q1';

interface IngredientPrice {
  /** 100g 또는 1개 기준 가격 (원) */
  pricePerUnit: number;
  /** 단위 기준 (g, ml, 개, etc.) */
  unit: string;
  /** 가격 tier: 1=저렴, 2=보통, 3=고가 */
  tier: 1 | 2 | 3;
}

export const PRICE_DICTIONARY: Record<string, IngredientPrice> = {
  // === 육류 (meat) ===
  닭가슴살: { pricePerUnit: 1200, unit: '100g', tier: 2 },
  닭고기: { pricePerUnit: 1000, unit: '100g', tier: 2 },
  닭다리: { pricePerUnit: 1100, unit: '100g', tier: 2 },
  닭날개: { pricePerUnit: 1000, unit: '100g', tier: 2 },
  닭안심: { pricePerUnit: 1300, unit: '100g', tier: 2 },
  소고기: { pricePerUnit: 4000, unit: '100g', tier: 3 },
  쇠고기: { pricePerUnit: 4000, unit: '100g', tier: 3 },
  돼지고기: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  돼지목살: { pricePerUnit: 1800, unit: '100g', tier: 2 },
  돼지삼겹살: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  삼겹살: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  돼지안심: { pricePerUnit: 2200, unit: '100g', tier: 2 },
  돼지등심: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  돼지앞다리살: { pricePerUnit: 1300, unit: '100g', tier: 1 },
  다짐육: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  다진돼지고기: { pricePerUnit: 1400, unit: '100g', tier: 2 },
  다진소고기: { pricePerUnit: 3500, unit: '100g', tier: 3 },
  소시지: { pricePerUnit: 800, unit: '100g', tier: 1 },
  햄: { pricePerUnit: 700, unit: '100g', tier: 1 },
  베이컨: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  스팸: { pricePerUnit: 900, unit: '100g', tier: 1 },

  // === 해산물 (seafood) ===
  새우: { pricePerUnit: 2500, unit: '100g', tier: 3 },
  오징어: { pricePerUnit: 1800, unit: '100g', tier: 2 },
  참치캔: { pricePerUnit: 600, unit: '100g', tier: 1 },
  고등어: { pricePerUnit: 1200, unit: '100g', tier: 2 },
  삼치: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  연어: { pricePerUnit: 3500, unit: '100g', tier: 3 },
  조기: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  갈치: { pricePerUnit: 2500, unit: '100g', tier: 3 },
  멸치: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  꽁치: { pricePerUnit: 800, unit: '100g', tier: 1 },
  바지락: { pricePerUnit: 1200, unit: '100g', tier: 2 },
  조개: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  김: { pricePerUnit: 500, unit: '100g', tier: 1 },
  미역: { pricePerUnit: 400, unit: '100g', tier: 1 },
  다시마: { pricePerUnit: 500, unit: '100g', tier: 1 },
  어묵: { pricePerUnit: 600, unit: '100g', tier: 1 },
  맛살: { pricePerUnit: 500, unit: '100g', tier: 1 },
  게맛살: { pricePerUnit: 500, unit: '100g', tier: 1 },

  // === 채소류 (vegetable) ===
  양파: { pricePerUnit: 200, unit: '100g', tier: 1 },
  대파: { pricePerUnit: 300, unit: '100g', tier: 1 },
  파: { pricePerUnit: 300, unit: '100g', tier: 1 },
  쪽파: { pricePerUnit: 400, unit: '100g', tier: 1 },
  마늘: { pricePerUnit: 500, unit: '100g', tier: 1 },
  다진마늘: { pricePerUnit: 500, unit: '100g', tier: 1 },
  생강: { pricePerUnit: 600, unit: '100g', tier: 1 },
  당근: { pricePerUnit: 250, unit: '100g', tier: 1 },
  감자: { pricePerUnit: 200, unit: '100g', tier: 1 },
  고구마: { pricePerUnit: 300, unit: '100g', tier: 1 },
  배추: { pricePerUnit: 150, unit: '100g', tier: 1 },
  양배추: { pricePerUnit: 150, unit: '100g', tier: 1 },
  시금치: { pricePerUnit: 500, unit: '100g', tier: 1 },
  깻잎: { pricePerUnit: 400, unit: '100g', tier: 1 },
  상추: { pricePerUnit: 400, unit: '100g', tier: 1 },
  콩나물: { pricePerUnit: 200, unit: '100g', tier: 1 },
  숙주: { pricePerUnit: 250, unit: '100g', tier: 1 },
  숙주나물: { pricePerUnit: 250, unit: '100g', tier: 1 },
  브로콜리: { pricePerUnit: 500, unit: '100g', tier: 1 },
  파프리카: { pricePerUnit: 600, unit: '100g', tier: 1 },
  피망: { pricePerUnit: 500, unit: '100g', tier: 1 },
  청양고추: { pricePerUnit: 400, unit: '100g', tier: 1 },
  고추: { pricePerUnit: 400, unit: '100g', tier: 1 },
  풋고추: { pricePerUnit: 400, unit: '100g', tier: 1 },
  오이: { pricePerUnit: 300, unit: '100g', tier: 1 },
  호박: { pricePerUnit: 300, unit: '100g', tier: 1 },
  애호박: { pricePerUnit: 300, unit: '100g', tier: 1 },
  가지: { pricePerUnit: 400, unit: '100g', tier: 1 },
  무: { pricePerUnit: 150, unit: '100g', tier: 1 },
  토마토: { pricePerUnit: 500, unit: '100g', tier: 1 },
  방울토마토: { pricePerUnit: 600, unit: '100g', tier: 1 },
  버섯: { pricePerUnit: 400, unit: '100g', tier: 1 },
  표고버섯: { pricePerUnit: 600, unit: '100g', tier: 1 },
  팽이버섯: { pricePerUnit: 300, unit: '100g', tier: 1 },
  새송이버섯: { pricePerUnit: 400, unit: '100g', tier: 1 },
  느타리버섯: { pricePerUnit: 350, unit: '100g', tier: 1 },
  셀러리: { pricePerUnit: 500, unit: '100g', tier: 1 },
  부추: { pricePerUnit: 350, unit: '100g', tier: 1 },
  미나리: { pricePerUnit: 400, unit: '100g', tier: 1 },
  연근: { pricePerUnit: 800, unit: '100g', tier: 1 },
  우엉: { pricePerUnit: 600, unit: '100g', tier: 1 },

  // === 두부/콩류 (tofu) ===
  두부: { pricePerUnit: 250, unit: '100g', tier: 1 },
  순두부: { pricePerUnit: 300, unit: '100g', tier: 1 },

  // === 달걀류 (egg) ===
  달걀: { pricePerUnit: 300, unit: '개', tier: 1 },
  계란: { pricePerUnit: 300, unit: '개', tier: 1 },
  메추리알: { pricePerUnit: 100, unit: '개', tier: 1 },

  // === 유제품 (dairy) ===
  우유: { pricePerUnit: 250, unit: '100ml', tier: 1 },
  치즈: { pricePerUnit: 800, unit: '100g', tier: 2 },
  모짜렐라치즈: { pricePerUnit: 1000, unit: '100g', tier: 2 },
  슬라이스치즈: { pricePerUnit: 700, unit: '100g', tier: 2 },
  크림치즈: { pricePerUnit: 1200, unit: '100g', tier: 2 },
  버터: { pricePerUnit: 1000, unit: '100g', tier: 2 },
  생크림: { pricePerUnit: 600, unit: '100ml', tier: 2 },
  요거트: { pricePerUnit: 400, unit: '100g', tier: 1 },

  // === 곡류 (grain) ===
  쌀: { pricePerUnit: 300, unit: '100g', tier: 1 },
  찹쌀: { pricePerUnit: 400, unit: '100g', tier: 1 },
  현미: { pricePerUnit: 350, unit: '100g', tier: 1 },
  밀가루: { pricePerUnit: 150, unit: '100g', tier: 1 },
  부침가루: { pricePerUnit: 200, unit: '100g', tier: 1 },
  튀김가루: { pricePerUnit: 200, unit: '100g', tier: 1 },
  빵가루: { pricePerUnit: 300, unit: '100g', tier: 1 },
  전분: { pricePerUnit: 200, unit: '100g', tier: 1 },
  감자전분: { pricePerUnit: 250, unit: '100g', tier: 1 },
  옥수수전분: { pricePerUnit: 200, unit: '100g', tier: 1 },
  식빵: { pricePerUnit: 300, unit: '100g', tier: 1 },
  떡: { pricePerUnit: 500, unit: '100g', tier: 1 },
  떡볶이떡: { pricePerUnit: 400, unit: '100g', tier: 1 },

  // === 면류 (noodle) ===
  소면: { pricePerUnit: 300, unit: '100g', tier: 1 },
  라면: { pricePerUnit: 400, unit: '개', tier: 1 },
  당면: { pricePerUnit: 400, unit: '100g', tier: 1 },
  우동면: { pricePerUnit: 350, unit: '100g', tier: 1 },
  스파게티면: { pricePerUnit: 400, unit: '100g', tier: 1 },
  파스타면: { pricePerUnit: 400, unit: '100g', tier: 1 },
  칼국수면: { pricePerUnit: 300, unit: '100g', tier: 1 },

  // === 양념/조미료 (seasoning) ===
  소금: { pricePerUnit: 50, unit: '100g', tier: 1 },
  설탕: { pricePerUnit: 100, unit: '100g', tier: 1 },
  후추: { pricePerUnit: 500, unit: '100g', tier: 1 },
  후춧가루: { pricePerUnit: 500, unit: '100g', tier: 1 },
  깨: { pricePerUnit: 800, unit: '100g', tier: 1 },
  참깨: { pricePerUnit: 800, unit: '100g', tier: 1 },
  깨소금: { pricePerUnit: 800, unit: '100g', tier: 1 },
  고춧가루: { pricePerUnit: 1500, unit: '100g', tier: 1 },
  고추장: { pricePerUnit: 500, unit: '100g', tier: 1 },
  된장: { pricePerUnit: 400, unit: '100g', tier: 1 },
  간장: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  진간장: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  국간장: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  식초: { pricePerUnit: 150, unit: '100ml', tier: 1 },
  맛술: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  미림: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  청주: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  물엿: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  올리고당: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  카레가루: { pricePerUnit: 400, unit: '100g', tier: 1 },
  카레: { pricePerUnit: 400, unit: '100g', tier: 1 },

  // === 소스류 (sauce) ===
  케첩: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  마요네즈: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  돈까스소스: { pricePerUnit: 300, unit: '100ml', tier: 1 },
  굴소스: { pricePerUnit: 400, unit: '100ml', tier: 1 },
  쌈장: { pricePerUnit: 400, unit: '100g', tier: 1 },
  토마토소스: { pricePerUnit: 400, unit: '100ml', tier: 1 },
  스리라차: { pricePerUnit: 500, unit: '100ml', tier: 1 },
  머스타드: { pricePerUnit: 400, unit: '100ml', tier: 1 },

  // === 기름류 (oil) ===
  식용유: { pricePerUnit: 200, unit: '100ml', tier: 1 },
  참기름: { pricePerUnit: 800, unit: '100ml', tier: 1 },
  들기름: { pricePerUnit: 1000, unit: '100ml', tier: 1 },
  올리브유: { pricePerUnit: 600, unit: '100ml', tier: 1 },
  포도씨유: { pricePerUnit: 400, unit: '100ml', tier: 1 },

  // === 기타 (other) ===
  김치: { pricePerUnit: 400, unit: '100g', tier: 1 },
  배추김치: { pricePerUnit: 400, unit: '100g', tier: 1 },
  깍두기: { pricePerUnit: 400, unit: '100g', tier: 1 },
  젓갈: { pricePerUnit: 800, unit: '100g', tier: 1 },
  멸치액젓: { pricePerUnit: 500, unit: '100ml', tier: 1 },
  액젓: { pricePerUnit: 500, unit: '100ml', tier: 1 },
  피쉬소스: { pricePerUnit: 500, unit: '100ml', tier: 1 },
  견과류: { pricePerUnit: 2000, unit: '100g', tier: 2 },
  아몬드: { pricePerUnit: 2500, unit: '100g', tier: 2 },
  호두: { pricePerUnit: 2500, unit: '100g', tier: 2 },
  잣: { pricePerUnit: 5000, unit: '100g', tier: 3 },
  밤: { pricePerUnit: 800, unit: '100g', tier: 1 },
  대추: { pricePerUnit: 1500, unit: '100g', tier: 2 },
  건포도: { pricePerUnit: 1000, unit: '100g', tier: 1 },
};

/**
 * 재료명으로 가격 정보를 조회합니다. (exact match, 공백/대소문자 정규화)
 */
export function lookupPrice(ingredientName: string): IngredientPrice | null {
  const normalized = ingredientName.trim().toLowerCase();
  return PRICE_DICTIONARY[normalized] ?? null;
}

/**
 * 재료 목록의 tier 가중 평균을 계산하여 최종 price_tier를 반환합니다.
 * @returns { tier, confidence } — confidence는 매칭 성공률 (0.0-1.0)
 */
export function calculatePriceTier(
  ingredients: { name: string }[],
): { tier: number; confidence: number } {
  if (ingredients.length === 0) {
    return { tier: 2, confidence: 0 };
  }

  let matchedCount = 0;
  let tierSum = 0;

  for (const ing of ingredients) {
    const price = lookupPrice(ing.name);
    if (price) {
      matchedCount++;
      tierSum += price.tier;
    }
  }

  if (matchedCount === 0) {
    return { tier: 2, confidence: 0 };
  }

  const confidence = matchedCount / ingredients.length;
  const avgTier = tierSum / matchedCount;
  const tier = Math.round(avgTier);

  return {
    tier: Math.max(1, Math.min(3, tier)),
    confidence: Math.round(confidence * 100) / 100,
  };
}
