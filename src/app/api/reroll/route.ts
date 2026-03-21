import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rerollRequestSchema } from '@/lib/schemas';
import { queryRecipes, shuffle } from '@/lib/recommend';
import { parseRequestBody } from '@/lib/api-utils';

export async function POST(request: Request) {
  const result = await parseRequestBody(request, rerollRequestSchema);
  if (result.error) return result.error;

  const { tags, excludeIds, dishType } = result.data;

  try {
    const supabase = await createClient();

    // dishType 매칭 시도
    if (dishType) {
      const pool = await queryRecipes(supabase.from('recipes'), {
        tags: tags.length > 0 ? tags : undefined,
        excludeIds: excludeIds.length > 0 ? excludeIds : undefined,
        dishType,
        limit: 20,
      });
      if (pool.length > 0) {
        return NextResponse.json(shuffle(pool)[0]);
      }
    }

    // Fallback: dishType 무시
    const pool = await queryRecipes(supabase.from('recipes'), {
      tags: tags.length > 0 ? tags : undefined,
      excludeIds: excludeIds.length > 0 ? excludeIds : undefined,
      limit: 20,
    });

    if (pool.length === 0) {
      return NextResponse.json(
        { error: '조건에 맞는 레시피를 찾을 수 없어요' },
        { status: 404 },
      );
    }

    return NextResponse.json(shuffle(pool)[0]);
  } catch (err) {
    console.error('[reroll] Error:', err);
    return NextResponse.json(
      { error: '다시 뽑기에 실패했어요' },
      { status: 500 },
    );
  }
}
