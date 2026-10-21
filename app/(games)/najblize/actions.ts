"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { updateStreak } from "@/lib/server/streak";
import { findPlay, startArchivePlay, startExtraPlay, type Play } from "@/lib/server/plays";
import { isValidGuesses, scoreRound, type NajblizeAnswer, type NajblizeQuestion } from "@/lib/games/najblize/scoring";

const GAME = "najblize";

export type Reveal = {
  scores: number[];
  total: number;
  guesses: number[];
  answers: NajblizeAnswer[];
};

export type StartResult =
  | { status: "play"; date: string; questions: NajblizeQuestion[]; playId: string; extra: boolean }
  | { status: "done"; date: string; questions: NajblizeQuestion[]; reveal: Reveal; playId: string; extra: boolean }
  | { status: "empty" | "unauthenticated" | "paywall" | "exhausted"; date: string };

async function loadContent(contentId: string) {
  const db = createAdminClient();
  const [{ data: c }, { data: a }] = await Promise.all([
    db.from("content").select("payload").eq("id", contentId).single(),
    db.from("content_answers").select("answer").eq("content_id", contentId).single(),
  ]);
  return {
    questions: (c?.payload.questions ?? []) as NajblizeQuestion[],
    answers: (a?.answer.answers ?? []) as NajblizeAnswer[],
  };
}

export async function startNajblize(extra = false, archiveDate?: string): Promise<StartResult> {
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
      // unique indeks na (user, game, date) za daily štiti od dvostrukog starta
      await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, content_id: sched.content_id, kind: "daily" });
      play = await findPlay(db, auth.user.id, GAME, date);
    }
  }

  const { questions, answers } = await loadContent(play!.content_id);
  if (play!.finished_at) {
    const { guesses, scores } = play!.state as { guesses: number[]; scores: number[] };
    return { status: "done", date: play!.date, questions, playId: play!.id, extra: play!.kind === "extra", reveal: { guesses, scores, total: play!.score!, answers } };
  }
  return { status: "play", date: play!.date, questions, playId: play!.id, extra };
}

export async function submitNajblize(guesses: unknown, playId?: string): Promise<{ error: string } | { reveal: Reveal }> {
  if (!isValidGuesses(guesses)) return { error: "Unesi broj za svako pitanje." };
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const date = todayZagreb();
  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, date, playId);
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Ovu rundu si već odigrao/la." };

  const { answers } = await loadContent(play.content_id);
  const { scores, total } = scoreRound(guesses, answers.map((a) => a.value));

  // uvjet finished_at is null sprječava dvostruku predaju
  const { data: updated } = await db
    .from("plays")
    .update({ state: { guesses, scores }, score: total, finished_at: new Date().toISOString() })
    .eq("id", play.id).is("finished_at", null).select("id");
  if (!updated?.length) return { error: "Ovu rundu si već odigrao/la." };

  if (play.kind === "daily") await updateStreak(db, auth.user.id, GAME, play.date);
  return { reveal: { guesses, scores, total, answers } };
}
