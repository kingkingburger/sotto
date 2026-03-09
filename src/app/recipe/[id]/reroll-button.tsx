'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dices } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useMenuStore } from '@/lib/store';
import type { ConceptTag } from '@/types/recipe';

interface RerollButtonProps {
  recipeId: string;
  dishType: string | null;
  conceptTags: ConceptTag[];
}

export function RerollButton({ recipeId, dishType, conceptTags }: RerollButtonProps) {
  const router = useRouter();
  const store = useMenuStore();
  const [loading, setLoading] = useState(false);

  async function handleReroll() {
    setLoading(true);
    try {
      const excludeIds = store.menu.map((d) => d.recipe.id);
      if (!excludeIds.includes(recipeId)) excludeIds.push(recipeId);

      const res = await fetch('/api/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: conceptTags.length > 0 ? conceptTags : store.tags,
          excludeIds,
          dishType,
        }),
      });

      if (!res.ok) throw new Error('다시 뽑기 실패');
      const newRecipe = await res.json();

      // Update the menu store if this recipe is in the current menu
      const dayItem = store.menu.find((d) => d.recipe.id === recipeId);
      if (dayItem) {
        store.updateMenuItem(dayItem.day, { ...dayItem, recipe: newRecipe });
      }

      toast.success('새로운 레시피로 바꿨어요!');
      router.push(`/recipe/${newRecipe.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '다시 뽑기에 실패했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleReroll}
      disabled={loading}
      className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-sotto-200 bg-sotto-50 py-3.5 text-sm font-semibold text-sotto-600 transition-colors hover:bg-sotto-100 disabled:opacity-50"
    >
      <Dices className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? '새 레시피 찾는 중...' : '다른 메뉴로 바꾸기'}
    </motion.button>
  );
}
