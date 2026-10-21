import { describe, expect, it } from "vitest";
import { activeStreak, EMPTY_STREAK, recordPlay } from "./streak";
import { addDays, todayZagreb } from "./date";

describe("streak", () => {
  it("počinje od 1", () => {
    expect(recordPlay(EMPTY_STREAK, "2026-03-10")).toEqual({ current: 1, best: 1, last_date: "2026-03-10" });
  });
  it("nastavlja uzastopne dane", () => {
    const s = recordPlay({ current: 3, best: 3, last_date: "2026-03-09" }, "2026-03-10");
    expect(s.current).toBe(4);
    expect(s.best).toBe(4);
  });
  it("prekid vraća na 1, best ostaje", () => {
    const s = recordPlay({ current: 5, best: 5, last_date: "2026-03-01" }, "2026-03-10");
    expect(s).toEqual({ current: 1, best: 5, last_date: "2026-03-10" });
  });
  it("isti dan ne mijenja ništa", () => {
    const s = { current: 2, best: 2, last_date: "2026-03-10" };
    expect(recordPlay(s, "2026-03-10")).toBe(s);
  });
  it("activeStreak vrijedi do kraja sljedećeg dana", () => {
    const s = { current: 4, best: 4, last_date: "2026-03-09" };
    expect(activeStreak(s, "2026-03-10")).toBe(4);
    expect(activeStreak(s, "2026-03-11")).toBe(0);
  });
});

describe("date", () => {
  it("addDays prelazi granice mjeseca", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("todayZagreb koristi zagrebačku ponoć", () => {
    expect(todayZagreb(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(todayZagreb(new Date("2026-06-30T21:30:00Z"))).toBe("2026-06-30");
  });
});
