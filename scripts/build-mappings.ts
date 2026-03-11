import './lib/load-env';
import { createClient } from '@supabase/supabase-js';
import {
  KAMIS_INGREDIENT_MAP,
  CONSUMER_KEYWORD_MAP,
  type KamisMapping,
} from '../src/lib/price-service';
import type { KamisCategoryCode } from '../src/lib/kamis';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── 카테고리 → standard_unit 매핑 ───────────────────────────────────
type IngredientCategory =
  | 'vegetable'
  | 'meat'
  | 'seafood'
  | 'grain'
  | 'seasoning'
  | 'other';

function categoryToUnit(category: IngredientCategory): string {
  switch (category) {
    case 'meat':
      return '100g';
    case 'seafood':
      return '100g';
    case 'grain':
      return '1kg';
    case 'vegetable':
      return '1개';
    case 'seasoning':
      return '1개';
    default:
      return '1개';
  }
}

// ─── KAMIS categoryCode → IngredientCategory ─────────────────────────
function kamisCategoryToIngredient(
  code: KamisCategoryCode,
): IngredientCategory {
  switch (code) {
    case '200':
      return 'vegetable';
    case '500':
      return 'meat';
    case '600':
      return 'seafood';
    case '100':
      return 'grain';
    default:
      return 'other';
  }
}

// ─── 매핑 탐색 헬퍼 ──────────────────────────────────────────────────
function findKamisMapping(name: string): KamisMapping | null {
  if (KAMIS_INGREDIENT_MAP[name]) return KAMIS_INGREDIENT_MAP[name];
  for (const [key, mapping] of Object.entries(KAMIS_INGREDIENT_MAP)) {
    if (name.includes(key)) return mapping;
  }
  return null;
}

function findConsumerKeyword(name: string): string | null {
  if (CONSUMER_KEYWORD_MAP[name]) return CONSUMER_KEYWORD_MAP[name];
  for (const key of Object.keys(CONSUMER_KEYWORD_MAP)) {
    if (name.includes(key)) return CONSUMER_KEYWORD_MAP[key];
  }
  return null;
}

// ─── ingredient_mappings 행 타입 ─────────────────────────────────────
interface MappingRow {
  ingredient_name: string;
  kamis_item_code: string | null;
  kamis_kind_code: string | null;
  kamis_category_code: string | null;
  consumer_search_keyword: string | null;
  category: IngredientCategory;
  standard_unit: string;
}

// ─── 메인 ────────────────────────────────────────────────────────────
async function buildMappings(): Promise<void> {
  // 1. recipe_ingredients에서 고유 재료명 조회
  const { data: rows, error: fetchError } = await supabase
    .from('recipe_ingredients')
    .select('name');

  if (fetchError) {
    throw new Error(`Failed to fetch recipe_ingredients: ${fetchError.message}`);
  }

  const allNames = (rows ?? []) as { name: string }[];
  const uniqueNames = [...new Set(allNames.map((r) => r.name).filter(Boolean))];
  console.log(`Found ${uniqueNames.length} distinct ingredient names`);

  // 2. 각 이름에 대해 매핑 결정
  const mappings: MappingRow[] = [];
  let kamisCount = 0;
  let consumerCount = 0;
  let unmappedCount = 0;

  for (const name of uniqueNames) {
    const kamisMapping = findKamisMapping(name);
    const consumerKeyword = findConsumerKeyword(name);

    if (kamisMapping) {
      const category = kamisCategoryToIngredient(kamisMapping.categoryCode);
      mappings.push({
        ingredient_name: name,
        kamis_item_code: kamisMapping.itemCode,
        kamis_kind_code: kamisMapping.kindCode,
        kamis_category_code: kamisMapping.categoryCode,
        consumer_search_keyword: consumerKeyword,
        category,
        standard_unit: categoryToUnit(category),
      });
      kamisCount++;
      continue;
    }

    if (consumerKeyword) {
      mappings.push({
        ingredient_name: name,
        kamis_item_code: null,
        kamis_kind_code: null,
        kamis_category_code: null,
        consumer_search_keyword: consumerKeyword,
        category: 'seasoning',
        standard_unit: categoryToUnit('seasoning'),
      });
      consumerCount++;
      continue;
    }

    unmappedCount++;
  }

  console.log(
    `Mapping summary: KAMIS=${kamisCount}, consumer=${consumerCount}, unmapped=${unmappedCount}`,
  );

  if (mappings.length === 0) {
    console.log('No mappings to upsert.');
    return;
  }

  // 3. Supabase에 UPSERT (idempotent)
  const BATCH_SIZE = 100;
  let upserted = 0;

  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('ingredient_mappings')
      .upsert(batch, { onConflict: 'ingredient_name' });

    if (upsertError) {
      throw new Error(`Failed to upsert batch at offset ${i}: ${upsertError.message}`);
    }

    upserted += batch.length;
    console.log(`Upserted ${upserted}/${mappings.length} mappings`);
  }

  // 4. 최종 통계 출력
  console.log('');
  console.log('=== Build Mappings Complete ===');
  console.log(`Total ingredient names:  ${uniqueNames.length}`);
  console.log(`  KAMIS mapped:          ${kamisCount}`);
  console.log(`  Consumer mapped:       ${consumerCount}`);
  console.log(`  Unmapped:              ${unmappedCount}`);
  console.log(`Rows upserted:           ${upserted}`);
}

buildMappings().catch((err) => {
  console.error('build-mappings failed:', err);
  process.exit(1);
});
