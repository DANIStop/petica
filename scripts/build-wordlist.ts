// Gradi data/words-hr-5.txt iz LibreOffice hunspell rječnika (hr_HR, GPL/LGPL/MPL).
// Pokretanje: npx tsx scripts/build-wordlist.ts <hr_HR.dic> <hr_HR.aff> [--inflect]
// Zadano su samo osnovni oblici; --inflect dodaje i oblike izvedene iz afiksa.
import { readFileSync, writeFileSync } from "fs";
import { tokenize } from "../lib/games/rijecko/tiles";

type Rule = { strip: string; add: string; cond: RegExp };

const INFLECT = process.argv.includes("--inflect");
const [dicPath, affPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!dicPath || !affPath) throw new Error("Upotreba: build-wordlist.ts <dic> <aff>");

const aff = readFileSync(affPath, "utf8").split("\n");
const af: string[][] = [[]]; // AF indeksi kreću od 1
const suffixes = new Map<string, Rule[]>();

for (const line of aff) {
  const p = line.trim().split(/\s+/);
  if (p[0] === "AF" && p.length >= 2 && /^[A-Za-z0-9]+$/.test(p[1]) && p[1].length % 2 === 0) {
    af.push(p[1].match(/../g) ?? []);
  } else if (p[0] === "SFX" && p.length >= 5) {
    const [, flag, strip, rawAdd, cond] = p;
    const add = rawAdd.split("/")[0];
    const rule: Rule = {
      strip: strip === "0" ? "" : strip,
      add: add === "0" ? "" : add,
      cond: new RegExp(`${cond === "." ? "" : cond}$`),
    };
    (suffixes.get(flag) ?? suffixes.set(flag, []).get(flag)!).push(rule);
  }
}

const words = new Set<string>();
const add = (w: string) => {
  const t = tokenize(w);
  if (t && t.length === 5) words.add(w);
};

for (const line of readFileSync(dicPath, "utf8").split("\n").slice(1)) {
  const [stem, flagRef] = line.trim().split("/");
  // velika slova = vlastita imena i kratice; preskačemo
  if (!stem || stem !== stem.toLowerCase() || /[-.' 0-9]/.test(stem)) continue;
  add(stem);
  if (!INFLECT) continue; // izvedeni oblici daju puno rijetkih/neprirodnih riječi
  const flags = flagRef && /^\d+$/.test(flagRef) ? (af[Number(flagRef)] ?? []) : [];
  for (const f of flags) {
    for (const r of suffixes.get(f) ?? []) {
      if (!r.cond.test(stem) || !stem.endsWith(r.strip)) continue;
      add(stem.slice(0, stem.length - r.strip.length) + r.add);
    }
  }
}

const sorted = [...words].sort((a, b) => a.localeCompare(b, "hr"));
writeFileSync("data/words-hr-5.txt", sorted.join("\n") + "\n");
console.log(`${sorted.length} riječi`);
