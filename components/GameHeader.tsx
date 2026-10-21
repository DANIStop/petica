import { GAMES, type GameSlug } from "@/lib/games/registry";
import GameGlyph from "@/components/GameGlyph";

/** CSS varijabla akcenta igre; postavlja se na korijenski element ekrana igre. */
export const accentVars = (slug: GameSlug) => ({ ["--accent" as string]: GAMES.find((g) => g.slug === slug)!.accent });

export default function GameHeader({ slug, extra }: { slug: GameSlug; extra?: boolean }) {
  const i = GAMES.findIndex((g) => g.slug === slug);
  const g = GAMES[i];
  return (
    <header className="rise pb-1">
      <a href="/" className="kicker hover:text-ink">← Petica.</a>
      <div className="mt-4 flex items-center gap-3.5">
        <span className="glyph"><GameGlyph slug={slug} /></span>
        <div>
          <p className="kicker" style={{ color: g.accent }}>
            Igra {String(i + 1).padStart(2, "0")}{extra && " · ⭐ dodatna runda"}
          </p>
          <h1 className="text-[2.35rem] font-extrabold leading-none" style={{ fontVariationSettings: '"opsz" 96' }}>{g.name}</h1>
        </div>
      </div>
      <hr className="rule mt-5" />
    </header>
  );
}
