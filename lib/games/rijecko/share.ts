import { roundNumber } from "@/lib/date";
import { MAX_SWAPS, isHole, SIZE, type Color } from "./puzzle";

const EMOJI = { green: "🟩", yellow: "🟨", gray: "⬜" } as const;

export function swapsLeftText(n: number): string {
  if (n === 0) return "bez zamjena";
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "zamjena" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "zamjene" : "zamjena";
  return `${n} ${word} ostalo`;
}

/** Share bez spoilera: samo boje završne mreže. */
export function shareText(date: string, solved: boolean, swapsLeft: number, colors: Color[]): string {
  const head = `Petica · Riječko #${roundNumber(date)} · ${solved ? swapsLeftText(swapsLeft) : `nije riješeno (${MAX_SWAPS}/${MAX_SWAPS})`}`;
  const rows: string[] = [];
  for (let r = 0; r < SIZE; r++) {
    rows.push(
      Array.from({ length: SIZE }, (_, c) => {
        const i = r * SIZE + c;
        return isHole(i) ? "⬛" : EMOJI[colors[i] ?? "gray"];
      }).join(""),
    );
  }
  return `${head}\n${rows.join("\n")}`;
}
