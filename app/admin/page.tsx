import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAMES } from "@/lib/games/registry";
import { addDays, todayZagreb } from "@/lib/date";
import { EditForm, ImportForm } from "@/components/AdminForms";
import { isImportable } from "@/lib/admin/content";
import { fillScheduleAction, setStatus } from "./actions";

export const dynamic = "force-dynamic";
const MIN_DAYS = 30;

export default async function Admin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "admin") notFound();

  const db = createAdminClient();
  const today = todayZagreb();
  // Boćanje nema ručno odobravan sadržaj (staza se generira iz datuma)
  const games = GAMES.filter((g) => g.available && g.slug !== "bocanje");

  const sections = await Promise.all(
    games.map(async (g) => {
      const [{ data: pending }, { data: sched }] = await Promise.all([
        db.from("content").select("id,payload,content_answers(answer)").eq("game", g.slug).eq("status", "pending").order("created_at").limit(50),
        db.from("daily_schedule").select("date").eq("game", g.slug).gte("date", today).lte("date", addDays(today, 59)),
      ]);
      return { g, pending: pending ?? [], scheduled: sched?.length ?? 0 };
    }),
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      {sections.map(({ g, pending, scheduled }) => (
        <section key={g.slug} className="space-y-3">
          <h2 className="text-xl font-semibold">{g.name}</h2>
          {scheduled < MIN_DAYS && (
            <p className="rounded-lg bg-red-500/20 p-2 text-red-300">⚠ Zakazano samo {scheduled} dana (cilj ≥ {MIN_DAYS}).</p>
          )}
          <p className="text-muted">Zakazano u idućih 60 dana: {scheduled}</p>
          <form action={fillScheduleAction.bind(null, g.slug)}>
            <button className="rounded-lg bg-white/10 px-3 py-2">Popuni kalendar odobrenima</button>
          </form>
          {isImportable(g.slug) && <ImportForm game={g.slug} />}
          <h3 className="font-medium">Na čekanju ({pending.length})</h3>
          {pending.map((c) => (
            <div key={c.id} className="rounded-xl bg-card p-3 text-sm">
              {g.slug === "rijecko" ? (
                <p>{((c.content_answers as unknown as { answer: { words: string[] } } | null)?.answer.words ?? []).join(" · ")}</p>
              ) : g.slug === "kad-i-gdje" ? (
                <div className="grid grid-cols-5 gap-1">
                  {(c.payload.photos as { url: string; license: string }[]).map((p, i) => (
                    <div key={i}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="aspect-square w-full rounded object-cover" />
                      <span className="text-xs text-muted">{p.license}</span>
                    </div>
                  ))}
                </div>
              ) : g.slug === "dubina" ? (
                <div>
                  <p className="font-medium">{c.payload.category as string}</p>
                  <p className="text-muted">
                    {((c.content_answers as unknown as { answer: { entries: { text: string; count: number }[] } } | null)?.answer.entries ?? [])
                      .map((e) => `${e.text} (${e.count})`).join(", ")}
                  </p>
                </div>
              ) : (
                <ol className="list-decimal pl-5">
                  {(c.payload.questions as { question: string; unit: string }[]).map((q, i) => (
                    <li key={i}>{q.question} <span className="text-muted">({q.unit})</span></li>
                  ))}
                </ol>
              )}
              {isImportable(g.slug) && (
                <EditForm id={c.id} initial={JSON.stringify({ payload: c.payload, answer: (c.content_answers as unknown as { answer: unknown } | null)?.answer }, null, 2)} />
              )}
              <div className="mt-2 flex gap-2">
                <form action={setStatus.bind(null, c.id, "approved")}><button className="rounded bg-green-600 px-3 py-1">Odobri</button></form>
                <form action={setStatus.bind(null, c.id, "rejected")}><button className="rounded bg-red-600 px-3 py-1">Odbij</button></form>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
