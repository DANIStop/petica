"use client";

import { useState, useTransition } from "react";
import { submitDubina, type Reveal, type StartResult } from "@/app/(games)/dubina/actions";
import { GUESSES_PER_ROUND, MAX_SCORE } from "@/lib/games/dubina/scoring";
import { shareText } from "@/lib/games/dubina/share";
import ExtraRoundLink from "@/components/ExtraRoundLink";

type Props = Extract<StartResult, { status: "play" | "done" }>;

export default function DubinaGame(props: Props) {
  const [reveal, setReveal] = useState<Reveal | null>(props.status === "done" ? props.reveal : null);
  const [values, setValues] = useState<string[]>(Array(GUESSES_PER_ROUND).fill(""));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (values.every((v) => v.trim() === "")) return setError("Upiši barem jedan odgovor.");
    setError("");
    start(async () => {
      const res = await submitDubina(values, props.playId);
      if ("error" in res) setError(res.error);
      else setReveal(res.reveal);
    });
  }

  async function copy() {
    if (!reveal) return;
    const text = shareText(props.date, reveal.results.map((r) => r.points));
    await navigator.clipboard.writeText(`${text}\n${location.origin}/r/dubina/${props.date}`);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-sky-400">Dubina{props.extra && " ⭐"}</h1>
      <div className="rounded-xl bg-card p-4">
        <p className="text-lg font-semibold">{props.category}</p>
        {!reveal && <p className="mt-1 text-sm text-muted">Upiši do {GUESSES_PER_ROUND} različitih odgovora. Što rjeđi odgovor, to više bodova.</p>}
      </div>

      {reveal ? (
        <>
          <ul className="space-y-2">
            {reveal.results.map((r, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-card px-3 py-2">
                <span>{r.guess.trim() || "—"}</span>
                <span className={r.points ? "text-sky-400" : "text-muted"}>
                  {r.points ? `${r.points} bod.` : r.entry >= 0 ? "već upisano" : r.guess.trim() ? "nije na popisu" : ""}
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-card p-4">
            <p className="mb-2 text-sm text-muted">Što su drugi odgovarali:</p>
            <ol className="space-y-1 text-sm">
              {reveal.answers.slice(0, 15).map((a) => (
                <li key={a.text} className="flex justify-between"><span>{a.text}</span><span className="text-muted">{a.percent}%</span></li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl bg-card p-4 text-center">
            <p className="text-3xl font-bold">{reveal.total}/{MAX_SCORE}</p>
            <button onClick={copy} className="mt-3 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-black">
              {copied ? "Kopirano ✓" : "Podijeli"}
            </button>
            <ExtraRoundLink game="dubina" />
            <p className="mt-3 text-sm text-muted">Nova dnevna runda sutra u ponoć.</p>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {values.map((v, i) => (
            <input
              key={i}
              value={v}
              maxLength={40}
              onChange={(e) => setValues(values.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Odgovor ${i + 1}`}
              className="w-full rounded-lg bg-card px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-sky-400"
            />
          ))}
          {error && <p className="text-red-400">{error}</p>}
          <button disabled={pending} className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-black disabled:opacity-50">
            {pending ? "Provjeravam…" : "Predaj"}
          </button>
        </form>
      )}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
