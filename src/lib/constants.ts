import type { ConceptTag, IngredientCategory } from '@/types/recipe';

export const CONCEPT_TAGS: {
  id: ConceptTag;
  label: string;
  description: string;
  emoji: string;
}[] = [
  { id: 'budget', label: '가성비', description: '저렴한 재료로 알뜰하게', emoji: '💰' },
  { id: 'taste', label: '맛위주', description: '맛있는 게 최고!', emoji: '😋' },
  { id: 'volume', label: '무게위주', description: '든든하게 배부르게', emoji: '💪' },
  { id: 'easy', label: '간편함', description: '30분 이내 간단 조리', emoji: '⏱️' },
  { id: 'nutrition', label: '영양 밸런스', description: '균형 잡힌 한 끼', emoji: '🥗' },
];

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  vegetable: '채소류',
  meat: '육류',
  seafood: '해산물',
  dairy: '유제품',
  grain: '곡류',
  seasoning: '양념/조미료',
  sauce: '소스류',
  noodle: '면류',
  tofu: '두부/콩류',
  egg: '달걀류',
  oil: '기름류',
  other: '기타',
};

export const CATEGORY_ORDER: IngredientCategory[] = [
  'meat',
  'seafood',
  'vegetable',
  'tofu',
  'egg',
  'dairy',
  'grain',
  'noodle',
  'seasoning',
  'sauce',
  'oil',
  'other',
];

export const RECIPE_SUMMARY_FIELDS =
  'id, name, thumbnail_url, concept_tags, dish_type, difficulty, calories, cooking_time_minutes';

export const RECIPE_SUMMARY_FIELDS_EXTENDED =
  'id, name, thumbnail_url, concept_tags, dish_type, difficulty, calories, cooking_time_minutes, price_tier, price_confidence, youtube_video_id';

export const DAY_LABELS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '초급',
  medium: '중급',
  hard: '고급',
};

export const TAG_COLORS: Record<ConceptTag, string> = {
  budget: 'bg-tag-budget/20 text-green-700 border-tag-budget/30',
  taste: 'bg-tag-taste/20 text-orange-700 border-tag-taste/30',
  volume: 'bg-tag-volume/20 text-blue-700 border-tag-volume/30',
  easy: 'bg-tag-easy/20 text-purple-700 border-tag-easy/30',
  nutrition: 'bg-tag-nutrition/20 text-teal-700 border-tag-nutrition/30',
};
