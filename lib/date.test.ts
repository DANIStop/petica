import { describe, expect, it } from "vitest";
import { formatEditionDate, msUntilMidnightZagreb } from "./date";

describe("izdanje", () => {
  it("datum na hrvatskom po zagrebačkom vremenu", () => {
    expect(formatEditionDate(new Date("2026-10-21T10:00:00Z"))).toBe("srijeda, 21. listopada 2026.");
  });
  it("odbrojavanje do zagrebačke ponoći", () => {
    expect(msUntilMidnightZagreb(new Date("2026-06-30T21:30:00Z"))).toBe(30 * 60 * 1000); // 23:30 CEST
    expect(msUntilMidnightZagreb(new Date("2026-06-30T22:00:00Z"))).toBe(24 * 3600 * 1000); // točno ponoć → cijeli dan
    expect(msUntilMidnightZagreb(new Date("2026-12-15T22:59:59Z"))).toBe(1000); // 23:59:59 CET
  });
});
