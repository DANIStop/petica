import { MAX_SCORE } from "./scoring";

export const LAUNCH_DATE = "2026-10-21";

export function roundNumber(date: string): number {
  const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`)) / 86_400_000;
  return Math.max(1, Math.round(days) + 1);
}

function emoji(score: number): string {
  return score >= 90 ? "🟩" : score >= 60 ? "🟨" : "🟥";
}

/** Share tekst bez spoilera: samo bodovi i boje. */
export function shareText(date: string, scores: number[]): string {
  const total = scores.reduce((s, x) => s + x, 0);
  return `Petica · Najbliže #${roundNumber(date)} · ${total}/${MAX_SCORE} ${scores.map(emoji).join("")}`;
}
