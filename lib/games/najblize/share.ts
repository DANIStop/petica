import { MAX_SCORE } from "./scoring";

import { roundNumber } from "@/lib/date";

export { roundNumber };

function emoji(score: number): string {
  return score >= 90 ? "🟩" : score >= 60 ? "🟨" : "🟥";
}

/** Share tekst bez spoilera: samo bodovi i boje. */
export function shareText(date: string, scores: number[]): string {
  const total = scores.reduce((s, x) => s + x, 0);
  return `Petica · Najbliže #${roundNumber(date)} · ${total}/${MAX_SCORE} ${scores.map(emoji).join("")}`;
}
