import { filterNew, normalizeQuestion, toRounds as questionRounds, isValidRaw, type RawQuestion } from "@/lib/games/najblize/generator";
import { isValidEntries, normalizeAnswer, type DubinaEntry } from "@/lib/games/dubina/scoring";
import { toRounds as photoRounds, type Candidate } from "@/lib/games/kad-i-gdje/commons";

export type Round = { payload: unknown; answer: unknown; source_url: string | null; difficulty: number };
export type Existing = { questions: Set<string>; categories: Set<string>; photoSources: Set<string> };
export type ImportResult = { rounds: Round[]; errors: string[] };

export const IMPORTABLE = ["najblize", "dubina", "kad-i-gdje"] as const;
export const isImportable = (g: string): g is (typeof IMPORTABLE)[number] => (IMPORTABLE as readonly string[]).includes(g);

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const isHttp = (x: unknown): x is string => typeof x === "string" && /^https?:\/\//.test(x);

/** Provjera oblika sadržaja pri ručnom uređivanju. Vraća poruku greške ili null. */
export function validateContent(game: string, payload: unknown, answer: unknown): string | null {
  if (!isObj(payload) || !isObj(answer)) return "Očekujem objekt s poljima payload i answer.";
  if (game === "najblize") {
    const q = payload.questions, a = answer.answers;
    if (!Array.isArray(q) || q.length !== 5 || !q.every((x) => isObj(x) && isStr(x.question) && isStr(x.unit))) return "payload.questions: točno 5 pitanja s poljima question i unit.";
    if (!Array.isArray(a) || a.length !== 5 || !a.every((x) => isObj(x) && Number.isFinite(x.value) && isHttp(x.source_url))) return "answer.answers: točno 5 odgovora s poljima value (broj) i source_url (http/https).";
    return null;
  }
  if (game === "dubina") {
    if (!isStr(payload.category)) return "payload.category mora biti tekst.";
    if (!isValidEntries(answer.entries)) return "answer.entries: najmanje 10 odgovora s poljima text i count > 0.";
    return null;
  }
  if (game === "kad-i-gdje") {
    const p = payload.photos, a = answer.answers;
    if (!Array.isArray(p) || p.length !== 5 || !p.every((x) => isObj(x) && isHttp(x.url) && isStr(x.author) && isStr(x.license) && isHttp(x.source_url))) return "payload.photos: točno 5 fotografija (url, author, license, source_url).";
    if (!Array.isArray(a) || a.length !== 5 || !a.every((x) => isObj(x) && Number.isFinite(x.lat) && Number.isFinite(x.lng) && Number.isInteger(x.year))) return "answer.answers: točno 5 zapisa s lat, lng i year.";
    return null;
  }
  return "Ručno uređivanje nije podržano za ovu igru.";
}

export function parseImport(game: string, input: unknown, existing: Existing): ImportResult {
  const errors: string[] = [];
  const list = Array.isArray(input) ? input : null;
  if (!list) return { rounds: [], errors: ["Očekujem JSON polje []."] };

  if (game === "najblize") {
    const valid = list.filter(isValidRaw);
    if (valid.length < list.length) errors.push(`${list.length - valid.length} pitanja preskočeno (neispravan oblik: treba question, unit, answer, source_url s http(s), difficulty 1–5).`);
    const fresh = filterNew(valid, existing.questions);
    if (fresh.length < valid.length) errors.push(`${valid.length - fresh.length} duplikata preskočeno.`);
    const rest = fresh.length % 5;
    if (rest) errors.push(`${rest} pitanja ostalo izvan pune runde od 5 (nisu uvezena).`);
    return { rounds: questionRounds(fresh as RawQuestion[]), errors };
  }

  if (game === "dubina") {
    const seen = new Set(existing.categories);
    const rounds: Round[] = [];
    list.forEach((x, i) => {
      if (!isObj(x) || !isStr(x.category) || !isValidEntries(x.entries)) { errors.push(`Stavka ${i + 1}: treba category i ≥10 odgovora (text, count > 0).`); return; }
      const key = normalizeAnswer(x.category);
      if (seen.has(key)) { errors.push(`Stavka ${i + 1}: kategorija već postoji.`); return; }
      seen.add(key);
      rounds.push({ payload: { category: x.category }, answer: { entries: x.entries as DubinaEntry[] }, source_url: null, difficulty: 3 });
    });
    return { rounds, errors };
  }

  if (game === "kad-i-gdje") {
    const seen = new Set(existing.photoSources);
    const ok: Candidate[] = [];
    list.forEach((x, i) => {
      const valid = isObj(x) && isHttp(x.url) && isStr(x.author) && isStr(x.license) && isHttp(x.source_url) &&
        Number.isFinite(x.lat) && Number.isFinite(x.lng) && Number.isInteger(x.year);
      if (!valid) { errors.push(`Stavka ${i + 1}: treba url, author, license, source_url, lat, lng, year.`); return; }
      const o = x as Record<string, unknown>;
      if (seen.has(o.source_url as string)) { errors.push(`Stavka ${i + 1}: fotografija već postoji.`); return; }
      seen.add(o.source_url as string);
      ok.push({
        photo: { url: o.url as string, author: o.author as string, license: o.license as string, license_url: (o.license_url as string) ?? null, source_url: o.source_url as string },
        lat: o.lat as number, lng: o.lng as number, year: o.year as number,
      });
    });
    const rest = ok.length % 5;
    if (rest) errors.push(`${rest} fotografija ostalo izvan pune runde od 5 (nisu uvezene).`);
    return { rounds: photoRounds(ok).map((r) => ({ ...r, difficulty: 3 })), errors };
  }

  return { rounds: [], errors: ["Uvoz nije podržan za ovu igru."] };
}

export { normalizeQuestion };
