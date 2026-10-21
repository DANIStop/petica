import type { SupabaseClient } from "@supabase/supabase-js";
import { isPremium } from "@/lib/premium";
import { chooseExtra } from "./extra";

export type Play = {
  id: string;
  user_id: string;
  game: string;
  date: string;
  content_id: string;
  kind: "daily" | "extra";
  state: any;
  score: number | null;
  finished_at: string | null;
};

/** Dnevna igra (kad nema playId) ili korisnikova vlastita igra po id-u. */
export async function findPlay(db: SupabaseClient, userId: string, game: string, date: string, playId?: string): Promise<Play | null> {
  const q = db.from("plays").select("*").eq("user_id", userId).eq("game", game);
  const { data } = await (playId ? q.eq("id", playId) : q.eq("date", date).eq("kind", "daily")).maybeSingle();
  return data as Play | null;
}

/** Provjera premiuma na serveru (dodatne runde). */
export async function userIsPremium(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from("profiles").select("premium_until").eq("id", userId).single();
  return isPremium(data?.premium_until);
}

export type ExtraResult = { status: "paywall" | "exhausted" } | { status: "ok"; play: Play };

/**
 * Dodatna runda — samo za premium (provjera na serveru). Nastavlja nedovršenu ako postoji,
 * inače bira novi sadržaj kojeg korisnik nije vidio i koji nije u budućem rasporedu.
 */
export async function startExtraPlay(
  db: SupabaseClient,
  userId: string,
  game: string,
  date: string,
  initState: (payload: any) => unknown,
): Promise<ExtraResult> {
  if (!(await userIsPremium(db, userId))) return { status: "paywall" };

  const { data: open } = await db
    .from("plays").select("*").eq("user_id", userId).eq("game", game).eq("kind", "extra").is("finished_at", null).limit(1).maybeSingle();
  if (open) return { status: "ok", play: open as Play };

  const [{ data: approved }, { data: seen }, { data: scheduled }] = await Promise.all([
    db.from("content").select("id").eq("game", game).eq("status", "approved").limit(2000),
    db.from("user_seen").select("content_id").eq("user_id", userId),
    db.from("daily_schedule").select("content_id").eq("game", game).gte("date", date),
  ]);
  const contentId = chooseExtra(
    (approved ?? []).map((c) => c.id),
    new Set((seen ?? []).map((s) => s.content_id)),
    new Set((scheduled ?? []).map((s) => s.content_id)),
  );
  if (!contentId) return { status: "exhausted" };

  const { data: content } = await db.from("content").select("payload").eq("id", contentId).single();
  const { data: play } = await db
    .from("plays")
    .insert({ user_id: userId, game, date, content_id: contentId, kind: "extra", state: initState(content!.payload) })
    .select("*").single();
  await db.from("user_seen").upsert({ user_id: userId, content_id: contentId });
  return { status: "ok", play: play as Play };
}
