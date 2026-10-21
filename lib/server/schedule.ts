import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/date";

export const SCHEDULE_DAYS = 60;
export const MIN_SCHEDULED_DAYS = 30;

/** Raspoređuje odobreni, još nezakazani sadržaj na prazne dane (idućih 60). Vraća broj upisanih dana. */
export async function fillSchedule(db: SupabaseClient, game: string, today: string): Promise<number> {
  const end = addDays(today, SCHEDULE_DAYS - 1);
  const [{ data: sched }, { data: approved }, { data: used }] = await Promise.all([
    db.from("daily_schedule").select("date").eq("game", game).gte("date", today).lte("date", end),
    db.from("content").select("id").eq("game", game).eq("status", "approved").order("created_at"),
    db.from("daily_schedule").select("content_id").eq("game", game),
  ]);
  const taken = new Set(sched?.map((s) => s.date));
  const usedIds = new Set(used?.map((u) => u.content_id));
  const free = (approved ?? []).filter((c) => !usedIds.has(c.id));

  const rows = [];
  for (let i = 0; i < SCHEDULE_DAYS && free.length; i++) {
    const date = addDays(today, i);
    if (!taken.has(date)) rows.push({ date, game, content_id: free.shift()!.id });
  }
  if (rows.length) await db.from("daily_schedule").insert(rows);
  return rows.length;
}
