import { describe, expect, it } from "vitest";
import {
  generateTrack, idealPower, landingDistance, meterPower, METER_PERIOD_MS, plausibleElapsed, scoreThrow, THROWS,
} from "./physics";
import { shareText } from "./share";

describe("mjerač snage", () => {
  it("trokutasti val 0 → 1 → 0", () => {
    expect(meterPower(0)).toBe(0);
    expect(meterPower(METER_PERIOD_MS / 2)).toBe(1);
    expect(meterPower(METER_PERIOD_MS)).toBeCloseTo(0);
    expect(meterPower(METER_PERIOD_MS / 4)).toBeCloseTo(0.5);
    expect(meterPower(METER_PERIOD_MS * 1.75)).toBeCloseTo(0.5);
  });
});

describe("fizika i bodovanje", () => {
  it("vjetar u leđa nosi dalje, u lice kraće", () => {
    expect(landingDistance(0.5, 5)).toBeGreaterThan(landingDistance(0.5, 0));
    expect(landingDistance(0.5, -5)).toBeLessThan(landingDistance(0.5, 0));
  });
  it("idealna snaga daje 100 bodova", () => {
    const t = { distance: 15, wind: 3 };
    expect(scoreThrow(t, idealPower(t)).points).toBe(100);
  });
  it("pogreška ≥ 2,5 m daje 0, a pola toga ~50", () => {
    const t = { distance: 15, wind: 0 };
    expect(scoreThrow(t, (15 + 2.5) / 30).points).toBe(0);
    expect(scoreThrow(t, (15 + 1.25) / 30).points).toBe(50);
  });
});

describe("staza", () => {
  it("determinirana iz seeda/datuma, različita za različite dane", () => {
    expect(generateTrack("2026-10-21")).toEqual(generateTrack("2026-10-21"));
    expect(generateTrack("2026-10-21")).not.toEqual(generateTrack("2026-10-22"));
    expect(generateTrack("2026-10-21")).toHaveLength(THROWS);
  });
  it("svako bacanje je rješivo unutar mjerača, a vjetar jača prema kraju", () => {
    for (let s = 0; s < 200; s++) {
      const track = generateTrack(s);
      track.forEach((t, i) => {
        const p = idealPower(t);
        expect(p).toBeGreaterThan(0.1);
        expect(p).toBeLessThan(0.95);
        expect(Math.abs(t.wind)).toBeLessThanOrEqual(1 + i * 0.5);
      });
    }
  });
});

describe("provjera vremena", () => {
  it("klijentsko vrijeme mora odgovarati serverskom", () => {
    expect(plausibleElapsed(1000, 1200)).toBe(true); // RTT 200 ms
    expect(plausibleElapsed(1000, 990)).toBe(true); // mali šum sata
    expect(plausibleElapsed(1000, 500)).toBe(false); // klijent tvrdi dulje nego što je prošlo
    expect(plausibleElapsed(1000, 5000)).toBe(false); // predugo čekanje s lažnim vremenom
    expect(plausibleElapsed(-5, 100)).toBe(false);
    expect(plausibleElapsed(NaN, 100)).toBe(false);
    expect(plausibleElapsed("1000", 1200)).toBe(false);
  });
});

describe("share", () => {
  it("boje po bacanju", () => {
    expect(shareText("2026-10-21", [100, 60, 10, 85, 0, 0, 0, 0, 0])).toBe("Petica · Boćanje #1 · 255/900 🟩🟨🟥🟩🟥🟥🟥🟥🟥");
  });
});
