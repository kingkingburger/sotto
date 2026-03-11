import './lib/load-env';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── KAMIS 재료 매핑 (price-service.ts에서 복제) ───────────────────────
type KamisCategoryCode = '100' | '200' | '500' | '600';

interface KamisMapping {
  itemCode: string;
  kindCode: string;
  categoryCode: KamisCategoryCode;
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

// ─── 참가격 재료 매핑 (price-service.ts에서 복제) ─────────────────────
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
