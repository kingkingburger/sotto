import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGroceryList } from '@/lib/grocery';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { recipeIds } = body as { recipeIds?: unknown };

  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    return NextResponse.json(
      { error: 'recipeIds must be a non-empty array' },
      { status: 400 },
    );
  }

  if (recipeIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json(
      { error: 'recipeIds must be an array of strings' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const result = await generateGroceryList(supabase, recipeIds as string[]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[grocery] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate grocery list' },
      { status: 500 },
    );
  }
}
