import type { GameSlug } from "@/lib/games/registry";

/** Najveći mogući rezultat po igri (Riječko: preostale zamjene od 15). */
export const MAX_SCORES: Record<GameSlug, number> = { najblize: 500, dubina: 500, "kad-i-gdje": 500, rijecko: 15, bocanje: 900 };

export type PlayRow = { game: string; kind: string; score: number | null; finished_at: string | null };
export type StreakRow = { game: string; current: number; best: number; last_date: string | null };
export type GameStats = { game: string; played: number; daily: number; average: number; best: number; streak: number; bestStreak: number };

export function computeStats(games: string[], plays: PlayRow[], streaks: StreakRow[], today: string, yesterday: string): GameStats[] {
  return games.map((game) => {
    const done = plays.filter((p) => p.game === game && p.finished_at && p.score !== null);
    const scores = done.map((p) => p.score as number);
    const s = streaks.find((x) => x.game === game);
    const alive = s && (s.last_date === today || s.last_date === yesterday);
    return {
      game,
      played: done.length,
      daily: done.filter((p) => p.kind === "daily").length,
      average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      best: scores.length ? Math.max(...scores) : 0,
      streak: alive ? s!.current : 0,
      bestStreak: s?.best ?? 0,
    };
  });
}
