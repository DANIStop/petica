"use client";

import { useState, useTransition } from "react";
import { swapRijecko, type RijeckoView } from "@/app/(games)/rijecko/actions";
import { MAX_SWAPS, SIZE, isHole } from "@/lib/games/rijecko/puzzle";
import { shareText } from "@/lib/games/rijecko/share";
import ExtraRoundLink from "@/components/ExtraRoundLink";

const BG = { green: "bg-green-600", yellow: "bg-yellow-500 text-black", gray: "bg-zinc-600" } as const;

export default function RijeckoGame({ initial }: { initial: RijeckoView }) {
  const [view, setView] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function tap(i: number) {
    if (view.finished || pending || view.colors[i] === "green") return;
    if (selected === null) return setSelected(i);
    if (selected === i) return setSelected(null);
    const a = selected;
    setSelected(null);
    setError("");
    start(async () => {
      const res = await swapRijecko(a, i, view.playId);
      if ("error" in res) setError(res.error);
      else setView(res.view);
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(`${shareText(view.date, view.solved, view.swapsLeft, view.colors)}\n${location.origin}/r/rijecko/${view.date}`);
    setCopied(true);
  }

  const grid = view.finished && view.solution ? view.solution : view.grid;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-green-400">Riječko{view.extra && " ⭐"}</h1>
      <p className="text-muted">
        Zamjene: <b className="text-white">{view.swapsLeft}</b>/{MAX_SWAPS}
      </p>
      <div className="grid grid-cols-5 gap-1.5" role="grid">
        {Array.from({ length: SIZE * SIZE }, (_, i) =>
          isHole(i) ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={view.finished || view.colors[i] === "green"}
              className={`aspect-square rounded-lg text-2xl font-bold uppercase ${BG[view.colors[i] ?? "gray"]} ${
                selected === i ? "ring-4 ring-white" : ""
              } ${pending ? "opacity-70" : ""}`}
            >
              {grid[i]}
            </button>
          ),
        )}
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {view.finished && (
        <div className="rounded-xl bg-card p-4 text-center">
          <p className="text-xl font-bold">{view.solved ? `Riješeno! ${view.swapsLeft} zamjena ostalo 🎉` : "Danas nije prošlo. Sutra nova mreža!"}</p>
          <button onClick={copy} className="mt-3 rounded-lg bg-green-600 px-4 py-2 font-semibold">
            {copied ? "Kopirano ✓" : "Podijeli"}
          </button>
          <ExtraRoundLink game="rijecko" />
          <p className="mt-3 text-sm text-muted">Nova dnevna runda sutra u ponoć.</p>
        </div>
      )}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
