export type ConceptTag = 'budget' | 'taste' | 'volume' | 'easy' | 'nutrition';

export type DishType = 'rice' | 'side' | 'soup' | 'one_plate' | 'dessert' | 'other';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type IngredientCategory =
  | 'vegetable'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grain'
  | 'seasoning'
  | 'sauce'
  | 'noodle'
  | 'tofu'
  | 'egg'
  | 'oil'
  | 'other';

export interface Recipe {
  id: string;
  external_id: string | null;
  name: string;
  cooking_method: string | null;
  dish_type: DishType;
  difficulty: Difficulty;
  serving_size: string | null;
  cooking_time_minutes: number | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  sodium: number | null;
  raw_ingredients: string | null;
  tip: string | null;
  hash_tag: string | null;
  thumbnail_url: string | null;
  main_image_url: string | null;
  concept_tags: ConceptTag[];
  source_url: string | null;
  youtube_video_id: string | null;
  youtube_search_query: string | null;
  is_lunchbox_friendly: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeSummary {
  id: string;
  name: string;
  thumbnail_url: string | null;
  concept_tags: ConceptTag[];
  dish_type: DishType;
  difficulty: Difficulty;
  calories: number | null;
  cooking_time_minutes: number | null;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  image_url: string | null;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  name: string;
  amount: string | null;
  category: IngredientCategory;
  is_optional: boolean;
  display_order: number;
}
