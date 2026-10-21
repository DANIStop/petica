import { PHOTOS_PER_ROUND } from "./scoring";

/** Samo licence koje dopuštaju ponovnu objavu uz navođenje autora. */
const ALLOWED_LICENSE = /^(public domain|pd[- ]|cc0|cc[- ]by(?![- ]nc)(?![- ]nd)|cc[- ]by[- ]sa)/i;

export type CommonsPage = {
  title: string;
  coordinates?: { lat: number; lon: number }[];
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
};

export type Photo = {
  url: string;
  author: string;
  license: string;
  license_url: string | null;
  source_url: string;
};
export type Candidate = { photo: Photo; lat: number; lng: number; year: number };

export const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

/** Godina iz DateTimeOriginal: samo ako je u tekstu točno jedna jasna 4-znamenkasta godina. */
export function parseYear(raw: string | undefined, maxYear = new Date().getFullYear()): number | null {
  if (!raw) return null;
  const years = [...new Set(stripHtml(raw).match(/\b(1[5-9]\d\d|20\d\d)\b/g) ?? [])];
  if (years.length !== 1) return null;
  const y = Number(years[0]);
  return y <= maxYear ? y : null;
}

/** Stranicu s Commonsa pretvara u kandidata ili null ako nema koordinate, godinu, autora ili dopuštenu licencu. */
export function toCandidate(page: CommonsPage): Candidate | null {
  const info = page.imageinfo?.[0];
  const coord = page.coordinates?.[0];
  if (!info?.thumburl || !info.descriptionurl || !coord) return null;

  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ? stripHtml(meta.LicenseShortName.value) : "";
  const author = meta.Artist?.value ? stripHtml(meta.Artist.value) : "";
  const year = parseYear(meta.DateTimeOriginal?.value);
  if (!license || !ALLOWED_LICENSE.test(license) || !year) return null;
  // zahtjev licence: autor se mora moći navesti (za PD dopuštamo i nepoznat autor)
  const isPd = /^(public domain|pd[- ]|cc0)/i.test(license);
  if (!author && !isPd) return null;

  return {
    photo: {
      url: info.thumburl,
      author: author || "nepoznat autor",
      license,
      license_url: meta.LicenseUrl?.value ?? null,
      source_url: info.descriptionurl,
    },
    lat: coord.lat,
    lng: coord.lon,
    year,
  };
}

export function toRounds(candidates: Candidate[]) {
  const rounds = [];
  for (let i = 0; i + PHOTOS_PER_ROUND <= candidates.length; i += PHOTOS_PER_ROUND) {
    const chunk = candidates.slice(i, i + PHOTOS_PER_ROUND);
    rounds.push({
      payload: { photos: chunk.map((c) => c.photo) },
      answer: { answers: chunk.map((c) => ({ lat: c.lat, lng: c.lng, year: c.year })) },
      source_url: chunk[0].photo.source_url,
    });
  }
  return rounds;
}
