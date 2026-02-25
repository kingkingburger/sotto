import type { RecipeSummary, ConceptTag } from './recipe';

export interface DayMenu {
  day: number;
  recipe: RecipeSummary;
}

export interface MealPlan {
  menu: DayMenu[];
  fallback: boolean;
}

export interface RecommendRequest {
  tags: ConceptTag[];
  days: 5 | 7;
  excludeIds?: string[];
}

export interface RerollRequest {
  tags: ConceptTag[];
  excludeIds: string[];
  dishType?: string;
}
