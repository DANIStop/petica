"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { updateStreak } from "@/lib/server/streak";
import { findPlay, startArchivePlay, startExtraPlay, type Play } from "@/lib/server/plays";
import type { Photo } from "@/lib/games/kad-i-gdje/commons";
import { isValidGuesses, scoreRound, type KigAnswer, type KigGuess, type PhotoResult } from "@/lib/games/kad-i-gdje/scoring";

const GAME = "kad-i-gdje";

export type Reveal = {
  total: number;
  items: { guess: KigGuess; answer: KigAnswer; result: PhotoResult; source_url: string }[];
};

export type StartResult =
  | { status: "play"; date: string; photos: Photo[]; playId: string; extra: boolean }
  | { status: "done"; date: string; photos: Photo[]; reveal: Reveal; playId: string; extra: boolean }
  | { status: "empty" | "unauthenticated" | "paywall" | "exhausted"; date: string };

async function loadContent(contentId: string) {
  const db = createAdminClient();
  const [{ data: c }, { data: a }] = await Promise.all([
    db.from("content").select("payload").eq("id", contentId).single(),
    db.from("content_answers").select("answer").eq("content_id", contentId).single(),
  ]);
  return { photos: c!.payload.photos as Photo[], answers: a!.answer.answers as KigAnswer[] };
}

function toReveal(guesses: KigGuess[], results: PhotoResult[], total: number, photos: Photo[], answers: KigAnswer[]): Reveal {
  return { total, items: answers.map((answer, i) => ({ guess: guesses[i], answer, result: results[i], source_url: photos[i].source_url })) };
}

// source_url vodi na stranicu s naslovom datoteke (može odati mjesto), pa se klijentu šalje tek u reveal-u
const hideSource = (photos: Photo[]) => photos.map((p) => ({ ...p, source_url: "" }));

export async function startKadIGdje(extra = false, archiveDate?: string): Promise<StartResult> {
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

  const { photos, answers } = await loadContent(play!.content_id);
  if (play!.finished_at) {
    const { guesses, results } = play!.state as { guesses: KigGuess[]; results: PhotoResult[] };
    return { status: "done", date: play!.date, photos, playId: play!.id, extra: play!.kind === "extra", reveal: toReveal(guesses, results, play!.score!, photos, answers) };
  }
  return { status: "play", date: play!.date, photos: hideSource(photos), playId: play!.id, extra };
}

export async function submitKadIGdje(guesses: unknown, playId?: string): Promise<{ error: string } | { reveal: Reveal }> {
  if (!isValidGuesses(guesses)) return { error: "Za svaku fotografiju označi mjesto na karti i upiši godinu." };
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, todayZagreb(), playId);
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Ovu rundu si već odigrao/la." };

  const { photos, answers } = await loadContent(play.content_id);
  const { results, total } = scoreRound(guesses, answers);

  const { data: updated } = await db
    .from("plays")
    .update({ state: { guesses, results }, score: total, finished_at: new Date().toISOString() })
    .eq("id", play.id).is("finished_at", null).select("id");
  if (!updated?.length) return { error: "Ovu rundu si već odigrao/la." };

  if (play.kind === "daily") await updateStreak(db, auth.user.id, GAME, play.date);
  return { reveal: toReveal(guesses, results, total, photos, answers) };
}
