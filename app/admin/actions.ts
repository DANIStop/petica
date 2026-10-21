"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, todayZagreb } from "@/lib/date";

const SCHEDULE_DAYS = 60;

async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nema prijave");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "admin") throw new Error("Samo za admine");
  return createAdminClient();
}

export async function setStatus(id: string, status: "approved" | "rejected") {
  const db = await requireAdmin();
  await db.from("content").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

/** Popunjava prazne dane u idućih 60 odobrenim sadržajem koji još nije zakazan. */
export async function fillSchedule(game: string) {
  const db = await requireAdmin();
  const today = todayZagreb();
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
  revalidatePath("/admin");
}
