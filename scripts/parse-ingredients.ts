import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
// parseIngredients is a src/ module — tsx handles the path alias via tsconfig
import { parseIngredients } from '../src/lib/parse-ingredients';

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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface RecipeRow {
  id: string;
  name: string;
  raw_ingredients: string;
}

async function batchParseIngredients(): Promise<void> {
  // Fetch recipes that have raw_ingredients but NO parsed recipe_ingredients yet
  const { data: allRecipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, name, raw_ingredients')
    .not('raw_ingredients', 'is', null)
    .neq('raw_ingredients', '');

  if (recipesError) {
    throw new Error(`Failed to fetch recipes: ${recipesError.message}`);
  }

  const candidates = (allRecipes ?? []) as RecipeRow[];
  console.log(`Found ${candidates.length} recipes with raw_ingredients`);

  if (candidates.length === 0) {
    console.log('Nothing to parse.');
    return;
  }

  // Find which ones already have parsed ingredients
  const candidateIds = candidates.map((r) => r.id);
  const { data: existingIngRows, error: existingError } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .in('recipe_id', candidateIds);

  if (existingError) {
    throw new Error(`Failed to fetch existing ingredients: ${existingError.message}`);
  }

  const alreadyParsedIds = new Set(
    (existingIngRows ?? []).map((row: { recipe_id: string }) => row.recipe_id),
  );

  const toParse = candidates.filter((r) => !alreadyParsedIds.has(r.id));
  console.log(`${toParse.length} recipes need ingredient parsing (${alreadyParsedIds.size} already parsed)`);

  if (toParse.length === 0) {
    console.log('All recipes already parsed.');
    return;
  }

  let processed = 0;
  const total = toParse.length;

  for (const recipe of toParse) {
    const parsed = parseIngredients(recipe.raw_ingredients);

    if (parsed.length === 0) {
      processed++;
      continue;
    }

    const rows = parsed.map((ing) => ({
      recipe_id: recipe.id,
      name: ing.name,
      amount: ing.amount ?? null,
      category: ing.category,
      is_optional: ing.isOptional,
      display_order: ing.displayOrder,
    }));

    const { error: insertError } = await supabase
      .from('recipe_ingredients')
      .insert(rows);

    if (insertError) {
      console.error(`Failed to insert ingredients for "${recipe.name}" (${recipe.id}):`, insertError.message);
    }

    processed++;
    if (processed % 100 === 0 || processed === total) {
      console.log(`Parsed ${processed}/${total} recipes`);
    }
  }

  console.log(`Done. Parsed ingredients for ${processed}/${total} recipes.`);
}

batchParseIngredients().catch((err) => {
  console.error('Parse ingredients batch failed:', err);
  process.exit(1);
});
