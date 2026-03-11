import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { RecipeSummary } from '@/types/recipe';
import { rerollRequestSchema } from '@/lib/schemas';
import { RECIPE_SUMMARY_FIELDS, RECIPE_SUMMARY_FIELDS_EXTENDED, LUNCHBOX_DISH_TYPES } from '@/lib/constants';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = rerollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    );
  }

  const { tags, excludeIds, dishType } = parsed.data;

  try {
    const supabase = await createClient();

    const buildQuery = async (matchDishType?: string): Promise<{ data: any[] | null; error: any }> => {
      const applyFilters = (fields: string) => {
        let q = supabase
          .from('recipes')
          .select(fields)
          .eq('is_lunchbox_friendly', true)
          .in('dish_type', LUNCHBOX_DISH_TYPES);

        // Only apply tag filter if tags are provided
        if (tags.length > 0) {
          q = q.overlaps('concept_tags', tags);
        }

        if (excludeIds.length > 0) {
          q = q.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        if (matchDishType) {
          q = q.eq('dish_type', matchDishType);
        }

        q = q.limit(20);
        return q;
      };

      const { data, error } = await applyFilters(RECIPE_SUMMARY_FIELDS_EXTENDED);
      if (error?.code === '42703') {
        return applyFilters(RECIPE_SUMMARY_FIELDS);
      }
      return { data, error };
    };

    let recipe: RecipeSummary | null = null;

    if (dishType) {
      const { data, error } = await buildQuery(dishType);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        const idx = Math.floor(Math.random() * data.length);
        recipe = data[idx] as RecipeSummary;
      }
    }

    // Fallback to any dish type
    if (!recipe) {
      const { data, error } = await buildQuery();
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        const idx = Math.floor(Math.random() * data.length);
        recipe = data[idx] as RecipeSummary;
      }
    }

    if (!recipe) {
      return NextResponse.json(
        { error: '조건에 맞는 레시피를 찾을 수 없어요' },
        { status: 404 },
      );
    }

    return NextResponse.json(recipe);
  } catch (err) {
    console.error('[reroll] Error:', err);
    return NextResponse.json(
      { error: '다시 뽑기에 실패했어요' },
      { status: 500 },
    );
  }
}
