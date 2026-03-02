import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Clock, Flame, ChefHat } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Recipe, RecipeStep, RecipeIngredient } from '@/types/recipe';
import { CATEGORY_LABELS, CATEGORY_ORDER, DIFFICULTY_LABELS, TAG_COLORS, CONCEPT_TAGS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { PriceBadge } from '@/components/ui/price-badge';
import { BackButton } from '@/components/back-button';
import { YouTubeSection } from './youtube-section';

async function fetchRecipeData(id: string) {
  const supabase = await createClient();

  const [recipeRes, stepsRes, ingredientsRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', id).single(),
    supabase
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', id)
      .order('step_number', { ascending: true }),
    supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
      .order('display_order', { ascending: true }),
  ]);

  return {
    recipe: recipeRes.data as Recipe | null,
    steps: (stepsRes.data ?? []) as RecipeStep[],
    ingredients: (ingredientsRes.data ?? []) as RecipeIngredient[],
  };
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipe, steps, ingredients } = await fetchRecipeData(id);

  if (!recipe) notFound();

  // Group ingredients by category
  const grouped = new Map<string, RecipeIngredient[]>();
  for (const ing of ingredients) {
    const cat = ing.category ?? 'other';
    const existing = grouped.get(cat) ?? [];
    existing.push(ing);
    grouped.set(cat, existing);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((cat) => grouped.has(cat)),
    ...Array.from(grouped.keys()).filter((cat) => !CATEGORY_ORDER.includes(cat as typeof CATEGORY_ORDER[number])),
  ];

  const heroImage = recipe.main_image_url ?? recipe.thumbnail_url;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      {/* Back link */}
      <div className="mb-6">
        <BackButton label="메뉴로 돌아가기" />
      </div>

      {/* Hero image */}
      <div className="relative mb-8 h-64 overflow-hidden rounded-3xl bg-sotto-100 shadow-card sm:h-80">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={recipe.name}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            quality={90}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🍱</div>
        )}
      </div>

      {/* Title & badges */}
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold text-sotto-900 sm:text-3xl">{recipe.name}</h1>
        <div className="flex flex-wrap gap-2">
          <PriceBadge
            estimatedPrice={recipe.estimated_price}
            priceConfidence={recipe.price_confidence}
            size="md"
          />
          {recipe.difficulty && (
            <Badge
              label={`${DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}`}
              colorClass="bg-sotto-100 text-sotto-700 border-sotto-200"
            />
          )}
          {recipe.cooking_time_minutes && (
            <Badge
              label={`${recipe.cooking_time_minutes}분`}
              colorClass="bg-sotto-100 text-sotto-600 border-sotto-200"
            />
          )}
          {recipe.concept_tags.map((tag) => (
            <Badge
              key={tag}
              label={`${CONCEPT_TAGS.find((t) => t.id === tag)?.emoji ?? ''} ${CONCEPT_TAGS.find((t) => t.id === tag)?.label ?? tag}`}
              colorClass={TAG_COLORS[tag]}
            />
          ))}
        </div>
      </div>

      {/* Nutrition bar */}
      {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat) && (
        <div className="mb-8 rounded-2xl border border-sotto-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sotto-500">
            영양 정보
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: '칼로리', value: recipe.calories, unit: 'kcal', icon: Flame },
              { label: '단백질', value: recipe.protein, unit: 'g', icon: ChefHat },
              { label: '탄수화물', value: recipe.carbs, unit: 'g', icon: null },
              { label: '지방', value: recipe.fat, unit: 'g', icon: null },
            ]
              .filter((n) => n.value != null)
              .map(({ label, value, unit }) => (
                <div key={label} className="flex flex-col items-center rounded-xl bg-sotto-50 px-3 py-4">
                  <span className="text-xl font-bold text-sotto-800">
                    {value}
                    <span className="ml-0.5 text-sm font-normal text-sotto-500">{unit}</span>
                  </span>
                  <span className="mt-1 text-xs text-sotto-500">{label}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* YouTube - above ingredients */}
      <YouTubeSection recipeId={id} existingVideoId={recipe.youtube_video_id} />

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-sotto-800">재료</h2>
          <div className="space-y-4">
            {orderedCategories.map((cat) => {
              const items = grouped.get(cat) ?? [];
              const label = CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat;
              return (
                <div key={cat} className="rounded-2xl border border-sotto-200 bg-white p-4 shadow-card">
                  <h3 className="mb-3 text-sm font-semibold text-sotto-500">{label}</h3>
                  <ul className="space-y-2">
                    {items.map((ing) => (
                      <li key={ing.id} className="flex items-center justify-between text-sm">
                        <span className="text-sotto-800">
                          {ing.name}
                          {ing.is_optional && (
                            <span className="ml-1.5 text-xs text-sotto-400">(선택)</span>
                          )}
                        </span>
                        {ing.amount && (
                          <span className="text-sotto-500">{ing.amount}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-sotto-800">조리 순서</h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex gap-4 rounded-2xl border border-sotto-200 bg-white p-4 shadow-card"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sotto-700 text-sm font-bold text-white">
                  {step.step_number}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm leading-relaxed text-sotto-800">{step.instruction}</p>
                  {step.image_url && (
                    <div className="relative mt-3 h-60 w-full overflow-hidden rounded-xl">
                      <Image
                        src={step.image_url}
                        alt={`단계 ${step.step_number}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 600px"
                        quality={85}
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      {recipe.tip && (
        <div className="rounded-2xl border border-sotto-200 bg-gradient-to-br from-sotto-50 to-white p-5 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-sotto-600">
            <Clock className="h-4 w-4" />
            요리 팁
          </h2>
          <p className="text-sm leading-relaxed text-sotto-700">{recipe.tip}</p>
        </div>
      )}
    </div>
  );
}
