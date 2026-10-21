// Generira pitanja za Najbliže i upisuje ih kao 'pending'. Pokretanje: npx tsx scripts/gen-questions.ts [broj]
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { filterNew, normalizeQuestion, toRounds } from "../lib/games/najblize/generator";

const TOTAL = Number(process.argv[2] ?? 200);
const BATCH = 25;
const MODEL = "claude-sonnet-5-5";

const PROMPT = `Generiraj ${BATCH} brojčanih kviz pitanja na hrvatskom za igru "Najbliže".
~80% općeg znanja, ~20% hrvatskog sadržaja. Svaki odgovor mora biti jedan provjerljiv broj, a svako pitanje navodi jedinicu.
Vrati ISKLJUČIVO JSON polje objekata: {"question": string, "unit": string, "answer": number, "source_url": string (stvarni URL izvora), "difficulty": 1-5}.
Ne izmišljaj podatke: ako nisi siguran u broj ili izvor, preskoči pitanje.`;

async function main() {
  const claude = new Anthropic();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: rows } = await db.from("content").select("payload").eq("game", "najblize");
  const existing = new Set<string>(
    (rows ?? []).flatMap((r) => (r.payload.questions as { question: string }[]).map((q) => normalizeQuestion(q.question))),
  );

  const collected = [];
  while (collected.length < TOTAL) {
    const msg = await claude.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: PROMPT }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    let batch: unknown[] = [];
    try { batch = JSON.parse(json); } catch { console.warn("Neispravan JSON, ponavljam"); continue; }
    const fresh = filterNew(batch, existing);
    fresh.forEach((q) => existing.add(normalizeQuestion(q.question)));
    collected.push(...fresh);
    console.log(`Prikupljeno ${collected.length}/${TOTAL}`);
  }

  for (const r of toRounds(collected)) {
    const { data, error } = await db
      .from("content")
      .insert({ game: "najblize", payload: r.payload, source_url: r.source_url, difficulty: r.difficulty, status: "pending" })
      .select("id").single();
    if (error) throw error;
    await db.from("content_answers").insert({ content_id: data.id, answer: r.answer });
  }
  console.log("Gotovo — runde čekaju odobrenje u /admin.");
}

main();
