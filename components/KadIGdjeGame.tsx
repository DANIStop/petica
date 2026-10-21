"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { submitKadIGdje, type Reveal, type StartResult } from "@/app/(games)/kad-i-gdje/actions";
import { MAX_SCORE } from "@/lib/games/kad-i-gdje/scoring";
import { shareText } from "@/lib/games/kad-i-gdje/share";
import ExtraRoundLink from "@/components/ExtraRoundLink";

// Leaflet traži `window`, pa se karta učitava samo u pregledniku
const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false, loading: () => <div className="h-64 rounded-xl bg-card" /> });

type Props = Extract<StartResult, { status: "play" | "done" }>;
type Draft = { lat: number; lng: number } | null;

export default function KadIGdjeGame(props: Props) {
  const n = props.photos.length;
  const [reveal, setReveal] = useState<Reveal | null>(props.status === "done" ? props.reveal : null);
  const [step, setStep] = useState(0);
  const [places, setPlaces] = useState<Draft[]>(Array(n).fill(null));
  const [years, setYears] = useState<string[]>(Array(n).fill(""));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const photo = props.photos[step];
  const year = Number(years[step]);
  const stepReady = !!places[step] && Number.isInteger(year) && year >= 1000;

  function next() {
    if (!stepReady) return setError("Označi mjesto na karti i upiši godinu.");
    setError("");
    if (step < n - 1) return setStep(step + 1);
    const guesses = places.map((p, i) => ({ ...p!, year: Number(years[i]) }));
    start(async () => {
      const res = await submitKadIGdje(guesses, props.playId);
      if ("error" in res) setError(res.error);
      else setReveal(res.reveal);
    });
  }

  async function copy() {
    if (!reveal) return;
    const text = shareText(props.date, reveal.items.map((i) => i.result.points));
    await navigator.clipboard.writeText(`${text}\n${location.origin}/r/kad-i-gdje/${props.date}`);
    setCopied(true);
  }

  const credit = (i: number) => (
    <p className="mt-1 text-xs text-muted">Foto: {props.photos[i].author} · {props.photos[i].license}</p>
  );

  if (reveal) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-pink-400">Kad i gdje{props.extra && " ⭐"}</h1>
        {reveal.items.map((it, i) => (
          <div key={i} className="rounded-xl bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.photos[i].url} alt="" className="mb-2 max-h-48 w-full rounded-lg object-cover" />
            <MapPicker value={{ lat: it.guess.lat, lng: it.guess.lng }} answer={it.answer} />
            <p className="mt-2 text-sm">
              {it.result.km} km daleko · godina {it.answer.year} (tvoja {it.guess.year}) ·{" "}
              <b className="text-pink-400">{it.result.points} bod.</b>
            </p>
            {credit(i)}
            <a href={it.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted underline">Wikimedia Commons</a>
          </div>
        ))}
        <div className="rounded-xl bg-card p-4 text-center">
          <p className="text-3xl font-bold">{reveal.total}/{MAX_SCORE}</p>
          <button onClick={copy} className="mt-3 rounded-lg bg-pink-500 px-4 py-2 font-semibold text-black">{copied ? "Kopirano ✓" : "Podijeli"}</button>
          <ExtraRoundLink game="kad-i-gdje" />
          <p className="mt-3 text-sm text-muted">Nova dnevna runda sutra u ponoć.</p>
        </div>
        <a href="/" className="block text-center text-muted">← Natrag</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-pink-400">Kad i gdje{props.extra && " ⭐"}</h1>
      <p className="text-muted">Fotografija {step + 1}/{n}</p>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="Pogodi gdje i kada je snimljena" className="max-h-72 w-full rounded-xl object-cover" />
        {credit(step)}
      </div>
      <MapPicker key={step} value={places[step]} onPick={(p) => setPlaces(places.map((x, i) => (i === step ? p : x)))} />
      <input
        inputMode="numeric" value={years[step]} placeholder="Godina, npr. 1965"
        onChange={(e) => setYears(years.map((y, i) => (i === step ? e.target.value.replace(/\D/g, "").slice(0, 4) : y)))}
        className="w-full rounded-lg bg-card px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-pink-400"
      />
      {error && <p className="text-red-400">{error}</p>}
      <button onClick={next} disabled={pending} className="w-full rounded-xl bg-pink-500 py-3 font-semibold text-black disabled:opacity-50">
        {pending ? "Provjeravam…" : step < n - 1 ? "Dalje" : "Predaj"}
      </button>
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
