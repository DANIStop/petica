"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayZagreb } from "@/lib/date";
import { fillSchedule } from "@/lib/server/schedule";
import { isImportable, parseImport, validateContent, type Existing } from "@/lib/admin/content";
import { normalizeQuestion } from "@/lib/games/najblize/generator";
import { normalizeAnswer } from "@/lib/games/dubina/scoring";

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
export async function fillScheduleAction(game: string) {
  const db = await requireAdmin();
  await fillSchedule(db, game, todayZagreb());
  revalidatePath("/admin");
}

export type ActionResult = { ok: boolean; message: string };

async function existingFor(db: Awaited<ReturnType<typeof requireAdmin>>, game: string): Promise<Existing> {
  const { data } = await db.from("content").select("payload").eq("game", game);
  const payloads = (data ?? []).map((r) => r.payload as Record<string, unknown>);
  return {
    questions: new Set(payloads.flatMap((p) => ((p.questions as { question: string }[]) ?? []).map((q) => normalizeQuestion(q.question)))),
    categories: new Set(payloads.filter((p) => typeof p.category === "string").map((p) => normalizeAnswer(p.category as string))),
    photoSources: new Set(payloads.flatMap((p) => ((p.photos as { source_url: string }[]) ?? []).map((x) => x.source_url))),
  };
}

/** Bulk import: JSON polje po igri → nove 'pending' runde (nikad izravno approved). */
export async function importContent(game: string, text: string): Promise<ActionResult> {
  const db = await requireAdmin();
  if (!isImportable(game)) return { ok: false, message: "Uvoz nije podržan za ovu igru." };
  let input: unknown;
  try { input = JSON.parse(text); } catch { return { ok: false, message: "Neispravan JSON." }; }

  const { rounds, errors } = parseImport(game, input, await existingFor(db, game));
  for (const r of rounds) {
    const { data, error } = await db
      .from("content")
      .insert({ game, payload: r.payload, source_url: r.source_url, difficulty: r.difficulty, status: "pending" })
      .select("id").single();
    if (error) return { ok: false, message: `Greška baze: ${error.message}` };
    await db.from("content_answers").insert({ content_id: data.id, answer: r.answer });
  }
  revalidatePath("/admin");
  return { ok: rounds.length > 0, message: [`Uvezeno rundi: ${rounds.length}.`, ...errors].join(" ") };
}

/** Ručno uređivanje pending/rejected sadržaja kao JSON {payload, answer}. */
export async function updateContent(id: string, text: string): Promise<ActionResult> {
  const db = await requireAdmin();
  let input: { payload?: unknown; answer?: unknown };
  try { input = JSON.parse(text); } catch { return { ok: false, message: "Neispravan JSON." }; }

  const { data: row } = await db.from("content").select("game,status").eq("id", id).single();
  if (!row) return { ok: false, message: "Sadržaj ne postoji." };
  if (row.status === "approved") return { ok: false, message: "Odobreni sadržaj se ne uređuje (može biti već zakazan)." };
  const problem = validateContent(row.game, input.payload, input.answer);
  if (problem) return { ok: false, message: problem };

  await db.from("content").update({ payload: input.payload }).eq("id", id);
  await db.from("content_answers").update({ answer: input.answer }).eq("content_id", id);
  revalidatePath("/admin");
  return { ok: true, message: "Spremljeno." };
}
