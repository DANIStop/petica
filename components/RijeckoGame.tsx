"use client";

import { useState, useTransition } from "react";
import { swapRijecko, type RijeckoView } from "@/app/(games)/rijecko/actions";
import { MAX_SWAPS, SIZE, isHole } from "@/lib/games/rijecko/puzzle";
import { shareText } from "@/lib/games/rijecko/share";
import GameHeader, { accentVars } from "@/components/GameHeader";
import ExtraRoundLink from "@/components/ExtraRoundLink";

const BG = { green: "bg-emerald-600 text-white", yellow: "bg-amber-400 text-black", gray: "bg-zinc-700 text-white" } as const;

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
    <div className="space-y-4" style={accentVars("rijecko")}>
      <GameHeader slug="rijecko" extra={view.extra} />
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
              className={`aspect-square rounded-xl font-display text-[1.7rem] font-extrabold uppercase shadow-[inset_0_-4px_0_rgba(0,0,0,0.28)] transition active:scale-95 ${BG[view.colors[i] ?? "gray"]} ${
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
        <div className="panel p-4 text-center">
          <p className="text-xl font-bold">{view.solved ? `Riješeno! ${view.swapsLeft} zamjena ostalo 🎉` : "Danas nije prošlo. Sutra nova mreža!"}</p>
          <button onClick={copy} className="mt-3 rounded-lg btn-accent px-4 py-2">
            {copied ? "Kopirano ✓" : "Podijeli"}
          </button>
          <ExtraRoundLink game="rijecko" />
          <p className="mt-3 text-sm text-muted">Nova dnevna runda sutra u ponoć.</p>
        </div>
      )}
    </div>
  );
}
