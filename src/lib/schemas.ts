import { z } from 'zod';

const conceptTagSchema = z.enum(['budget', 'taste', 'volume', 'easy', 'nutrition']);

export const recommendRequestSchema = z.object({
  tags: z.array(conceptTagSchema).default([]),
  days: z.union([z.literal(5), z.literal(7)]).default(5),
  excludeIds: z.array(z.string().uuid()).optional(),
  recipeIds: z.array(z.string().uuid()).optional(),
});

export const rerollRequestSchema = z.object({
  tags: z.array(conceptTagSchema).default([]),
  excludeIds: z.array(z.string()).default([]),
  dishType: z.string().optional(),
});

export const groceryRequestSchema = z.object({
  recipeIds: z.array(z.string().uuid()).min(1, '레시피를 하나 이상 선택해주세요'),
});

export type RecommendInput = z.infer<typeof recommendRequestSchema>;
export type RerollInput = z.infer<typeof rerollRequestSchema>;
export type GroceryInput = z.infer<typeof groceryRequestSchema>;
