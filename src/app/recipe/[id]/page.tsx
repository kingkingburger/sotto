import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Flame, ChefHat, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Recipe, RecipeStep, RecipeIngredient, ConceptTag } from '@/types/recipe';
import { DIFFICULTY_LABELS, TAG_COLORS, CONCEPT_TAGS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { PriceBadge } from '@/components/ui/price-badge';
import { BackButton } from '@/components/back-button';
import { YouTubeSection } from './youtube-section';
import { RerollButton } from './reroll-button';
import { IngredientsSection } from './ingredients-section';

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

// 일일 권장량 기준
const DAILY_REFERENCE = {
  calories: 2000,
  protein: 60,
  fat: 65,
  carbs: 300,
};


export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipe, steps, ingredients } = await fetchRecipeData(id);

  if (!recipe) notFound();

  const heroImage = recipe.main_image_url ?? recipe.thumbnail_url;

  // 영양소 데이터 (일일 권장량 퍼센트 포함)
  const nutritionItems = [
    { label: '칼로리', value: recipe.calories, unit: 'kcal', icon: Flame, dailyRef: DAILY_REFERENCE.calories },
    { label: '단백질', value: recipe.protein, unit: 'g', icon: ChefHat, dailyRef: DAILY_REFERENCE.protein },
    { label: '탄수화물', value: recipe.carbs, unit: 'g', icon: null, dailyRef: DAILY_REFERENCE.carbs },
    { label: '지방', value: recipe.fat, unit: 'g', icon: null, dailyRef: DAILY_REFERENCE.fat },
  ].filter((n) => n.value != null);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      {/* Back link */}
      <div className="mb-6">
        <BackButton label="메뉴로 돌아가기" />
      </div>

      {/* Hero image — 하단 흰색 페이드 오버레이 */}
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
        {/* 하단 흰색 그래디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/0 to-transparent" />
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

      {/* Ingredients — 가격 포함 */}
      <IngredientsSection ingredients={ingredients} />

      {/* YouTube */}
      <YouTubeSection recipeId={id} existingVideoId={recipe.youtube_video_id} />

      {/* Steps — 타임라인 형태 */}
      {steps.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-5 text-subtitle font-bold text-sotto-900">조리 순서</h2>
          <div className="relative pl-10">
            <div className="absolute bottom-0 left-3.5 top-0 w-0.5 bg-sotto-200" />
            {steps.map((step, i) => (
              <div key={step.id} className={`relative ${i < steps.length - 1 ? 'mb-6' : ''}`}>
                <div className="absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full bg-sotto-800 text-body-sm font-bold text-sotto-50">
                  {step.step_number}
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-sotto-700">{step.instruction}</p>
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
        <div className="mb-8 rounded-2xl border border-sotto-200 bg-accent-50 p-5 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-sotto-600">
            <Lightbulb className="h-4 w-4" />
            요리 팁
          </h2>
          <p className="text-sm leading-relaxed text-sotto-700">{recipe.tip}</p>
        </div>
      )}

      {/* Nutrition — 마지막 */}
      {nutritionItems.length > 0 && (
        <div className="mb-8 rounded-2xl border border-sotto-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sotto-500">
            영양 정보
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {nutritionItems.map(({ label, value, unit, dailyRef }) => {
              const pct = Math.min(100, Math.round(((value as number) / dailyRef) * 100));
              return (
                <div key={label} className="flex flex-col items-center rounded-xl bg-sotto-50 px-2 py-3">
                  <span className="text-lg font-bold text-sotto-800">
                    {value}
                    <span className="ml-0.5 text-label font-normal text-sotto-500">{unit}</span>
                  </span>
                  <span className="mt-0.5 text-label text-sotto-500">{label}</span>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-sotto-200">
                    <div className="h-full rounded-full bg-accent-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-caption text-sotto-400">일일 {pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <RerollButton
        recipeId={id}
        dishType={recipe.dish_type}
        conceptTags={recipe.concept_tags as ConceptTag[]}
      />
    </div>
  );
}
