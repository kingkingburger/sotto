import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConceptTag } from '@/types/recipe';
import type { DayMenu } from '@/types/menu';

interface MenuState {
  menu: DayMenu[];
  tags: ConceptTag[];
  days: 5 | 7;
  fallback: boolean;
  lastUpdated: number | null;

  setMenu: (menu: DayMenu[], fallback?: boolean) => void;
  setTags: (tags: ConceptTag[]) => void;
  setDays: (days: 5 | 7) => void;
  updateMenuItem: (day: number, menu: DayMenu) => void;
  resetMenu: () => void;
  isExpired: () => boolean;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      menu: [],
      tags: [],
      days: 5,
      fallback: false,
      lastUpdated: null,

      setMenu: (menu, fallback = false) =>
        set({ menu, fallback, lastUpdated: Date.now() }),

      setTags: (tags) => set({ tags }),

      setDays: (days) => set({ days }),

      updateMenuItem: (day, item) =>
        set((state) => ({
          menu: state.menu.map((d) => (d.day === day ? item : d)),
          lastUpdated: Date.now(),
        })),

      resetMenu: () => set({ menu: [], fallback: false, lastUpdated: null }),

      isExpired: () => {
        const { lastUpdated } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > ONE_DAY_MS;
      },
    }),
    {
      name: 'sotto-menu',
      partialize: (state) => ({
        menu: state.menu,
        tags: state.tags,
        days: state.days,
        fallback: state.fallback,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
