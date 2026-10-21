import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { tokenize } from "./tiles";
import {
  applySwap, buildSolution, checkSwap, CELLS, computeColors, isHole, isSolved, LINES, mulberry32,
  scramble, solutionWords, SOLVABLE_IN, type Grid,
} from "./puzzle";
import { shareText, swapsLeftText } from "./share";

const words = readFileSync("data/words-hr-5.txt", "utf8").split("\n").filter(Boolean);

describe("pločice", () => {
  it("lj, nj, dž su jedna pločica", () => {
    expect(tokenize("ljudi")).toEqual(["lj", "u", "d", "i"]);
    expect(tokenize("daždu")).toEqual(["d", "a", "ž", "d", "u"]);
    expect(tokenize("džemo")).toEqual(["dž", "e", "m", "o"]);
    expect(tokenize("konja")).toEqual(["k", "o", "nj", "a"]);
  });
  it("odbija znakove izvan abecede", () => expect(tokenize("water")).toBeNull());
});

describe("raspored", () => {
  it("21 ćelija, 6 linija od 5", () => {
    expect(CELLS).toHaveLength(21);
    expect(LINES).toHaveLength(6);
    expect(LINES.every((l) => l.length === 5 && l.every((i) => !isHole(i)))).toBe(true);
  });
});

describe("generator", () => {
  const solution = buildSolution(words, mulberry32(42))!;
  it("slaže valjanu mrežu iz rječnika", () => {
    expect(solution).not.toBeNull();
    const set = new Set(words.map((w) => tokenize(w)!.join("|")));
    for (const line of LINES) expect(set.has(line.map((i) => solution[i]).join("|"))).toBe(true);
    expect(new Set(solutionWords(solution)).size).toBe(6);
  });
  it("je determinističan za isti seed", () => {
    expect(buildSolution(words, mulberry32(42))).toEqual(solution);
  });
  it("mreža je rješiva u ≤ 10 zamjena", () => {
    for (let s = 1; s <= 20; s++) {
      const sol = buildSolution(words, mulberry32(s))!;
      const { grid, swaps } = scramble(sol, mulberry32(s));
      expect(swaps.length).toBeLessThanOrEqual(SOLVABLE_IN);
      expect(isSolved(grid, sol)).toBe(false);
      expect(isSolved([...swaps].reverse().reduce((g, [a, b]) => applySwap(g, a, b), grid), sol)).toBe(true);
    }
  });
});

describe("boje i zamjene", () => {
  const sol: Grid = Array(25).fill(null);
  CELLS.forEach((i) => (sol[i] = "a"));
  it("sve točno = sve zeleno", () => {
    expect(computeColors(sol, sol).filter((c) => c === "green")).toHaveLength(21);
  });
  it("žuta samo dok slovo još treba u liniji, inače siva", () => {
    const sol2 = sol.slice();
    sol2[0] = "b"; sol2[1] = "c"; sol2[2] = "d"; sol2[3] = "e"; sol2[4] = "f";
    const g = sol2.slice();
    g[0] = "c"; g[1] = "b"; // zamijenjeni: oba u retku 0
    g[3] = "z"; // ne pripada
    const colors = computeColors(g, sol2);
    expect(colors[0]).toBe("yellow");
    expect(colors[1]).toBe("yellow");
    expect(colors[3]).toBe("gray");
    expect(colors[2]).toBe("green");
  });
  it("zeleno je zaključano, rupe i neispravno odbijeno", () => {
    const g = sol.slice();
    g[0] = "x"; g[2] = "y";
    expect(checkSwap(g, sol, 0, 2).ok).toBe(true);
    expect(checkSwap(g, sol, 0, 4).ok).toBe(false); // 4 je zelena
    expect(checkSwap(g, sol, 0, 6).ok).toBe(false); // rupa
    expect(checkSwap(g, sol, 0, 0).ok).toBe(false);
    expect(checkSwap(g, sol, 0, "2").ok).toBe(false);
    expect(checkSwap(g, sol, 0, 99).ok).toBe(false);
  });
});

describe("share", () => {
  it("množina zamjena", () => {
    expect([1, 2, 5, 11, 12, 21, 0].map(swapsLeftText)).toEqual([
      "1 zamjena ostalo", "2 zamjene ostalo", "5 zamjena ostalo", "11 zamjena ostalo",
      "12 zamjena ostalo", "21 zamjena ostalo", "bez zamjena",
    ]);
  });
  it("ne otkriva slova", () => {
    const colors = computeColors(Array(25).fill("a"), Array(25).fill("a"));
    const t = shareText("2026-10-21", true, 4, colors);
    expect(t.split("\n")[0]).toBe("Petica · Riječko #1 · 4 zamjene ostalo");
    expect(t.split("\n")).toHaveLength(6);
    expect(t).toContain("⬛");
  });
});
