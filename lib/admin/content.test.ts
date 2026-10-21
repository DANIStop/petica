import { describe, expect, it } from "vitest";
import { parseImport, validateContent, type Existing } from "./content";

const none = (): Existing => ({ questions: new Set(), categories: new Set(), photoSources: new Set() });
const q = (n: number) => ({ question: `Pitanje broj ${n}`, unit: "m", answer: n, source_url: "https://hr.wikipedia.org/x", difficulty: 2 });

describe("uvoz Najbliže", () => {
  it("12 pitanja → 2 runde, 2 ostatka prijavljena", () => {
    const r = parseImport("najblize", Array.from({ length: 12 }, (_, i) => q(i)), none());
    expect(r.rounds).toHaveLength(2);
    expect(r.errors.join(" ")).toMatch(/2 pitanja ostalo/);
  });
  it("preskače neispravno i duplikate (i postojeće)", () => {
    const ex = none();
    ex.questions.add("pitanje broj 0");
    const r = parseImport("najblize", [q(0), q(1), q(1), { question: "x" }, q(2), q(3), q(4), q(5)], ex);
    expect(r.rounds).toHaveLength(1);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
  it("odbija ulaz koji nije polje", () => {
    expect(parseImport("najblize", { a: 1 }, none()).errors[0]).toMatch(/polje/);
  });
});

describe("uvoz Dubine", () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({ text: `o${i}`, count: i + 1 }));
  it("prihvaća valjane, odbija duplikat kategorije i kratki popis", () => {
    const r = parseImport("dubina", [{ category: "Otoci", entries }, { category: "otoci!", entries }, { category: "X", entries: [] }], none());
    expect(r.rounds).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
  });
});

describe("uvoz Kad i gdje", () => {
  const p = (n: number) => ({ url: `https://upload.wikimedia.org/${n}.jpg`, author: "A", license: "CC BY 4.0", source_url: `https://commons.wikimedia.org/wiki/File:${n}.jpg`, lat: 45, lng: 16, year: 1950 });
  it("5 fotografija = 1 runda; duplikat izvora preskočen", () => {
    const r = parseImport("kad-i-gdje", [p(1), p(2), p(3), p(4), p(5), p(5)], none());
    expect(r.rounds).toHaveLength(1);
    expect(r.errors.join(" ")).toMatch(/već postoji/);
  });
});

describe("validateContent", () => {
  const good = {
    payload: { questions: Array.from({ length: 5 }, (_, i) => ({ question: `P${i}`, unit: "m" })) },
    answer: { answers: Array.from({ length: 5 }, () => ({ value: 3, source_url: "https://x.hr" })) },
  };
  it("prihvaća ispravno i odbija pokvareno", () => {
    expect(validateContent("najblize", good.payload, good.answer)).toBeNull();
    expect(validateContent("najblize", { questions: [] }, good.answer)).not.toBeNull();
    expect(validateContent("najblize", good.payload, { answers: [{ value: "x" }] })).not.toBeNull();
    expect(validateContent("najblize", null, null)).not.toBeNull();
    expect(validateContent("rijecko", {}, {})).toMatch(/nije podržano/);
  });
});
