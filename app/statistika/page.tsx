import Paywall from "@/components/Paywall";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayZagreb } from "@/lib/date";
import { GAMES } from "@/lib/games/registry";
import { isPremium } from "@/lib/premium";
import { computeStats, MAX_SCORES } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Statistika() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  const { data: profile } = await supabase.from("profiles").select("premium_until").eq("id", auth.user.id).single();
  if (!isPremium(profile?.premium_until)) return <Paywall />;

  const today = todayZagreb();
  const [{ data: plays }, { data: streaks }] = await Promise.all([
    supabase.from("plays").select("game,kind,score,finished_at"),
    supabase.from("streaks").select("game,current,best,last_date"),
  ]);
  const stats = computeStats(GAMES.map((g) => g.slug), plays ?? [], streaks ?? [], today, addDays(today, -1));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Statistika ⭐</h1>
      {GAMES.map((g, i) => {
        const s = stats[i];
        return (
          <section key={g.slug} className="rounded-xl border-l-4 bg-card p-4" style={{ borderColor: g.accent }}>
            <h2 className="font-semibold">{g.name}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted">Odigrano</dt><dd>{s.played} (dnevnih {s.daily})</dd>
              <dt className="text-muted">Prosjek</dt><dd>{s.average} / {MAX_SCORES[g.slug]}</dd>
              <dt className="text-muted">Najbolje</dt><dd>{s.best} / {MAX_SCORES[g.slug]}</dd>
              <dt className="text-muted">Streak</dt><dd>🔥 {s.streak} (rekord {s.bestStreak})</dd>
            </dl>
          </section>
        );
      })}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
