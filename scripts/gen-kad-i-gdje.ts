// Uvozi fotografije s Wikimedia Commons-a kao 'pending' runde od 5.
// Pokretanje: npx tsx scripts/gen-kad-i-gdje.ts "Category:Historical images of Zagreb" "Category:..." [--max=100]
// Uzima samo slike s koordinatama, jednom jasnom godinom i licencom CC BY / CC BY-SA / CC0 / javno vlasništvo.
// Autor i licenca spremaju se uz svaku sliku i prikazuju u igri.
import { createClient } from "@supabase/supabase-js";
import { toCandidate, toRounds, type Candidate, type CommonsPage } from "../lib/games/kad-i-gdje/commons";

const args = process.argv.slice(2);
const MAX = Number(args.find((a) => a.startsWith("--max="))?.slice(6) ?? 100);
const categories = args.filter((a) => !a.startsWith("--"));
if (!categories.length) throw new Error('Navedi barem jednu kategoriju, npr. "Category:Historical images of Zagreb"');

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "petica-content-import/0.1 (https://github.com/danistop/petica)";

async function* pages(category: string): AsyncGenerator<CommonsPage> {
  let cont: Record<string, string> = {};
  do {
    const params = new URLSearchParams({
      action: "query", format: "json", generator: "categorymembers", gcmtitle: category, gcmtype: "file", gcmlimit: "50",
      prop: "imageinfo|coordinates", colimit: "max", iiprop: "url|extmetadata", iiurlwidth: "1000",
      iiextmetadatafilter: "DateTimeOriginal|LicenseShortName|LicenseUrl|Artist", ...cont,
    });
    const res = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Commons ${res.status}`);
    const json = await res.json();
    yield* Object.values<CommonsPage>(json.query?.pages ?? {});
    cont = json.continue ?? {};
  } while (Object.keys(cont).length);
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows } = await db.from("content").select("payload").eq("game", "kad-i-gdje");
  const seen = new Set<string>((rows ?? []).flatMap((r) => (r.payload.photos as { source_url: string }[]).map((p) => p.source_url)));

  const found: Candidate[] = [];
  for (const category of categories) {
    for await (const page of pages(category)) {
      const c = toCandidate(page);
      if (c && !seen.has(c.photo.source_url)) {
        seen.add(c.photo.source_url);
        found.push(c);
      }
      if (found.length >= MAX) break;
    }
  }
  found.sort(() => Math.random() - 0.5);

  for (const r of toRounds(found)) {
    const { data, error } = await db
      .from("content")
      .insert({ game: "kad-i-gdje", payload: r.payload, source_url: r.source_url, status: "pending", difficulty: 3 })
      .select("id").single();
    if (error) throw error;
    await db.from("content_answers").insert({ content_id: data.id, answer: r.answer });
  }
  console.log(`Pronađeno ${found.length} slika → ${Math.floor(found.length / 5)} rundi čeka odobrenje u /admin.`);
}

main();
