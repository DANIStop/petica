// Generira mreže za Riječko i upisuje ih kao 'pending'. Pokretanje: npx tsx scripts/gen-rijecko.ts [broj]
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildSolution, mulberry32, scramble, solutionWords } from "../lib/games/rijecko/puzzle";

const COUNT = Number(process.argv[2] ?? 60);

async function main() {
  const words = readFileSync("data/words-hr-5.txt", "utf8").split("\n").filter(Boolean);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // dedup po skupu šest riječi u već postojećim mrežama
  const { data: rows } = await db.from("content_answers").select("answer, content!inner(game)").eq("content.game", "rijecko");
  const seen = new Set<string>((rows ?? []).map((r) => (r.answer.words as string[]).slice().sort().join(",")));

  let made = 0;
  while (made < COUNT) {
    const seed = Math.floor(Math.random() * 2 ** 32);
    const solution = buildSolution(words, mulberry32(seed));
    if (!solution) continue;
    const six = solutionWords(solution);
    const key = six.slice().sort().join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const { grid } = scramble(solution, mulberry32(seed ^ 0x9e3779b9));
    const { data, error } = await db
      .from("content")
      .insert({ game: "rijecko", payload: { grid }, status: "pending", difficulty: 3 })
      .select("id").single();
    if (error) throw error;
    // payload je javno čitljiv (RLS za approved), pa rješenje i riječi idu samo u content_answers
    await db.from("content_answers").insert({ content_id: data.id, answer: { solution, words: six } });
    made++;
  }
  console.log(`Upisano ${made} mreža — čekaju odobrenje u /admin.`);
}

main();
