export const TIME_ZONE = "Europe/Zagreb";

/** Današnji datum (YYYY-MM-DD) po zagrebačkom vremenu; reset je u ponoć. */
export function todayZagreb(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const LAUNCH_DATE = "2026-10-21";

/** Redni broj dnevne runde (#1 = dan lansiranja). */
export function roundNumber(date: string): number {
  const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`)) / 86_400_000;
  return Math.max(1, Math.round(days) + 1);
}

const HR_DATE = new Intl.DateTimeFormat("hr-HR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** npr. "srijeda, 21. listopada 2026." */
export const formatEditionDate = (now: Date = new Date()): string => HR_DATE.format(now);

/** Milisekunde do iduće ponoći po zagrebačkom vremenu (netočno do 1 h samo na dane promjene sata). */
export function msUntilMidnightZagreb(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(now)
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  return (86_400 - (parts.hour * 3600 + parts.minute * 60 + parts.second)) * 1000 - now.getMilliseconds();
}
