import type { GameSlug } from "@/lib/games/registry";

const FILLED = new Set(["6,6", "32,19", "19,32"]);

/** Geometrijski znak svake igre; boja dolazi iz `currentColor` (akcent igre). */
export default function GameGlyph({ slug }: { slug: GameSlug }) {
  const common = { width: 30, height: 30, viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

  switch (slug) {
    case "rijecko": // waffle mreža
      return (
        <svg {...common}>
          {[6, 19, 32].flatMap((x) => [6, 19, 32].map((y) => ((x === 19 && y === 19) ? null : (
            <rect key={`${x}${y}`} x={x} y={y} width="10" height="10" rx="2.5" fill={FILLED.has(`${x},${y}`) ? "currentColor" : "none"} />
          ))))}
        </svg>
      );
    case "najblize": // meta s pogotkom van središta
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <circle cx="24" cy="24" r="10.5" />
          <circle cx="29" cy="20" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "dubina": // padajući stupci
      return (
        <svg {...common}>
          <path d="M8 11h32M8 20h24M8 29h15M8 38h7" />
        </svg>
      );
    case "kad-i-gdje": // oznaka na karti
      return (
        <svg {...common}>
          <path d="M24 42s13-11.5 13-21a13 13 0 1 0-26 0c0 9.5 13 21 13 21z" />
          <circle cx="24" cy="21" r="4.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bocanje": // bačena kugla i balin
      return (
        <svg {...common}>
          <circle cx="17" cy="29" r="11" />
          <circle cx="37" cy="14" r="4.5" fill="currentColor" stroke="none" />
          <path d="M13 25.5a6 6 0 0 1 5-3.5" />
        </svg>
      );
  }
}
