import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { roundNumber } from "@/lib/date";
import { parseShareParams } from "@/lib/share-link";

type Props = { params: { game: string; date: string } };

function title(p: NonNullable<ReturnType<typeof parseShareParams>>) {
  return `Petica · ${p.game.name} #${roundNumber(p.date)}`;
}

export function generateMetadata({ params }: Props): Metadata {
  const p = parseShareParams(params.game, params.date);
  if (!p) return {};
  const description = `${p.game.tagline}. Svaki dan nova runda — igraj i ti!`;
  return { title: title(p), description, openGraph: { title: title(p), description } };
}

// Share stranica ne zna ničiji rezultat pa nema spoilera: samo poziv na igru.
export default function SharePage({ params }: Props) {
  const p = parseShareParams(params.game, params.date);
  if (!p) notFound();
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-3xl font-bold" style={{ color: p.game.accent }}>{p.game.name}</h1>
      <p className="text-muted">{title(p)}</p>
      <p>{p.game.tagline}</p>
      <a href={`/${p.game.slug}`} className="block rounded-xl py-3 font-semibold text-black" style={{ background: p.game.accent }}>
        Igraj danas
      </a>
    </div>
  );
}
