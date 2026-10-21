"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { updateStreak } from "@/lib/server/streak";
import { applySwap, checkSwap, computeColors, isSolved, MAX_SWAPS, type Color, type Grid } from "@/lib/games/rijecko/puzzle";

const GAME = "rijecko";

type PlayState = { grid: Grid; swapsLeft: number; moves: number };

/** Što klijent smije vidjeti; rješenje samo kad je igra gotova. */
export type RijeckoView = {
  date: string;
  grid: Grid;
  colors: Color[];
  swapsLeft: number;
  finished: boolean;
  solved: boolean;
  solution?: Grid;
};

export type StartResult = { status: "ok"; view: RijeckoView } | { status: "empty" | "unauthenticated"; date: string };

async function loadSolution(contentId: string): Promise<Grid> {
  const { data } = await createAdminClient().from("content_answers").select("answer").eq("content_id", contentId).single();
  return data!.answer.solution as Grid;
}

function toView(date: string, state: PlayState, solution: Grid, finished: boolean): RijeckoView {
  const solved = isSolved(state.grid, solution);
  return {
    date,
    grid: state.grid,
    colors: computeColors(state.grid, solution),
    swapsLeft: state.swapsLeft,
    finished,
    solved,
    solution: finished ? solution : undefined,
  };
}

export async function startRijecko(): Promise<StartResult> {
  const date = todayZagreb();
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { status: "unauthenticated", date };

  const db = createAdminClient();
  const find = () =>
    db.from("plays").select("*").eq("user_id", auth.user!.id).eq("game", GAME).eq("date", date).eq("kind", "daily").maybeSingle();

  let { data: play } = await find();
  if (!play) {
    const { data: sched } = await db.from("daily_schedule").select("content_id").eq("date", date).eq("game", GAME).maybeSingle();
    if (!sched) return { status: "empty", date };
    const { data: content } = await db.from("content").select("payload").eq("id", sched.content_id).single();
    const state: PlayState = { grid: content!.payload.grid, swapsLeft: MAX_SWAPS, moves: 0 };
    await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, content_id: sched.content_id, kind: "daily", state });
    // unique indeks štiti od dvostrukog starta; čitamo što je stvarno spremljeno
    ({ data: play } = await find());
  }
  const solution = await loadSolution(play!.content_id);
  return { status: "ok", view: toView(date, play!.state as PlayState, solution, !!play!.finished_at) };
}

export async function swapRijecko(a: unknown, b: unknown): Promise<{ error: string } | { view: RijeckoView }> {
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };

  const date = todayZagreb();
  const db = createAdminClient();
  const { data: play } = await db
    .from("plays").select("*").eq("user_id", auth.user.id).eq("game", GAME).eq("date", date).eq("kind", "daily").maybeSingle();
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Današnju rundu već si odigrao/la." };

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

  if (finished) await updateStreak(db, auth.user.id, GAME, date);
  return { view: toView(date, next, solution, finished) };
}
