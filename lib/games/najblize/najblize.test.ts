import { describe, expect, it } from "vitest";
import { isValidGuesses, percentError, scoreGuess, scoreRound } from "./scoring";
import { roundNumber, shareText } from "./share";
import { filterNew, normalizeQuestion, toRounds, type RawQuestion } from "./generator";

const q = (question: string, answer = 10): RawQuestion => ({
  question, unit: "m", answer, source_url: "https://hr.wikipedia.org/x", difficulty: 2,
});

describe("bodovanje", () => {
  it("točan odgovor daje 100", () => expect(scoreGuess(50, 50)).toBe(100));
  it("pogreška 25% daje 75", () => expect(scoreGuess(75, 100)).toBe(75));
  it("pogreška iznad 100% daje 0", () => expect(scoreGuess(500, 100)).toBe(0));
  it("radi s negativnim i nultim odgovorom", () => {
    expect(percentError(-90, -100)).toBe(10);
    expect(scoreGuess(0, 0)).toBe(100);
  });
  it("zbraja rundu", () => {
    expect(scoreRound([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]).total).toBe(500);
  });
  it("validira unos", () => {
    expect(isValidGuesses([1, 2, 3, 4, 5])).toBe(true);
    expect(isValidGuesses([1, 2, 3, 4])).toBe(false);
    expect(isValidGuesses([1, 2, 3, 4, NaN])).toBe(false);
    expect(isValidGuesses([1, 2, 3, 4, "5"])).toBe(false);
  });
});

describe("share", () => {
  it("nema spoilera, samo bodovi i boje", () => {
    expect(shareText("2026-10-21", [100, 70, 10, 95, 60])).toBe("Petica · Najbliže #1 · 335/500 🟩🟨🟥🟩🟨");
  });
  it("broji runde od lansiranja", () => expect(roundNumber("2026-10-23")).toBe(3));
});

describe("generator", () => {
  it("normalizira dijakritike i interpunkciju", () => {
    expect(normalizeQuestion("Koliko je visok Đakovo?!")).toBe(normalizeQuestion("koliko je visok dakovo"));
  });
  it("izbacuje duplikate i neispravno", () => {
    const existing = new Set([normalizeQuestion("Stara stvar pitanje")]);
    const out = filterNew([q("Stara stvar pitanje?"), q("Novo pitanje jedan"), q("novo pitanje jedan!"), { question: "x" }], existing);
    expect(out.map((o) => o.question)).toEqual(["Novo pitanje jedan"]);
  });
  it("grupira u runde od 5", () => {
    const qs = Array.from({ length: 12 }, (_, i) => q(`Pitanje broj ${i}`));
    const rounds = toRounds(qs);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].payload.questions).toHaveLength(5);
    expect(rounds[0].answer.answers[0].value).toBe(10);
  });
});
