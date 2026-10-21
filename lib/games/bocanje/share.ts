import { roundNumber } from "@/lib/date";
import { MAX_SCORE } from "./physics";

const emoji = (points: number) => (points >= 80 ? "🟩" : points >= 50 ? "🟨" : "🟥");

export function shareText(date: string, points: number[]): string {
  const total = points.reduce((s, x) => s + x, 0);
  return `Petica · Boćanje #${roundNumber(date)} · ${total}/${MAX_SCORE} ${points.map(emoji).join("")}`;
}
