import type { IngredientCategory } from './recipe';

export interface GroceryItem {
  name: string;
  totalAmount: string;
  recipes: string[];
}

export interface GroceryCategory {
  category: IngredientCategory;
  categoryLabel: string;
  items: GroceryItem[];
}

export interface GroceryResponse {
  categories: GroceryCategory[];
}

export interface GroceryRequest {
  recipeIds: string[];
}
