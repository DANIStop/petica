import { tokenize } from "./tiles";

export const SIZE = 5;
export const MAX_SWAPS = 15;
export const SOLVABLE_IN = 10;

export type Grid = (string | null)[];
export type Color = "green" | "yellow" | "gray" | null;
export type Rng = () => number;

/** Rupe su ćelije s neparnim retkom i neparnim stupcem. */
export const isHole = (i: number) => Math.floor(i / SIZE) % 2 === 1 && (i % SIZE) % 2 === 1;
export const CELLS = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !isHole(i));

/** 3 vodoravne (reci 0,2,4) i 3 okomite (stupci 0,2,4) riječi. */
export const LINES: number[][] = [
  ...[0, 2, 4].map((r) => [0, 1, 2, 3, 4].map((c) => r * SIZE + c)),
  ...[0, 2, 4].map((c) => [0, 1, 2, 3, 4].map((r) => r * SIZE + c)),
];

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isSolved(grid: Grid, solution: Grid): boolean {
  return CELLS.every((i) => grid[i] === solution[i]);
}

/** Zelena: točno mjesto. Žuta: pločica pripada riječi u tom retku/stupcu. Siva: ne pripada. */
export function computeColors(grid: Grid, solution: Grid): Color[] {
  const colors: Color[] = Array.from({ length: SIZE * SIZE }, (_, i) => (isHole(i) ? null : "gray"));
  for (const i of CELLS) if (grid[i] === solution[i]) colors[i] = "green";

  for (const line of LINES) {
    const left = new Map<string, number>();
    for (const i of line) {
      if (grid[i] !== solution[i]) left.set(solution[i]!, (left.get(solution[i]!) ?? 0) + 1);
    }
    for (const i of line) {
      if (grid[i] === solution[i]) continue;
      const n = left.get(grid[i]!) ?? 0;
      if (n > 0) {
        left.set(grid[i]!, n - 1);
        colors[i] = "yellow";
      }
    }
  }
  return colors;
}

export type SwapCheck = { ok: true } | { ok: false; reason: string };

/** Zelene pločice su zaključane; rupe i isti položaj nisu dopušteni. */
export function checkSwap(grid: Grid, solution: Grid, a: unknown, b: unknown): SwapCheck {
  const valid = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < SIZE * SIZE;
  if (!valid(a) || !valid(b)) return { ok: false, reason: "Neispravan položaj." };
  if (a === b) return { ok: false, reason: "Odaberi dvije različite pločice." };
  if (isHole(a) || isHole(b)) return { ok: false, reason: "Tu nema pločice." };
  if (grid[a] === solution[a] || grid[b] === solution[b]) return { ok: false, reason: "Zelene pločice su zaključane." };
  return { ok: true };
}

export function applySwap(grid: Grid, a: number, b: number): Grid {
  const next = grid.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Miješa rješenje s 10 zamjena nad disjunktnim parovima različitih pločica,
 * pa je mreža zajamčeno rješiva u ≤ 10 zamjena (a 15 je na raspolaganju).
 */
export function scramble(solution: Grid, rng: Rng): { grid: Grid; swaps: [number, number][] } {
  for (;;) {
    const picked = shuffle(CELLS, rng).slice(0, SOLVABLE_IN * 2);
    const swaps: [number, number][] = [];
    for (let i = 0; i < picked.length; i += 2) swaps.push([picked[i], picked[i + 1]]);
    if (swaps.some(([a, b]) => solution[a] === solution[b])) continue;
    const grid = swaps.reduce((g, [a, b]) => applySwap(g, a, b), solution);
    return { grid, swaps };
  }
}

type Index = { byFirst: Map<string, string[][]>; byKey: Map<string, string[][]> };

function buildIndex(words: string[]): Index {
  const byFirst = new Map<string, string[][]>();
  const byKey = new Map<string, string[][]>();
  for (const w of words) {
    const t = tokenize(w);
    if (!t || t.length !== SIZE) continue;
    const push = (m: Map<string, string[][]>, k: string) => (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    push(byFirst, t[0]);
    push(byKey, [t[0], t[2], t[4]].join("|"));
  }
  return { byFirst, byKey };
}

const pick = <T>(arr: T[] | undefined, rng: Rng): T | undefined =>
  arr?.length ? arr[Math.floor(rng() * arr.length)] : undefined;

/**
 * Slaže rješenje: vodoravna riječ 0 određuje početna slova okomitih riječi,
 * a treća i peta slova okomitih određuju vodoravne riječi 2 i 4.
 */
export function buildSolution(words: string[], rng: Rng, attempts = 50_000): Grid | null {
  const idx = buildIndex(words);
  const allKeys = [...idx.byKey.values()].flat();
  for (let n = 0; n < attempts; n++) {
    const h0 = pick(allKeys, rng)!;
    const vs = [0, 2, 4].map((c) => pick(idx.byFirst.get(h0[c]), rng));
    if (vs.some((v) => !v)) continue;
    const v = vs as string[][];
    const h2 = pick(idx.byKey.get([v[0][2], v[1][2], v[2][2]].join("|")), rng);
    const h4 = pick(idx.byKey.get([v[0][4], v[1][4], v[2][4]].join("|")), rng);
    if (!h2 || !h4) continue;
    const six = [h0, h2, h4, ...v];
    if (new Set(six.map((w) => w.join(""))).size !== 6) continue;

    const grid: Grid = Array(SIZE * SIZE).fill(null);
    [h0, h2, h4].forEach((w, k) => w.forEach((t, c) => (grid[k * 2 * SIZE + c] = t)));
    v.forEach((w, k) => w.forEach((t, r) => (grid[r * SIZE + k * 2] = t)));
    return grid;
  }
  return null;
}

/** Riječi iz rješenja, redom: 3 vodoravne pa 3 okomite. */
export const solutionWords = (solution: Grid): string[] => LINES.map((l) => l.map((i) => solution[i]).join(""));
