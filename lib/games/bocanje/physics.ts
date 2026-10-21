import { hashSeed, mulberry32, type Rng } from "@/lib/rng";

export const THROWS = 9;
export const MAX_RANGE = 30; // m: doseg pri 100% snage bez vjetra
export const WIND_EFFECT = 0.02; // promjena dosega po m/s (+ = vjetar u leđa)
export const METER_PERIOD_MS = 2000; // pun ciklus 0 → 100% → 0
export const POINTS_PER_THROW = 100;
export const MAX_SCORE = THROWS * POINTS_PER_THROW;
/** Pogreška od 2,5 m ili veća daje 0 bodova. */
export const MISS_M = 2.5;

export type Throw = { distance: number; wind: number };
export type ThrowResult = { power: number; landing: number; error: number; points: number };

/** Snaga (0–1) nakon `elapsedMs` od starta mjerača: trokutasti val. */
export function meterPower(elapsedMs: number): number {
  const phase = ((elapsedMs % METER_PERIOD_MS) + METER_PERIOD_MS) % METER_PERIOD_MS / METER_PERIOD_MS;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export const landingDistance = (power: number, wind: number) => power * MAX_RANGE * (1 + WIND_EFFECT * wind);

export function scoreThrow(t: Throw, power: number): ThrowResult {
  const landing = landingDistance(power, t.wind);
  const error = Math.abs(landing - t.distance);
  const points = Math.round(POINTS_PER_THROW * Math.max(0, 1 - error / MISS_M));
  return { power, landing: Math.round(landing * 100) / 100, error: Math.round(error * 100) / 100, points };
}

/** Snaga koja bi pogodila balin (za provjeru rješivosti staze). */
export const idealPower = (t: Throw) => t.distance / (MAX_RANGE * (1 + WIND_EFFECT * t.wind));

const half = (x: number) => Math.round(x * 2) / 2;

/** Staza je deterministična iz seeda; vjetar jača prema kraju (bacanja 1–9). */
export function generateTrack(seed: number | string): Throw[] {
  const rng: Rng = mulberry32(typeof seed === "string" ? hashSeed(seed) : seed);
  return Array.from({ length: THROWS }, (_, i) => {
    const maxWind = 1 + i * 0.5;
    return { distance: half(8 + rng() * 14), wind: half((rng() * 2 - 1) * maxWind) };
  });
}

/** Server provjerava da vrijeme koje javlja klijent odgovara stvarno proteklom (RTT ⇒ server ≥ klijent). */
export const MIN_SKEW_MS = -150;
export const MAX_SKEW_MS = 1500;
export const MAX_ELAPSED_MS = 30_000;

export function plausibleElapsed(clientMs: unknown, serverMs: number): clientMs is number {
  if (typeof clientMs !== "number" || !Number.isFinite(clientMs) || clientMs < 0 || clientMs > MAX_ELAPSED_MS) return false;
  const skew = serverMs - clientMs;
  return skew >= MIN_SKEW_MS && skew <= MAX_SKEW_MS;
}
