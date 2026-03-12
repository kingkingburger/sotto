import { supabase } from './lib/supabase';
import {
  KAMIS_INGREDIENT_MAP,
  CONSUMER_KEYWORD_MAP,
  type KamisMapping,
} from '../src/lib/price-service';
import type { KamisCategoryCode } from '../src/lib/kamis';

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

// ─── 재료명 정규화 ────────────────────────────────────────────────────
/**
 * 재료명에서 수량/단위/부연 설명을 제거하여 핵심 이름만 추출
 * 예: "돼지고기(목살) 300g" → "돼지고기"
 *     "간장 1큰술" → "간장"
 *     "양파(국내산) 1/2개" → "양파"
 */
function normalizeIngredientName(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')                            // 괄호 및 내용 제거: (목살), (국내산)
    .replace(/\d+\/\d+/g, '')                           // 분수 제거: 1/2, 1/3
    .replace(/\d+[.,]?\d*\s*(?:g|kg|ml|l|cc|L|G|Kg|ML)/gi, '') // 용량 단위: 300g, 1.5kg, 200ml
    .replace(/\d+\s*(?:큰술|작은술|컵|개|장|봉|캔|모|팩|포|줄|마리|토막|쪽|알|줌|움큼|꼬집)/g, '') // 조리 단위
    .replace(/약간|조금|적당량|적당히|소량|다량|취향껏/g, '') // 분량 표현
    .replace(/[,·×x\*]/g, '')                           // 구분자 제거
    .replace(/\s+/g, ' ')                               // 다중 공백 → 단일
    .trim();
}

// ─── 매핑 탐색 헬퍼 ──────────────────────────────────────────────────
function findKamisMapping(name: string): KamisMapping | null {
  const normalized = normalizeIngredientName(name);

  // 1. 정확한 매칭 (원본 → 정규화 순)
  if (KAMIS_INGREDIENT_MAP[name]) return KAMIS_INGREDIENT_MAP[name];
  if (KAMIS_INGREDIENT_MAP[normalized]) return KAMIS_INGREDIENT_MAP[normalized];

  // 2. 부분 매칭: 정규화된 이름이 맵 키를 포함하거나, 맵 키가 정규화된 이름을 포함
  for (const [key, mapping] of Object.entries(KAMIS_INGREDIENT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return mapping;
  }

  // 3. 원본으로 부분 매칭 재시도 (정규화로 유실된 경우 복구)
  for (const [key, mapping] of Object.entries(KAMIS_INGREDIENT_MAP)) {
    if (name.includes(key)) return mapping;
  }

  return null;
}

function findConsumerKeyword(name: string): string | null {
  const normalized = normalizeIngredientName(name);

  // 1. 정확한 매칭
  if (CONSUMER_KEYWORD_MAP[name]) return CONSUMER_KEYWORD_MAP[name];
  if (CONSUMER_KEYWORD_MAP[normalized]) return CONSUMER_KEYWORD_MAP[normalized];

  // 2. 부분 매칭
  for (const [key, keyword] of Object.entries(CONSUMER_KEYWORD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return keyword;
  }

  // 3. 원본으로 부분 매칭 재시도
  for (const [key, keyword] of Object.entries(CONSUMER_KEYWORD_MAP)) {
    if (name.includes(key)) return keyword;
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
