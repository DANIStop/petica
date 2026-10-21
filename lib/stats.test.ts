import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";

describe("computeStats", () => {
  const plays = [
    { game: "najblize", kind: "daily", score: 300, finished_at: "x" },
    { game: "najblize", kind: "extra", score: 400, finished_at: "x" },
    { game: "najblize", kind: "extra", score: null, finished_at: null }, // nedovršeno
    { game: "dubina", kind: "daily", score: 0, finished_at: "x" },
  ];
  const streaks = [
    { game: "najblize", current: 4, best: 9, last_date: "2026-11-02" },
    { game: "dubina", current: 3, best: 3, last_date: "2026-10-01" }, // prekinut
  ];
  const stats = computeStats(["najblize", "dubina", "bocanje"], plays, streaks, "2026-11-03", "2026-11-02");

  it("ne broji nedovršene i računa prosjek/najbolji", () => {
    expect(stats[0]).toMatchObject({ played: 2, daily: 1, average: 350, best: 400 });
  });
  it("prekinut streak se ne prikazuje, najbolji ostaje", () => {
    expect(stats[0]).toMatchObject({ streak: 4, bestStreak: 9 });
    expect(stats[1]).toMatchObject({ streak: 0, bestStreak: 3, average: 0 });
  });
  it("igra bez rezultata je nula", () => {
    expect(stats[2]).toEqual({ game: "bocanje", played: 0, daily: 0, average: 0, best: 0, streak: 0, bestStreak: 0 });
  });
});
