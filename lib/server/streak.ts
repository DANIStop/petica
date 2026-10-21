import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_STREAK, recordPlay } from "@/lib/streak";

/** Upisuje završenu dnevnu igru u streak (samo iz Server Actions, service role). */
export async function updateStreak(db: SupabaseClient, userId: string, game: string, date: string) {
  const { data: row } = await db.from("streaks").select("current,best,last_date").eq("user_id", userId).eq("game", game).maybeSingle();
  await db.from("streaks").upsert({ user_id: userId, game, ...recordPlay(row ?? EMPTY_STREAK, date) });
}
