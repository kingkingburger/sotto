import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGroceryList } from '@/lib/grocery';
import { groceryRequestSchema } from '@/lib/schemas';
import { parseRequestBody } from '@/lib/api-utils';

export async function POST(request: Request) {
  const result = await parseRequestBody(request, groceryRequestSchema);
  if (result.error) return result.error;

  const { recipeIds } = result.data;

  try {
    const supabase = await createClient();
    const result = await generateGroceryList(supabase, recipeIds);

    // Fetch price tiers (gracefully skip if columns don't exist yet)
    let priceTierSummary: { tier1: number; tier2: number; tier3: number; unknown: number } | undefined;
    const { data: priceData, error: priceError } = await supabase
      .from('recipes')
      .select('price_tier, price_confidence')
      .in('id', recipeIds);

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
      { error: '장보기 목록을 만들지 못했어요' },
      { status: 500 },
    );
  }
}
