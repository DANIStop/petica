import type { Rng } from "@/lib/rng";

/** Dodatna runda: odobreni sadržaj koji korisnik nije vidio i koji nije (više) zakazan kao dnevni. */
export function chooseExtra(approved: string[], seen: Set<string>, scheduled: Set<string>, rng: Rng = Math.random): string | null {
  const free = approved.filter((id) => !seen.has(id) && !scheduled.has(id));
  return free.length ? free[Math.floor(rng() * free.length)] : null;
}
