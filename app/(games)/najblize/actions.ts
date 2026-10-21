"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { recordPlay, EMPTY_STREAK } from "@/lib/streak";
import { isValidGuesses, scoreRound, type NajblizeAnswer, type NajblizeQuestion } from "@/lib/games/najblize/scoring";

const GAME = "najblize";

export type Reveal = {
  scores: number[];
  total: number;
  guesses: number[];
  answers: NajblizeAnswer[];
};

export type StartResult =
  | { status: "play"; date: string; questions: NajblizeQuestion[] }
  | { status: "done"; date: string; questions: NajblizeQuestion[]; reveal: Reveal }
  | { status: "empty" | "unauthenticated"; date: string };

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

export async function startNajblize(): Promise<StartResult> {
  const date = todayZagreb();
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { status: "unauthenticated", date };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("plays").select("*").eq("user_id", auth.user.id).eq("game", GAME).eq("date", date).eq("kind", "daily").maybeSingle();

  let contentId = existing?.content_id as string | undefined;
  if (!contentId) {
    const { data: sched } = await db.from("daily_schedule").select("content_id").eq("date", date).eq("game", GAME).maybeSingle();
    if (!sched) return { status: "empty", date };
    contentId = sched.content_id;
    // unique indeks na (user, game, date) za daily štiti od dvostrukog starta
    await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, content_id: contentId, kind: "daily" });
  }

  const { questions, answers } = await loadContent(contentId!);
  if (existing?.finished_at) {
    const { guesses, scores } = existing.state as { guesses: number[]; scores: number[] };
    return { status: "done", date, questions, reveal: { guesses, scores, total: existing.score, answers } };
  }
  return { status: "play", date, questions };
}

export async function submitNajblize(guesses: unknown): Promise<{ error: string } | { reveal: Reveal }> {
  if (!isValidGuesses(guesses)) return { error: "Unesi broj za svako pitanje." };
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const date = todayZagreb();
  const db = createAdminClient();
  const { data: play } = await db
    .from("plays").select("*").eq("user_id", auth.user.id).eq("game", GAME).eq("date", date).eq("kind", "daily").maybeSingle();
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Današnju rundu već si odigrao/la." };

  const { answers } = await loadContent(play.content_id);
  const { scores, total } = scoreRound(guesses, answers.map((a) => a.value));

  // uvjet finished_at is null sprječava dvostruku predaju
  const { data: updated } = await db
    .from("plays")
    .update({ state: { guesses, scores }, score: total, finished_at: new Date().toISOString() })
    .eq("id", play.id).is("finished_at", null).select("id");
  if (!updated?.length) return { error: "Današnju rundu već si odigrao/la." };

  const { data: row } = await db.from("streaks").select("current,best,last_date").eq("user_id", auth.user.id).eq("game", GAME).maybeSingle();
  const next = recordPlay(row ?? EMPTY_STREAK, date);
  await db.from("streaks").upsert({ user_id: auth.user.id, game: GAME, ...next });

  return { reveal: { guesses, scores, total, answers } };
}
