export const GUESSES_PER_ROUND = 5;
export const MAX_SCORE = 100 * GUESSES_PER_ROUND;
export const MIN_POINTS = 10;

/** `count` je relativna učestalost odgovora (veći = češći = manje bodova). */
export type DubinaEntry = { text: string; aliases?: string[]; count: number };

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  const rest = (s: string, from: number) => s.slice(from);
  return (
    rest(a, i + 1) === rest(b, i + 1) || // zamjena slova
    (a[i] === b[i + 1] && a[i + 1] === b[i] && rest(a, i + 2) === rest(b, i + 2)) || // transpozicija
    rest(a, i + 1) === rest(b, i) || // brisanje u a
    rest(a, i) === rest(b, i + 1) // brisanje u b
  );
}

/** Točno podudaranje (bez dijakritika/velikih slova) ili jedna tipfeler-greška kod dužih odgovora. */
export function matchEntry(guess: string, entries: DubinaEntry[]): number {
  const g = normalizeAnswer(guess);
  if (!g) return -1;
  const names = entries.map((e) => [e.text, ...(e.aliases ?? [])].map(normalizeAnswer));
  const exact = names.findIndex((n) => n.includes(g));
  if (exact >= 0) return exact;
  if (g.length < 6) return -1;
  return names.findIndex((n) => n.some((x) => x.length >= 6 && distanceAtMostOne(g, x)));
}

/** Najčešći odgovor daje 10 bodova, najrjeđi 100. */
export function pointsFor(entry: DubinaEntry, maxCount: number): number {
  return MIN_POINTS + Math.round((100 - MIN_POINTS) * (1 - entry.count / maxCount));
}

export type GuessResult = { guess: string; entry: number; points: number };

/** Svaki odgovor s popisa vrijedi samo jednom; izvan popisa i duplikati donose 0. */
export function scoreRound(guesses: string[], entries: DubinaEntry[]): { results: GuessResult[]; total: number } {
  const maxCount = Math.max(...entries.map((e) => e.count));
  const used = new Set<number>();
  const results = guesses.map((guess) => {
    const entry = matchEntry(guess, entries);
    if (entry < 0 || used.has(entry)) return { guess, entry: entry < 0 ? -1 : entry, points: 0 };
    used.add(entry);
    return { guess, entry, points: pointsFor(entries[entry], maxCount) };
  });
  return { results, total: results.reduce((s, r) => s + r.points, 0) };
}

export function isValidGuesses(x: unknown): x is string[] {
  return (
    Array.isArray(x) &&
    x.length === GUESSES_PER_ROUND &&
    x.every((s) => typeof s === "string" && s.length <= 40) &&
    x.some((s) => normalizeAnswer(s) !== "")
  );
}

export function isValidEntries(x: unknown): x is DubinaEntry[] {
  return (
    Array.isArray(x) &&
    x.length >= 10 &&
    x.every((e) => typeof e?.text === "string" && e.text.trim() !== "" && Number.isFinite(e.count) && e.count > 0)
  );
}
