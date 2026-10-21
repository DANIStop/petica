/** Hrvatska abeceda (30 slova); lj, nj i dž su jedna pločica. */
export const ALPHABET = [
  "a", "b", "c", "č", "ć", "d", "dž", "đ", "e", "f", "g", "h", "i", "j", "k",
  "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "š", "t", "u", "v", "z", "ž",
] as const;

const TILES = new Set<string>(ALPHABET);
const DIGRAPHS = new Set(["lj", "nj", "dž"]);

/** Rastavlja riječ na pločice; vraća null ako sadrži znak izvan abecede. */
export function tokenize(word: string): string[] | null {
  const w = word.toLowerCase().normalize("NFC");
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const two = w.slice(i, i + 2);
    if (DIGRAPHS.has(two)) {
      out.push(two);
      i++;
    } else if (TILES.has(w[i])) {
      out.push(w[i]);
    } else {
      return null;
    }
  }
  return out;
}
