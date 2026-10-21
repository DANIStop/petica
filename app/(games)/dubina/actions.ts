"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { updateStreak } from "@/lib/server/streak";
import { findPlay, startArchivePlay, startExtraPlay, type Play } from "@/lib/server/plays";
import { isValidGuesses, scoreRound, type DubinaEntry, type GuessResult } from "@/lib/games/dubina/scoring";

const GAME = "dubina";

/** Nakon predaje: svi odgovori s udjelom (%) i ono što je korisnik pogodio. */
export type Reveal = {
  results: GuessResult[];
  total: number;
  answers: { text: string; percent: number }[];
};

export type StartResult =
  | { status: "play"; date: string; category: string; playId: string; extra: boolean }
  | { status: "done"; date: string; category: string; reveal: Reveal; playId: string; extra: boolean }
  | { status: "empty" | "unauthenticated" | "paywall" | "exhausted"; date: string };

async function loadContent(contentId: string) {
  const db = createAdminClient();
  const [{ data: c }, { data: a }] = await Promise.all([
    db.from("content").select("payload").eq("id", contentId).single(),
    db.from("content_answers").select("answer").eq("content_id", contentId).single(),
  ]);
  return { category: c!.payload.category as string, entries: a!.answer.entries as DubinaEntry[] };
}

function toReveal(results: GuessResult[], total: number, entries: DubinaEntry[]): Reveal {
  const sum = entries.reduce((s, e) => s + e.count, 0);
  return {
    results,
    total,
    answers: entries
      .map((e) => ({ text: e.text, percent: Math.round((e.count / sum) * 1000) / 10 }))
      .sort((a, b) => b.percent - a.percent),
  };
}

export async function startDubina(extra = false, archiveDate?: string): Promise<StartResult> {
  const date = todayZagreb();
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { status: "unauthenticated", date };

  const db = createAdminClient();
  let play: Play | null;

  if (archiveDate) {
    const res = await startArchivePlay(db, auth.user.id, GAME, archiveDate, date, () => ({}));
    if (res.status !== "ok") return { status: res.status === "invalid" ? "empty" : res.status, date };
    play = res.play;
  } else if (extra) {
    const res = await startExtraPlay(db, auth.user.id, GAME, date, () => ({}));
    if (res.status !== "ok") return { status: res.status, date };
    play = res.play;
  } else {
    play = await findPlay(db, auth.user.id, GAME, date);
    if (!play) {
      const { data: sched } = await db.from("daily_schedule").select("content_id").eq("date", date).eq("game", GAME).maybeSingle();
      if (!sched) return { status: "empty", date };
      await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, content_id: sched.content_id, kind: "daily" });
      play = await findPlay(db, auth.user.id, GAME, date);
    }
  }

  const { category, entries } = await loadContent(play!.content_id);
  if (play!.finished_at) {
    const { results } = play!.state as { results: GuessResult[] };
    return { status: "done", date: play!.date, category, playId: play!.id, extra: play!.kind === "extra", reveal: toReveal(results, play!.score!, entries) };
  }
  return { status: "play", date: play!.date, category, playId: play!.id, extra };
}

export async function submitDubina(guesses: unknown, playId?: string): Promise<{ error: string } | { reveal: Reveal }> {
  if (!isValidGuesses(guesses)) return { error: "Upiši barem jedan odgovor." };
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, todayZagreb(), playId);
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Ovu rundu si već odigrao/la." };

  const { entries } = await loadContent(play.content_id);
  const { results, total } = scoreRound(guesses, entries);

  const { data: updated } = await db
    .from("plays")
    .update({ state: { results }, score: total, finished_at: new Date().toISOString() })
    .eq("id", play.id).is("finished_at", null).select("id");
  if (!updated?.length) return { error: "Ovu rundu si već odigrao/la." };

  if (play.kind === "daily") await updateStreak(db, auth.user.id, GAME, play.date);
  return { reveal: toReveal(results, total, entries) };
}
