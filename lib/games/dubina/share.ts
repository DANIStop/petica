import { roundNumber } from "@/lib/date";
import { MAX_SCORE } from "./scoring";

const emoji = (points: number) => (points >= 70 ? "🟩" : points >= 40 ? "🟨" : points > 0 ? "🟥" : "⬛");

/** Bez spoilera: samo bodovi i boje po odgovoru. */
export function shareText(date: string, points: number[]): string {
  const total = points.reduce((s, x) => s + x, 0);
  return `Petica · Dubina #${roundNumber(date)} · ${total}/${MAX_SCORE} ${points.map(emoji).join("")}`;
}
