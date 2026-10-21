import { GAMES, type GameInfo } from "@/lib/games/registry";

/** Valjani share link: poznata igra i datum oblika YYYY-MM-DD koji zaista postoji. */
export function parseShareParams(game: string, date: string): { game: GameInfo; date: string } | null {
  const info = GAMES.find((g) => g.slug === game);
  if (!info || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return null;
  return { game: info, date };
}
