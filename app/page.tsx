import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/games/registry";
import { todayZagreb } from "@/lib/date";
import { activeStreak, EMPTY_STREAK, type Streak } from "@/lib/streak";

export const dynamic = "force-dynamic";

async function loadStatus(today: string) {
  const played = new Set<string>();
  const streaks = new Map<string, Streak>();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { played, streaks };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { played, streaks };

  const [plays, st] = await Promise.all([
    supabase.from("plays").select("game").eq("date", today).eq("kind", "daily").not("finished_at", "is", null),
    supabase.from("streaks").select("game,current,best,last_date"),
  ]);
  plays.data?.forEach((p) => played.add(p.game));
  st.data?.forEach((s) => streaks.set(s.game, s));
  return { played, streaks };
}

export default async function Home() {
  const today = todayZagreb();
  const { played, streaks } = await loadStatus(today);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Petica.</h1>
        <p className="text-muted">Pet igara dnevno. Svaki dan nova runda.</p>
      </header>
      <ul className="space-y-3">
        {GAMES.map((g) => {
          const streak = activeStreak(streaks.get(g.slug) ?? EMPTY_STREAK, today);
          const done = played.has(g.slug);
          return (
            <li key={g.slug}>
              <a
                href={g.available ? `/${g.slug}` : undefined}
                aria-disabled={!g.available}
                className="flex items-center justify-between rounded-xl bg-card p-4 border-l-4"
                style={{ borderColor: g.accent }}
              >
                <span>
                  <span className="block text-lg font-semibold">{g.name}</span>
                  <span className="block text-sm text-muted">{g.tagline}</span>
                </span>
                <span className="text-sm text-right">
                  {!g.available ? "Uskoro" : done ? "Odigrano ✓" : "Igraj"}
                  {streak > 0 && <span className="block">🔥 {streak}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
