import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { GAMES } from "@/lib/games/registry";
import { fillSchedule } from "@/lib/server/schedule";

export const runtime = "nodejs";

// Vercel Cron šalje `Authorization: Bearer $CRON_SECRET`. Svaki dan dopunjava kalendar odobrenim sadržajem.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Zabranjeno", { status: 401 });

  const db = createAdminClient();
  const today = todayZagreb();
  const added: Record<string, number> = {};
  // Boćanje nema sadržaja za zakazivanje (staza se generira iz datuma)
  for (const g of GAMES.filter((g) => g.available && g.slug !== "bocanje")) added[g.slug] = await fillSchedule(db, g.slug, today);
  return Response.json({ today, added });
}
