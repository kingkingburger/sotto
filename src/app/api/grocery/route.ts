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

    // Fetch price tiers (gracefully skip if columns don't exist yet)
    let priceTierSummary: { tier1: number; tier2: number; tier3: number; unknown: number } | undefined;
    const { data: priceData, error: priceError } = await supabase
      .from('recipes')
      .select('price_tier, price_confidence')
      .in('id', recipeIds as string[]);

    if (!priceError && priceData) {
      priceTierSummary = { tier1: 0, tier2: 0, tier3: 0, unknown: 0 };
      for (const r of priceData) {
        if (r.price_tier && r.price_confidence && r.price_confidence >= 0.5) {
          if (r.price_tier === 1) priceTierSummary.tier1++;
          else if (r.price_tier === 2) priceTierSummary.tier2++;
          else if (r.price_tier === 3) priceTierSummary.tier3++;
        } else {
          priceTierSummary.unknown++;
        }
      }
    }

    return NextResponse.json({ ...result, ...(priceTierSummary ? { priceTierSummary } : {}) });
  } catch (err) {
    console.error('[grocery] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate grocery list' },
      { status: 500 },
    );
  }
}
