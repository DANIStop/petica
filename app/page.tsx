import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/games/registry";
import { formatEditionDate, roundNumber, todayZagreb } from "@/lib/date";
import Countdown from "@/components/Countdown";
import GameGlyph from "@/components/GameGlyph";
import SaveStreakPrompt from "@/components/SaveStreakPrompt";
import { activeStreak, EMPTY_STREAK, type Streak } from "@/lib/streak";

export const dynamic = "force-dynamic";

async function loadStatus(today: string) {
  const played = new Set<string>();
  const streaks = new Map<string, Streak>();
  const none = { played, streaks, offerSave: false };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return none;

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return none;

  const [plays, st] = await Promise.all([
    supabase.from("plays").select("game").eq("date", today).eq("kind", "daily").not("finished_at", "is", null),
    supabase.from("streaks").select("game,current,best,last_date"),
  ]);
  plays.data?.forEach((p) => played.add(p.game));
  st.data?.forEach((s) => streaks.set(s.game, s));
  // prompt tek nakon prve odigrane igre i samo anonimnim korisnicima
  return { played, streaks, offerSave: !!auth.user.is_anonymous && (st.data?.length ?? 0) > 0 };
}

export default async function Home() {
  const now = new Date();
  const today = todayZagreb(now);
  const { played, streaks, offerSave } = await loadStatus(today);
  const done = GAMES.filter((g) => played.has(g.slug)).length;

  return (
    <>
      <header className="rise">
        <p className="kicker">{formatEditionDate(now)} · Izdanje br. {roundNumber(today)}</p>
        <hr className="rule-double mt-3" />
        <h1 className="wordmark mt-5">
          Petica<span style={{ color: "#ffb042" }}>.</span>
        </h1>
        <p className="mt-3 max-w-[22rem] text-[1.02rem] leading-snug text-muted">
          Pet igara, jedna runda svake. Svaki dan novo izdanje.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {GAMES.map((g) => (
              <span key={g.slug} className="pip" data-on={played.has(g.slug)} style={{ ["--accent" as string]: g.accent }} />
            ))}
          </div>
          <p className="kicker">{done === GAMES.length ? "Sve odigrano — do sutra!" : `${done} od ${GAMES.length} odigrano`}</p>
        </div>
      </header>

      <ul className="mt-7 space-y-3">
        {GAMES.map((g, i) => {
          const streak = activeStreak(streaks.get(g.slug) ?? EMPTY_STREAK, today);
          const isDone = played.has(g.slug);
          return (
            <li key={g.slug} className="rise" style={{ ["--i" as string]: i + 1 }}>
              <a
                href={`/${g.slug}`}
                className="game-card"
                data-done={isDone}
                style={{ ["--accent" as string]: g.accent }}
              >
                <span className="glyph"><GameGlyph slug={g.slug} /></span>
                <span className="min-w-0">
                  <span className="kicker block" style={{ color: g.accent }}>
                    {String(i + 1).padStart(2, "0")}{streak > 0 && <> · 🔥 {streak}</>}
                  </span>
                  <span className="block font-display text-[1.55rem] font-bold leading-tight">{g.name}</span>
                  <span className="block text-[0.88rem] leading-snug text-muted">{g.tagline}</span>
                </span>
                {isDone ? <span className="pill pill-done">✓ Odigrano</span> : <span className="pill pill-go">Igraj →</span>}
              </a>
            </li>
          );
        })}
      </ul>

      {offerSave && <SaveStreakPrompt />}

      <footer className="rise mt-9 text-center" style={{ ["--i" as string]: 7 }}>
        <hr className="rule" />
        <p className="kicker mt-4">Idući broj za <Countdown /></p>
        <nav className="mt-4 flex flex-wrap justify-center gap-2">
          <a className="nav-pill" href="/arhiva">Arhiva</a>
          <a className="nav-pill" href="/statistika">Statistika</a>
          <a className="nav-pill" href="/premium">Premium ⭐</a>
        </nav>
      </footer>
    </>
  );
}
