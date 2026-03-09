import type { DayMenu } from '@/types/menu';

export interface WeeklyHistory {
  weekStart: string; // ISO date string (Monday)
  weekEnd: string;   // ISO date string (Friday/Sunday)
  menu: DayMenu[];
  savedAt: string;   // ISO date string
}

const STORAGE_KEY = 'sotto-history';
const MAX_WEEKS = 4;

export function loadHistory(): WeeklyHistory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as WeeklyHistory[];
    // Auto-delete beyond MAX_WEEKS
    return data.slice(0, MAX_WEEKS);
  } catch {
    return [];
  }
}

export function saveCurrentMenu(menu: DayMenu[]): void {
  if (typeof window === 'undefined' || menu.length === 0) return;
  try {
    const now = new Date();
    // Calculate Monday of this week
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const weekStart = monday.toISOString().split('T')[0];
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + menu.length - 1);
    const weekEnd = friday.toISOString().split('T')[0];

    const existing = loadHistory();

    // Replace if same week exists, otherwise prepend
    const filtered = existing.filter((w) => w.weekStart !== weekStart);
    const newEntry: WeeklyHistory = {
      weekStart,
      weekEnd,
      menu,
      savedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...filtered].slice(0, MAX_WEEKS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return '이번 주';
  if (diffDays < 14) return '지난 주';
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}주 전`;
}

export function formatDateRange(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart);
  const e = new Date(weekEnd);
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
}
