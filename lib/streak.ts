import { addDays } from "@/lib/date";

export type Streak = { current: number; best: number; last_date: string | null };

export const EMPTY_STREAK: Streak = { current: 0, best: 0, last_date: null };

/** Novo stanje streaka nakon završene dnevne igre na datum `date`. */
export function recordPlay(streak: Streak, date: string): Streak {
  if (streak.last_date === date) return streak;
  const current = streak.last_date === addDays(date, -1) ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), last_date: date };
}

/** Streak koji se prikazuje: prekinut je ako zadnja igra nije jučer ili danas. */
export function activeStreak(streak: Streak, today: string): number {
  if (!streak.last_date) return 0;
  return streak.last_date === today || streak.last_date === addDays(today, -1) ? streak.current : 0;
}
