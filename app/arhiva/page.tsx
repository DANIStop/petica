import Paywall from "@/components/Paywall";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, LAUNCH_DATE, todayZagreb } from "@/lib/date";
import { GAMES } from "@/lib/games/registry";
import { isPremium } from "@/lib/premium";

export const dynamic = "force-dynamic";
const SHOW_DAYS = 30;

export default async function Arhiva() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  const { data: profile } = await supabase.from("profiles").select("premium_until").eq("id", auth.user.id).single();
  if (!isPremium(profile?.premium_until)) return <Paywall />;

  const today = todayZagreb();
  const db = createAdminClient(); // raspored više nije čitljiv klijentu (RLS), pa ide preko servera
  const [{ data: sched }, { data: mine }] = await Promise.all([
    db.from("daily_schedule").select("game,date").lt("date", today).gte("date", LAUNCH_DATE).order("date", { ascending: false }).limit(500),
    supabase.from("plays").select("game,date,finished_at").eq("archive", true),
  ]);
  const finished = new Set((mine ?? []).filter((p) => p.finished_at).map((p) => `${p.game}:${p.date}`));

  const datesFor = (slug: string): string[] => {
    if (slug === "bocanje") {
      // staza se generira iz datuma pa su dostupni svi dani od lansiranja
      const out: string[] = [];
      for (let d = addDays(today, -1); d >= LAUNCH_DATE && out.length < SHOW_DAYS; d = addDays(d, -1)) out.push(d);
      return out;
    }
    return (sched ?? []).filter((s) => s.game === slug).map((s) => s.date).slice(0, SHOW_DAYS);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Arhiva ⭐</h1>
      <p className="text-muted">Odigraj propuštene dane. Arhiva ne utječe na streak.</p>
      {GAMES.map((g) => {
        const dates = datesFor(g.slug);
        return (
          <section key={g.slug}>
            <h2 className="mb-2 font-semibold" style={{ color: g.accent }}>{g.name}</h2>
            {dates.length === 0 ? (
              <p className="text-sm text-muted">Još nema prošlih dana.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <a key={d} href={`/${g.slug}?arhiva=${d}`} className="rounded-lg bg-card px-3 py-1 text-sm">
                    {d.slice(8)}.{d.slice(5, 7)}.{finished.has(`${g.slug}:${d}`) ? " ✓" : ""}
                  </a>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
