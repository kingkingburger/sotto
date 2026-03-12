/**
 * 레시피별 예상 가격(원) + price_tier + price_confidence 자동 추정 스크립트
 * Usage: bun run estimate-prices
 */

import { supabase } from './lib/supabase';
import { calculatePrice, PRICE_BASE_DATE } from '../src/lib/price-dictionary';

async function main() {
  console.log(`\n=== 레시피 가격 추정 스크립트 ===`);
  console.log(`가격 기준: ${PRICE_BASE_DATE} 대형마트 평균가\n`);

  // 1. 모든 레시피 ID 조회
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name')
    .order('name');

  if (recipeError) {
    console.error('레시피 조회 실패:', recipeError.message);
    process.exit(1);
  }

  console.log(`총 ${recipes.length}개 레시피 처리 시작\n`);

  let updated = 0;
  let skipped = 0;
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  const prices: number[] = [];

  // 2. 레시피별 재료 조회 → 가격 계산 → 업데이트
  for (const recipe of recipes) {
    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('name')
      .eq('recipe_id', recipe.id);

    if (ingError) {
      console.warn(`  [SKIP] ${recipe.name}: 재료 조회 실패 - ${ingError.message}`);
      skipped++;
      continue;
    }

    if (!ingredients || ingredients.length === 0) {
      console.warn(`  [SKIP] ${recipe.name}: 재료 없음`);
      skipped++;
      continue;
    }

    const { estimatedPrice, tier, confidence } = calculatePrice(ingredients);

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        estimated_price: estimatedPrice,
        price_tier: tier,
        price_confidence: confidence,
      })
      .eq('id', recipe.id);

    if (updateError) {
      console.warn(`  [FAIL] ${recipe.name}: 업데이트 실패 - ${updateError.message}`);
      skipped++;
      continue;
    }

    console.log(`  [OK] ${recipe.name}: 약 ${estimatedPrice.toLocaleString()}원 (tier ${tier}, conf ${confidence})`);
    tierCounts[tier as 1 | 2 | 3]++;
    prices.push(estimatedPrice);
    updated++;
  }

  // 3. 결과 요약
  const avgPrice =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;

  console.log(`\n=== 결과 요약 ===`);
  console.log(`업데이트: ${updated}개`);
  console.log(`스킵: ${skipped}개`);
  console.log(`\n가격 분포:`);
  console.log(`  ~5,000원 (저렴): ${tierCounts[1]}개`);
  console.log(`  ~10,000원 (보통): ${tierCounts[2]}개`);
  console.log(`  10,000원~ (고가): ${tierCounts[3]}개`);
  console.log(`\n평균 예상 가격: 약 ${avgPrice.toLocaleString()}원`);
  console.log(`(confidence >= 0.5인 레시피만 가격이 UI에 표시됩니다)\n`);
}

main().catch(console.error);
