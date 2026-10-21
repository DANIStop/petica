import { describe, expect, it } from "vitest";
import { isPlan, isPremium, premiumUntilFromSubscription } from "./premium";
import { chooseExtra } from "./server/extra";

const now = new Date("2026-11-01T12:00:00Z");

describe("isPremium", () => {
  it("vrijedi samo dok premium_until nije prošao", () => {
    expect(isPremium("2026-11-02T00:00:00Z", now)).toBe(true);
    expect(isPremium("2026-10-31T00:00:00Z", now)).toBe(false);
    expect(isPremium(null, now)).toBe(false);
  });
});

describe("premiumUntilFromSubscription", () => {
  const end = Date.parse("2026-12-01T00:00:00Z") / 1000;
  it("aktivna pretplata: do kraja razdoblja (oba oblika API-ja)", () => {
    expect(premiumUntilFromSubscription({ status: "active", current_period_end: end })).toBe("2026-12-01T00:00:00.000Z");
    expect(premiumUntilFromSubscription({ status: "trialing", items: { data: [{ current_period_end: end }] } })).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });
  it("otkazana ili neplaćena: nema premiuma", () => {
    expect(premiumUntilFromSubscription({ status: "canceled", current_period_end: end })).toBeNull();
    expect(premiumUntilFromSubscription({ status: "unpaid", current_period_end: end })).toBeNull();
  });
  it("bez perioda: null", () => expect(premiumUntilFromSubscription({ status: "active" })).toBeNull());
});

describe("plan", () => {
  it("prihvaća samo poznate planove", () => {
    expect(isPlan("monthly")).toBe(true);
    expect(isPlan("lifetime")).toBe(false);
  });
});

describe("chooseExtra", () => {
  const approved = ["a", "b", "c", "d"];
  it("isključuje viđeno i zakazano", () => {
    expect(chooseExtra(approved, new Set(["a", "b"]), new Set(["c"]))).toBe("d");
  });
  it("vraća null kad ništa nije slobodno", () => {
    expect(chooseExtra(approved, new Set(approved), new Set())).toBeNull();
  });
});
