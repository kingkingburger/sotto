/**
 * 일일 가격 수집 스크립트 — KAMIS + 참가격 → ingredient_prices 저장
 * Usage: bun run scripts/fetch-prices.ts
 */
import { supabase } from './lib/supabase';
import { fetchAllDailyPrices, getLatestPrice } from '../src/lib/kamis';
import { getConsumerMedianPrice } from '../src/lib/consumer-price';
const today = new Date().toISOString().split('T')[0];

async function main() {
  console.log(`\n=== 일일 가격 수집 스크립트 ===`);
  console.log(`날짜: ${today}\n`);

  // ── KAMIS ──────────────────────────────────────────────────────────────────

  let kamisFetched = 0;
  let kamisSaved = 0;
  let kamisFailed = 0;

  try {
    // 1. KAMIS 매핑 재료 조회
    const { data: kamisMappings, error: kamisMappingError } = await supabase
      .from('ingredient_mappings')
      .select('ingredient_name, kamis_item_code, kamis_kind_code')
      .not('kamis_item_code', 'is', null);

    if (kamisMappingError) {
      console.error('KAMIS 매핑 조회 실패:', kamisMappingError.message);
    } else if (kamisMappings && kamisMappings.length > 0) {
      console.log(`KAMIS 매핑 재료: ${kamisMappings.length}개`);

      // 2. 전체 KAMIS 일일 가격 조회
      console.log('KAMIS API 호출 중...');
      const allPrices = await fetchAllDailyPrices();
      console.log(`KAMIS 가격 데이터: ${allPrices.length}개 품목\n`);

      // 3. 매핑별 가격 매칭 및 upsert
      for (const mapping of kamisMappings) {
        kamisFetched++;

        const item = allPrices.find(
          (p) =>
            p.itemCode === mapping.kamis_item_code &&
            (!mapping.kamis_kind_code || p.kindCode === mapping.kamis_kind_code),
        );

        if (!item) {
          console.warn(`  [MISS] ${mapping.ingredient_name}: 가격 데이터 없음`);
          kamisFailed++;
          continue;
        }

        const price = getLatestPrice(item);
        if (price === null) {
          console.warn(`  [MISS] ${mapping.ingredient_name}: 유효 가격 없음`);
          kamisFailed++;
          continue;
        }

        const row = {
          ingredient_name: mapping.ingredient_name,
          source: 'kamis',
          price,
          unit: item.unit,
          fetched_at: today,
          grade: item.rank,
        };

        const { error: upsertError } = await supabase
          .from('ingredient_prices')
          .upsert(row, { onConflict: 'ingredient_name,source,fetched_at' });

        if (upsertError) {
          console.warn(`  [FAIL] ${mapping.ingredient_name}: ${upsertError.message}`);
          kamisFailed++;
        } else {
          console.log(`  [OK] ${mapping.ingredient_name}: ${price.toLocaleString()}원/${item.unit} (${item.rank})`);
          kamisSaved++;
        }
      }
    }
  } catch (err) {
    console.error('KAMIS 처리 중 오류:', err);
  }

  // ── 참가격 ─────────────────────────────────────────────────────────────────

  let consumerFetched = 0;
  let consumerSaved = 0;
  let consumerFailed = 0;

  try {
    // 4. 참가격 매핑 재료 조회
    const { data: consumerMappings, error: consumerMappingError } = await supabase
      .from('ingredient_mappings')
      .select('ingredient_name, consumer_search_keyword')
      .not('consumer_search_keyword', 'is', null);

    if (consumerMappingError) {
      console.error('참가격 매핑 조회 실패:', consumerMappingError.message);
    } else if (consumerMappings && consumerMappings.length > 0) {
      console.log(`\n참가격 매핑 재료: ${consumerMappings.length}개`);

      // 5. 재료별 참가격 조회 및 upsert
      for (const mapping of consumerMappings) {
        consumerFetched++;

        const result = await getConsumerMedianPrice(mapping.consumer_search_keyword);

        if (!result) {
          console.warn(`  [MISS] ${mapping.ingredient_name} ("${mapping.consumer_search_keyword}"): 가격 없음`);
          consumerFailed++;
          continue;
        }

        const row = {
          ingredient_name: mapping.ingredient_name,
          source: 'consumer',
          price: result.price,
          unit: result.unit,
          fetched_at: today,
        };

        const { error: upsertError } = await supabase
          .from('ingredient_prices')
          .upsert(row, { onConflict: 'ingredient_name,source,fetched_at' });

        if (upsertError) {
          console.warn(`  [FAIL] ${mapping.ingredient_name}: ${upsertError.message}`);
          consumerFailed++;
        } else {
          console.log(`  [OK] ${mapping.ingredient_name}: ${result.price.toLocaleString()}원/${result.unit}`);
          consumerSaved++;
        }
      }
    }
  } catch (err) {
    console.error('참가격 처리 중 오류:', err);
  }

  // ── 결과 요약 ──────────────────────────────────────────────────────────────

  console.log(`\n=== 결과 요약 ===`);
  console.log(`KAMIS:    조회 ${kamisFetched}개, 저장 ${kamisSaved}개, 실패 ${kamisFailed}개`);
  console.log(`참가격:   조회 ${consumerFetched}개, 저장 ${consumerSaved}개, 실패 ${consumerFailed}개`);
  console.log(`DB 저장 합계: ${kamisSaved + consumerSaved}개\n`);
}

main().catch((err) => {
  console.error('fetch-prices failed:', err);
  process.exit(1);
});
