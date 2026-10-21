"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { hashSeed } from "@/lib/rng";
import { updateStreak } from "@/lib/server/streak";
import { findPlay, userIsPremium, type Play } from "@/lib/server/plays";
import {
  generateTrack, meterPower, plausibleElapsed, scoreThrow, THROWS, type Throw, type ThrowResult,
} from "@/lib/games/bocanje/physics";

const GAME = "bocanje";

type State = { seed: number; throws: ThrowResult[]; startedAt: number | null; n: number };

/** Staza i vjetar su javni (igraču moraju biti vidljivi); tajna je samo vlastita preciznost. */
export type BocanjeView = {
  date: string;
  playId: string;
  extra: boolean;
  track: Throw[];
  results: ThrowResult[];
  finished: boolean;
  total: number;
};

export type StartResult = { status: "ok"; view: BocanjeView } | { status: "unauthenticated" | "paywall"; date: string };

const initState = (seed: number): State => ({ seed, throws: [], startedAt: null, n: 0 });

function toView(play: Play, state: State): BocanjeView {
  return {
    date: play.date,
    playId: play.id,
    extra: play.kind === "extra",
    track: generateTrack(state.seed),
    results: state.throws,
    finished: !!play.finished_at,
    total: state.throws.reduce((s, t) => s + t.points, 0),
  };
}

export async function startBocanje(extra = false): Promise<StartResult> {
  const date = todayZagreb();
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { status: "unauthenticated", date };
  const db = createAdminClient();

  let play: Play | null;
  if (extra) {
    if (!(await userIsPremium(db, auth.user.id))) return { status: "paywall", date };
    const { data: open } = await db
      .from("plays").select("*").eq("user_id", auth.user.id).eq("game", GAME).eq("kind", "extra").is("finished_at", null).limit(1).maybeSingle();
    if (open) play = open as Play;
    else {
      const seed = Math.floor(Math.random() * 2 ** 32);
      const { data } = await db
        .from("plays").insert({ user_id: auth.user.id, game: GAME, date, kind: "extra", state: initState(seed) }).select("*").single();
      play = data as Play;
    }
  } else {
    play = await findPlay(db, auth.user.id, GAME, date);
    if (!play) {
      // staza je deterministična iz datuma, pa ista za sve igrače tog dana
      await db.from("plays").insert({ user_id: auth.user.id, game: GAME, date, kind: "daily", state: initState(hashSeed(date)) });
      play = await findPlay(db, auth.user.id, GAME, date);
    }
  }
  return { status: "ok", view: toView(play!, play!.state as State) };
}

/** Server bilježi početak mjerača; bacanje je valjano samo ako vrijeme odgovara proteklom. */
export async function beginThrow(playId?: string): Promise<{ error: string } | { ok: true }> {
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };
  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, todayZagreb(), playId);
  if (!play || play.finished_at) return { error: "Runda nije aktivna." };

  const state = play.state as State;
  await db.from("plays").update({ state: { ...state, startedAt: Date.now() } }).eq("id", play.id).is("finished_at", null).eq("state->>n", String(state.n));
  return { ok: true };
}

export async function throwBall(clientElapsedMs: unknown, playId?: string): Promise<{ error: string } | { view: BocanjeView; result: ThrowResult }> {
  const { data: auth } = await createClient().auth.getUser();
  if (!auth.user) return { error: "Prijava nije uspjela. Osvježi stranicu." };
  const db = createAdminClient();
  const play = await findPlay(db, auth.user.id, GAME, todayZagreb(), playId);
  if (!play) return { error: "Runda nije započeta." };
  if (play.finished_at) return { error: "Ovu rundu si već odigrao/la." };

  const state = play.state as State;
  if (state.startedAt === null) return { error: "Prvo pokreni mjerač." };
  if (!plausibleElapsed(clientElapsedMs, Date.now() - state.startedAt)) return { error: "Bacanje nije valjano. Pokušaj ponovno." };

  const track = generateTrack(state.seed);
  const result = scoreThrow(track[state.n], meterPower(clientElapsedMs));
  const next: State = { ...state, throws: [...state.throws, result], startedAt: null, n: state.n + 1 };
  const finished = next.n === THROWS;
  const total = next.throws.reduce((s, t) => s + t.points, 0);

  // zaključavanje po broju bacanja: dva istovremena zahtjeva ne mogu oba proći
  const { data: updated } = await db
    .from("plays")
    .update({ state: next, ...(finished ? { score: total, finished_at: new Date().toISOString() } : {}) })
    .eq("id", play.id).is("finished_at", null).eq("state->>n", String(state.n)).select("id");
  if (!updated?.length) return { error: "Pokušaj ponovno." };

  if (finished && play.kind === "daily") await updateStreak(db, auth.user.id, GAME, play.date);
  return { view: toView({ ...play, finished_at: finished ? "x" : null }, next), result };
}
