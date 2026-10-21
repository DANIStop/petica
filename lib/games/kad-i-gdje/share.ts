import { roundNumber } from "@/lib/date";
import { MAX_SCORE } from "./scoring";

const emoji = (points: number) => (points >= 80 ? "🟩" : points >= 50 ? "🟨" : "🟥");

/** Bez spoilera: samo bodovi i boje po fotografiji. */
export function shareText(date: string, points: number[]): string {
  const total = points.reduce((s, x) => s + x, 0);
  return `Petica · Kad i gdje #${roundNumber(date)} · ${total}/${MAX_SCORE} ${points.map(emoji).join("")}`;
}
