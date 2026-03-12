import { supabase } from './lib/supabase';

type ConceptTag = 'budget' | 'taste' | 'volume' | 'easy' | 'nutrition';

const EXPENSIVE_INGREDIENTS = [
  '소고기', '새우', '전복', '랍스터', '한우', '갈비',
];

function classifyTags(recipe: {
  hash_tag: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  stepCount: number;
  ingredientCount: number;
  rawIngredients: string | null;
}): ConceptTag[] {
  const tags: ConceptTag[] = [];

  // easy: step count <= 6 AND ingredient count <= 8
  if (recipe.stepCount <= 6 && recipe.ingredientCount <= 8) {
    tags.push('easy');
  }

  // budget: no expensive ingredients found in raw_ingredients
  const rawLower = (recipe.rawIngredients ?? '').toLowerCase();
  const hasExpensive = EXPENSIVE_INGREDIENTS.some((ing) => rawLower.includes(ing));
  if (!hasExpensive) {
    tags.push('budget');
  }

  // volume: calories > 500 OR carbs > 60
  if ((recipe.calories ?? 0) > 500 || (recipe.carbs ?? 0) > 60) {
    tags.push('volume');
  }

  // nutrition: protein > 20 AND fat < 20 AND carbs between 30-60
  const protein = recipe.protein ?? 0;
  const fat = recipe.fat ?? 0;
  const carbs = recipe.carbs ?? 0;
  if (protein > 20 && fat < 20 && carbs >= 30 && carbs <= 60) {
    tags.push('nutrition');
  }

  // taste: hash_tag contains keywords OR step count > 8 (complex = tasty)
  const TASTE_KEYWORDS = ['맛', '별미', '인기'];
  const hashTag = recipe.hash_tag ?? '';
  const hasTasteKeyword = TASTE_KEYWORDS.some((kw) => hashTag.includes(kw));
  if (hasTasteKeyword || recipe.stepCount > 8) {
    tags.push('taste');
  }

  return tags;
}

interface RecipeRow {
  id: string;
  hash_tag: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  raw_ingredients: string | null;
  cooking_time_minutes: number | null;
}

interface StepCountRow {
  recipe_id: string;
  count: number;
}

interface IngredientCountRow {
  recipe_id: string;
  count: number;
}

async function classifyAllTags(): Promise<void> {
  // Fetch all recipes with empty concept_tags
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, hash_tag, calories, carbs, protein, fat, raw_ingredients, cooking_time_minutes')
    .eq('concept_tags', '{}');

  if (recipesError) {
    throw new Error(`Failed to fetch recipes: ${recipesError.message}`);
  }

  const recipeList = (recipes ?? []) as RecipeRow[];
  console.log(`Found ${recipeList.length} recipes to classify`);

  if (recipeList.length === 0) {
    console.log('No recipes to classify.');
    return;
  }

  const recipeIds = recipeList.map((r) => r.id);

  // Fetch step counts per recipe
  const { data: stepCounts, error: stepError } = await supabase
    .from('recipe_steps')
    .select('recipe_id, count:id.count()')
    .in('recipe_id', recipeIds);

  if (stepError) {
    throw new Error(`Failed to fetch step counts: ${stepError.message}`);
  }

  const stepCountMap = new Map<string, number>();
  for (const row of (stepCounts ?? []) as StepCountRow[]) {
    stepCountMap.set(row.recipe_id, Number(row.count));
  }

  // Fetch ingredient counts per recipe
  const { data: ingredientCounts, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id, count:id.count()')
    .in('recipe_id', recipeIds);

  if (ingError) {
    throw new Error(`Failed to fetch ingredient counts: ${ingError.message}`);
  }

  const ingredientCountMap = new Map<string, number>();
  for (const row of (ingredientCounts ?? []) as IngredientCountRow[]) {
    ingredientCountMap.set(row.recipe_id, Number(row.count));
  }

  let updated = 0;

  for (const recipe of recipeList) {
    const stepCount = stepCountMap.get(recipe.id) ?? 0;
    const ingredientCount = ingredientCountMap.get(recipe.id) ?? 0;

    const tags = classifyTags({
      hash_tag: recipe.hash_tag,
      calories: recipe.calories,
      carbs: recipe.carbs,
      protein: recipe.protein,
      fat: recipe.fat,
      stepCount,
      ingredientCount,
      rawIngredients: recipe.raw_ingredients,
    });

    // Estimate cooking_time_minutes if not already set
    const estimatedTime = recipe.cooking_time_minutes ?? stepCount * 5;

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        concept_tags: tags,
        cooking_time_minutes: estimatedTime,
      })
      .eq('id', recipe.id);

    if (updateError) {
      console.error(`Failed to update recipe ${recipe.id}:`, updateError.message);
      continue;
    }

    updated++;
    if (updated % 100 === 0) {
      console.log(`Classified ${updated}/${recipeList.length} recipes`);
    }
  }

  console.log(`Done. Classified ${updated}/${recipeList.length} recipes.`);
}

classifyAllTags().catch((err) => {
  console.error('Classification failed:', err);
  process.exit(1);
});
