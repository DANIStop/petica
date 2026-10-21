// Generira kategorije za Dubinu kao 'pending'. Pokretanje: npx tsx scripts/gen-dubina.ts [broj]
// NAPOMENA: učestalosti su procjene modela, ne stvarna anketa — pregled u /admin je obavezan.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { isValidEntries, normalizeAnswer, type DubinaEntry } from "../lib/games/dubina/scoring";

const TOTAL = Number(process.argv[2] ?? 30);
const MODEL = "claude-sonnet-5-5";

const PROMPT = (n: number, avoid: string[]) => `Smisli ${n} kategorija za kviz "Dubina" na hrvatskom (npr. "Hrvatski otok", "Voće koje se jede ljeti", "Jelo s roštilja").
~80% općeg znanja, ~20% hrvatskog. Kategorija mora imati 15–40 valjanih odgovora i jasne granice.
Za svaku daj popis valjanih odgovora s procjenom koliko ih često ljudi navode (cijeli broj count 1–1000; što češće spominjan, to veći broj, a najčešći je ≥10× češći od rijetkih).
Ne ponavljaj ove kategorije: ${avoid.slice(0, 80).join("; ") || "—"}.
Vrati ISKLJUČIVO JSON polje: {"category": string, "entries": [{"text": string, "aliases": string[] (neobavezno), "count": number}]}.`;

async function main() {
  const claude = new Anthropic();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: rows } = await db.from("content").select("payload").eq("game", "dubina");
  const seen = new Set<string>((rows ?? []).map((r) => normalizeAnswer(r.payload.category)));

  let made = 0;
  while (made < TOTAL) {
    const msg = await claude.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: PROMPT(Math.min(5, TOTAL - made), [...seen]) }],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    let batch: { category: string; entries: DubinaEntry[] }[] = [];
    try { batch = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)); } catch { console.warn("Neispravan JSON, ponavljam"); continue; }

    for (const b of batch) {
      const key = normalizeAnswer(b.category ?? "");
      if (!key || seen.has(key) || !isValidEntries(b.entries)) continue;
      seen.add(key);
      const { data, error } = await db
        .from("content")
        .insert({ game: "dubina", payload: { category: b.category }, status: "pending", difficulty: 3 })
        .select("id").single();
      if (error) throw error;
      await db.from("content_answers").insert({ content_id: data.id, answer: { entries: b.entries } });
      made++;
    }
    console.log(`Upisano ${made}/${TOTAL}`);
  }
  console.log("Gotovo — kategorije čekaju odobrenje u /admin.");
}

main();
