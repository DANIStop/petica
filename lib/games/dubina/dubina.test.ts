import { describe, expect, it } from "vitest";
import { isValidEntries, isValidGuesses, matchEntry, normalizeAnswer, pointsFor, scoreRound, type DubinaEntry } from "./scoring";
import { shareText } from "./share";

const entries: DubinaEntry[] = [
  { text: "Zagreb", count: 100 },
  { text: "Split", count: 60 },
  { text: "Rijeka", count: 40 },
  { text: "Đakovo", aliases: ["Djakovo"], count: 5 },
  { text: "Slavonski Brod", count: 3 },
];

describe("podudaranje", () => {
  it("ignorira velika slova i dijakritike", () => {
    expect(normalizeAnswer("  ĐAKOVO!")).toBe("dakovo");
    expect(matchEntry("dakovo", entries)).toBe(3);
    expect(matchEntry("DJAKOVO", entries)).toBe(3);
  });
  it("tolerira jednu tipfeler-grešku samo kod dužih riječi", () => {
    expect(matchEntry("Zagreb", entries)).toBe(0);
    expect(matchEntry("Rijka", entries)).toBe(-1); // prekratko za toleranciju (5)
    expect(matchEntry("Slavonski Brd", entries)).toBe(4);
    expect(matchEntry("Slavonski Bord", entries)).toBe(4);
  });
  it("izvan popisa i prazno", () => {
    expect(matchEntry("Pariz", entries)).toBe(-1);
    expect(matchEntry("   ", entries)).toBe(-1);
  });
});

describe("bodovanje", () => {
  it("rjeđe = više bodova (10..100)", () => {
    expect(pointsFor(entries[0], 100)).toBe(10);
    expect(pointsFor(entries[4], 100)).toBe(97);
    expect(pointsFor(entries[1], 100)).toBeGreaterThan(pointsFor(entries[0], 100));
  });
  it("duplikat i odgovor izvan popisa donose 0", () => {
    const { results, total } = scoreRound(["Zagreb", "zagreb", "Pariz", "Split", ""], entries);
    expect(results.map((r) => r.points)).toEqual([10, 0, 0, 46, 0]);
    expect(total).toBe(56);
  });
});

describe("validacija", () => {
  it("unos", () => {
    expect(isValidGuesses(["a", "", "", "", ""])).toBe(true);
    expect(isValidGuesses(["", "", "", "", ""])).toBe(false);
    expect(isValidGuesses(["a", "b"])).toBe(false);
    expect(isValidGuesses(["a", "b", "c", "d", 5])).toBe(false);
    expect(isValidGuesses(["x".repeat(41), "", "", "", ""])).toBe(false);
  });
  it("popis odgovora traži ≥10 valjanih", () => {
    expect(isValidEntries(entries)).toBe(false);
    const many = Array.from({ length: 12 }, (_, i) => ({ text: `o${i}`, count: i + 1 }));
    expect(isValidEntries(many)).toBe(true);
    expect(isValidEntries([...many, { text: "x", count: 0 }])).toBe(false);
  });
});

describe("share", () => {
  it("boje po bodovima", () => {
    expect(shareText("2026-10-21", [100, 50, 10, 0, 75])).toBe("Petica · Dubina #1 · 235/500 🟩🟨🟥⬛🟩");
  });
});
