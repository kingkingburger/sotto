import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local without dotenv dependency
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const FOODSAFETY_API_KEY = process.env.FOODSAFETY_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}
if (!FOODSAFETY_API_KEY) {
  console.error('Missing FOODSAFETY_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type DishTypeValue = 'rice' | 'side' | 'soup' | 'one_plate' | 'dessert' | 'other';

function mapDishType(pat2: string): DishTypeValue {
  const map: Record<string, DishTypeValue> = {
    밥: 'rice',
    반찬: 'side',
    '국&찌개': 'soup',
    '국/찌개': 'soup',
    일품: 'one_plate',
    후식: 'dessert',
  };
  return map[pat2?.trim()] ?? 'other';
}

function isLunchboxFriendly(pat2: string, name: string): boolean {
  const nonLunchbox = ['음료', '주스', '스무디', '차'];
  const lowerName = name.toLowerCase();
  if (nonLunchbox.some((kw) => pat2?.includes(kw) || lowerName.includes(kw))) {
    return false;
  }
  // Dessert drinks
  if (pat2 === '후식' && nonLunchbox.some((kw) => lowerName.includes(kw))) {
    return false;
  }
  return true;
}

function safeFloat(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

interface CookrcpItem {
  RCP_SEQ: string;
  RCP_NM: string;
  RCP_WAY2: string;
  RCP_PAT2: string;
  INFO_ENG: string;
  INFO_CAR: string;
  INFO_PRO: string;
  INFO_FAT: string;
  INFO_NA: string;
  RCP_PARTS_DTLS: string;
  ATT_FILE_NO_MAIN: string;
  ATT_FILE_NO_MK: string;
  RCP_TIP: string;
  HASH_TAG: string;
  [key: string]: string;
}

interface CookrcpResponse {
  COOKRCP01?: {
    row?: CookrcpItem[];
    total_count?: string;
  };
}

async function fetchRecipes(): Promise<CookrcpItem[]> {
  const url = `http://openapi.foodsafetykorea.go.kr/api/${FOODSAFETY_API_KEY}/COOKRCP01/json/1/1000`;
  console.log(`Fetching recipes from COOKRCP01 API...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API fetch failed: ${res.status} ${res.statusText}`);
  }

  const json: CookrcpResponse = await res.json();
  const rows = json.COOKRCP01?.row ?? [];
  console.log(`Fetched ${rows.length} recipes from API`);
  return rows;
}

async function seedRecipes(): Promise<void> {
  const rows = await fetchRecipes();
  let seeded = 0;
  const total = rows.length;

  for (const item of rows) {
    const dishType = mapDishType(item.RCP_PAT2);
    const lunchboxFriendly = isLunchboxFriendly(item.RCP_PAT2, item.RCP_NM);

    // Build recipe row
    const recipe = {
      external_id: item.RCP_SEQ,
      name: item.RCP_NM,
      cooking_method: item.RCP_WAY2 || null,
      dish_type: dishType,
      difficulty: 'medium' as const,
      calories: safeFloat(item.INFO_ENG),
      carbs: safeFloat(item.INFO_CAR),
      protein: safeFloat(item.INFO_PRO),
      fat: safeFloat(item.INFO_FAT),
      sodium: safeFloat(item.INFO_NA),
      raw_ingredients: item.RCP_PARTS_DTLS || null,
      tip: item.RCP_TIP || null,
      hash_tag: item.HASH_TAG || null,
      thumbnail_url: item.ATT_FILE_NO_MAIN || null,
      main_image_url: item.ATT_FILE_NO_MK || null,
      is_lunchbox_friendly: lunchboxFriendly,
      concept_tags: [] as string[],
    };

    // Upsert recipe (idempotent via external_id)
    const { data: upserted, error: recipeError } = await supabase
      .from('recipes')
      .upsert(recipe, { onConflict: 'external_id' })
      .select('id')
      .single();

    if (recipeError || !upserted) {
      console.error(`Failed to upsert recipe ${item.RCP_NM}:`, recipeError?.message);
      continue;
    }

    const recipeId = upserted.id as string;

    // Parse steps from MANUAL01-MANUAL20
    const steps: Array<{ recipe_id: string; step_number: number; instruction: string; image_url: string | null }> = [];
    for (let i = 1; i <= 20; i++) {
      const padded = String(i).padStart(2, '0');
      const instruction = item[`MANUAL${padded}`]?.trim();
      if (!instruction) continue;

      const imageUrl = item[`MANUAL_IMG${padded}`]?.trim() || null;
      steps.push({
        recipe_id: recipeId,
        step_number: i,
        instruction,
        image_url: imageUrl,
      });
    }

    if (steps.length > 0) {
      // Delete existing steps first to make idempotent, then insert
      await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);
      const { error: stepsError } = await supabase.from('recipe_steps').insert(steps);
      if (stepsError) {
        console.error(`Failed to insert steps for ${item.RCP_NM}:`, stepsError.message);
      }
    }

    seeded++;
    if (seeded % 50 === 0 || seeded === total) {
      console.log(`Seeded ${seeded}/${total} recipes`);
    }
  }

  console.log(`Done. Seeded ${seeded}/${total} recipes.`);
}

seedRecipes().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
