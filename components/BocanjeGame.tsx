"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { beginThrow, throwBall, type BocanjeView } from "@/app/(games)/bocanje/actions";
import { MAX_RANGE, MAX_SCORE, THROWS, meterPower, type ThrowResult } from "@/lib/games/bocanje/physics";
import { shareText } from "@/lib/games/bocanje/share";
import ExtraRoundLink from "@/components/ExtraRoundLink";

type Phase = "ready" | "running" | "landed";

export default function BocanjeGame({ initial }: { initial: BocanjeView }) {
  const [view, setView] = useState(initial);
  const [phase, setPhase] = useState<Phase>("ready");
  const [power, setPower] = useState(0);
  const [last, setLast] = useState<ThrowResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  const raf = useRef(0);

  // nakon bacanja server već broji i to bacanje, pa dok se prikazuje doskok ostajemo na njemu
  const idx = Math.min(view.results.length - (phase === "landed" ? 1 : 0), THROWS - 1);
  const current = view.track[idx];
  const shown = phase === "landed" ? last : null;

  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      setPower(meterPower(performance.now() - startedAt.current));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  function begin() {
    setError("");
    start(async () => {
      const res = await beginThrow(view.playId);
      if ("error" in res) return setError(res.error);
      startedAt.current = performance.now(); // mjerač kreće tek kad server potvrdi početak
      setPhase("running");
    });
  }

  function release() {
    const elapsed = performance.now() - startedAt.current;
    cancelAnimationFrame(raf.current);
    start(async () => {
      const res = await throwBall(elapsed, view.playId);
      if ("error" in res) {
        setError(res.error);
        return setPhase("ready");
      }
      setView(res.view);
      setLast(res.result);
      setPhase("landed");
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(`${shareText(view.date, view.results.map((r) => r.points))}\n${location.origin}/r/bocanje/${view.date}`);
    setCopied(true);
  }

  const pct = (m: number) => `${Math.min(100, (m / MAX_RANGE) * 100)}%`;
  const done = view.finished && phase !== "landed";
  const throwNo = idx + 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-violet-400">Boćanje{view.extra && " ⭐"}</h1>

      {done ? (
        <div className="rounded-xl bg-card p-4 text-center">
          <p className="text-3xl font-bold">{view.total}/{MAX_SCORE}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {view.results.map((r, i) => (
              <li key={i} className="flex justify-between"><span>Bacanje {i + 1}</span><span>{r.points} bod. · {r.error} m</span></li>
            ))}
          </ul>
          <button onClick={copy} className="mt-3 rounded-lg bg-violet-500 px-4 py-2 font-semibold text-black">{copied ? "Kopirano ✓" : "Podijeli"}</button>
          <ExtraRoundLink game="bocanje" />
          <p className="mt-3 text-sm text-muted">Nova dnevna runda sutra u ponoć.</p>
        </div>
      ) : (
        <>
          <p className="text-muted">Bacanje {throwNo}/{THROWS} · Ukupno: <b className="text-white">{view.total}</b></p>
          <div className="rounded-xl bg-card p-4">
            <p className="mb-2 text-sm">
              Vjetar: <b>{current.wind > 0 ? `→ ${current.wind} m/s (u leđa, nosi dalje)` : current.wind < 0 ? `← ${-current.wind} m/s (u lice, kraće)` : "bezvjetrije"}</b>
            </p>
            <div className="relative h-10 rounded-lg bg-bg">
              <div className="absolute top-1 h-8 w-1 -translate-x-1/2 rounded bg-amber-400" style={{ left: pct(current.distance) }} title="Balin" />
              {shown && <div className="absolute top-3 h-4 w-4 -translate-x-1/2 rounded-full bg-violet-400" style={{ left: pct(shown.landing) }} />}
            </div>
            <p className="mt-1 text-xs text-muted">Balin je na {current.distance} m (skala 0–{MAX_RANGE} m)</p>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-card" aria-label="Snaga">
            <div className="h-full bg-violet-500" style={{ width: `${(phase === "running" ? power : shown?.power ?? 0) * 100}%` }} />
          </div>
          {shown && (
            <p className="text-center">
              Doletjela na {shown.landing} m · pogreška {shown.error} m · <b className="text-violet-400">{shown.points} bod.</b>
            </p>
          )}
          {error && <p className="text-red-400">{error}</p>}
          {phase === "ready" && (
            <button onClick={begin} disabled={pending} className="w-full rounded-xl bg-violet-500 py-4 text-lg font-semibold text-black disabled:opacity-50">Pokreni mjerač</button>
          )}
          {phase === "running" && (
            <button onClick={release} disabled={pending} className="w-full rounded-xl bg-amber-500 py-4 text-lg font-semibold text-black">Baci!</button>
          )}
          {phase === "landed" && (
            <button onClick={() => { setPhase("ready"); setLast(null); }} className="w-full rounded-xl bg-white/10 py-4 text-lg font-semibold">
              {view.finished ? "Rezultat" : "Sljedeće bacanje"}
            </button>
          )}
        </>
      )}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
