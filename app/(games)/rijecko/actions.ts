"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { updateStreak } from "@/lib/server/streak";
import { findPlay, startExtraPlay, type Play } from "@/lib/server/plays";
import { applySwap, checkSwap, computeColors, isSolved, MAX_SWAPS, type Color, type Grid } from "@/lib/games/rijecko/puzzle";

const GAME = "rijecko";

type PlayState = { grid: Grid; swapsLeft: number; moves: number };

/** Što klijent smije vidjeti; rješenje samo kad je igra gotova. */
export type RijeckoView = {
  date: string;
  playId: string;
  extra: boolean;
  grid: Grid;
  colors: Color[];
  swapsLeft: number;
  finished: boolean;
  solved: boolean;
  solution?: Grid;
};

export type StartResult = { status: "ok"; view: RijeckoView } | { status: "empty" | "unauthenticated" | "paywall" | "exhausted"; date: string };

async function loadSolution(contentId: string): Promise<Grid> {
  const { data } = await createAdminClient().from("content_answers").select("answer").eq("content_id", contentId).single();
  return data!.answer.solution as Grid;
}

function toView(play: Play, state: PlayState, solution: Grid, finished: boolean): RijeckoView {
  const solved = isSolved(state.grid, solution);
  return {
    date: play.date,
    playId: play.id,
    extra: play.kind === "extra",
    grid: state.grid,
    colors: computeColors(state.grid, solution),
    swapsLeft: state.swapsLeft,
    finished,
    solved,
    solution: finished ? solution : undefined,
  };
}

const initState = (payload: { grid: Grid }): PlayState => ({ grid: payload.grid, swapsLeft: MAX_SWAPS, moves: 0 });

export async function startRijecko(extra = false): Promise<StartResult> {
  const date = todayZagreb();
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { status: "unauthenticated", date };

  const db = createAdminClient();
  let play: Play | null;

  if (extra) {
    const res = await startExtraPlay(db, auth.user.id, GAME, date, initState);
    if (res.status !== "ok") return { status: res.status, date };
    play = res.play;
  } else {
    play = await findPlay(db, auth.user.id, GAME, date);
    if (!play) {
      const { data: sched } = await db.from("daily_schedule").select("content_id").eq("date", date).eq("game", GAME).maybeSingle();
      if (!sched) return { status: "empty", date };
      const { data: content } = await db.from("content").select("payload").eq("id", sched.content_id).single();
      await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, content_id: sched.content_id, kind: "daily", state: initState(content!.payload) });
      // unique indeks štiti od dvostrukog starta; čitamo što je stvarno spremljeno
      play = await findPlay(db, auth.user.id, GAME, date);
    }
  }
  const solution = await loadSolution(play!.content_id);
  return { status: "ok", view: toView(play!, play!.state as PlayState, solution, !!play!.finished_at) };
}

export async function swapRijecko(a: unknown, b: unknown, playId?: string): Promise<{ error: string } | { view: RijeckoView }> {
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const date = todayZagreb();
  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, date, playId);
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Ovu rundu si već odigrao/la." };

  const state = play.state as PlayState;
  const solution = await loadSolution(play.content_id);
  if (state.swapsLeft <= 0) return { error: "Nema više zamjena." };

  const check = checkSwap(state.grid, solution, a, b);
  if (!check.ok) return { error: check.reason };

  const next: PlayState = {
    grid: applySwap(state.grid, a as number, b as number),
    swapsLeft: state.swapsLeft - 1,
    moves: state.moves + 1,
  };
  const solved = isSolved(next.grid, solution);
  const finished = solved || next.swapsLeft === 0;

  // optimistično zaključavanje po broju poteza: dva istovremena zahtjeva ne mogu oba proći
  const { data: updated } = await db
    .from("plays")
    .update({
      state: next,
      ...(finished ? { score: solved ? next.swapsLeft : 0, finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", play.id).is("finished_at", null).eq("state->>moves", String(state.moves)).select("id");
  if (!updated?.length) return { error: "Pokušaj ponovno." };

  if (finished && play.kind === "daily") await updateStreak(db, auth.user.id, GAME, play.date);
  return { view: toView(play, next, solution, finished) };
}
