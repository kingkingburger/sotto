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

export interface PriceTierSummary {
  tier1: number;
  tier2: number;
  tier3: number;
  unknown: number;
}

export interface GroceryResponse {
  categories: GroceryCategory[];
  priceTierSummary?: PriceTierSummary;
}

export interface GroceryRequest {
  recipeIds: string[];
}
