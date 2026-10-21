export const PHOTOS_PER_ROUND = 5;
export const MAX_SCORE = 100 * PHOTOS_PER_ROUND;
const LOCATION_MAX = 50;
const YEAR_MAX = 50;
/** Na 1000 km bodovi za lokaciju padnu na ~37% (eksponencijalni pad). */
const DISTANCE_SCALE_KM = 1000;
/** Razlika od 50 i više godina daje 0 bodova za godinu. */
const YEAR_SPAN = 50;

export type Place = { lat: number; lng: number };
export type KigGuess = Place & { year: number };
export type KigAnswer = Place & { year: number };

/** Udaljenost u km (haversine). */
export function distanceKm(a: Place, b: Place): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const locationPoints = (km: number) => Math.round(LOCATION_MAX * Math.exp(-km / DISTANCE_SCALE_KM));
export const yearPoints = (diff: number) => Math.round(YEAR_MAX * Math.max(0, 1 - Math.abs(diff) / YEAR_SPAN));

export type PhotoResult = { km: number; yearDiff: number; locationPoints: number; yearPoints: number; points: number };

export function scorePhoto(guess: KigGuess, answer: KigAnswer): PhotoResult {
  const km = Math.round(distanceKm(guess, answer));
  const yearDiff = guess.year - answer.year;
  const lp = locationPoints(km);
  const yp = yearPoints(yearDiff);
  return { km, yearDiff, locationPoints: lp, yearPoints: yp, points: lp + yp };
}

export function scoreRound(guesses: KigGuess[], answers: KigAnswer[]) {
  const results = answers.map((a, i) => scorePhoto(guesses[i], a));
  return { results, total: results.reduce((s, r) => s + r.points, 0) };
}

export function isValidGuesses(x: unknown, maxYear = new Date().getFullYear()): x is KigGuess[] {
  return (
    Array.isArray(x) &&
    x.length === PHOTOS_PER_ROUND &&
    x.every(
      (g) =>
        Number.isFinite(g?.lat) && g.lat >= -90 && g.lat <= 90 &&
        Number.isFinite(g?.lng) && g.lng >= -180 && g.lng <= 180 &&
        Number.isInteger(g?.year) && g.year >= 1000 && g.year <= maxYear,
    )
  );
}
