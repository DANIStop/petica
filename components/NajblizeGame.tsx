"use client";

import { useState, useTransition } from "react";
import { submitNajblize, type Reveal, type StartResult } from "@/app/(games)/najblize/actions";
import { MAX_SCORE } from "@/lib/games/najblize/scoring";
import { shareText } from "@/lib/games/najblize/share";

type Props = Extract<StartResult, { status: "play" | "done" }>;

const fmt = (n: number) => n.toLocaleString("hr-HR");

export default function NajblizeGame(props: Props) {
  const [reveal, setReveal] = useState<Reveal | null>(props.status === "done" ? props.reveal : null);
  const [values, setValues] = useState<string[]>(props.questions.map(() => ""));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const guesses = values.map((v) => Number(v.replace(",", ".")));
    if (values.some((v) => v.trim() === "") || guesses.some((g) => !Number.isFinite(g))) {
      setError("Unesi broj za svako pitanje.");
      return;
    }
    setError("");
    start(async () => {
      const res = await submitNajblize(guesses);
      if ("error" in res) setError(res.error);
      else setReveal(res.reveal);
    });
  }

  async function copy() {
    if (!reveal) return;
    await navigator.clipboard.writeText(shareText(props.date, reveal.scores));
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-amber-400">Najbliže</h1>
      <form onSubmit={submit} className="space-y-4">
        {props.questions.map((q, i) => (
          <div key={i} className="rounded-xl bg-card p-4">
            <p className="mb-2">{q.question}</p>
            {reveal ? (
              <p className="text-sm">
                Tvoj odgovor: <b>{fmt(reveal.guesses[i])}</b> {q.unit} · točno: <b>{fmt(reveal.answers[i].value)}</b> ·{" "}
                <span className="text-amber-400">{reveal.scores[i]} bod.</span>{" "}
                <a href={reveal.answers[i].source_url} target="_blank" rel="noreferrer" className="text-muted underline">
                  izvor
                </a>
              </p>
            ) : (
              <label className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={values[i]}
                  onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
                  className="w-full rounded-lg bg-bg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-amber-400"
                />
                <span className="text-muted">{q.unit}</span>
              </label>
            )}
          </div>
        ))}
        {!reveal && (
          <>
            {error && <p className="text-red-400">{error}</p>}
            <button disabled={pending} className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-black disabled:opacity-50">
              {pending ? "Provjeravam…" : "Predaj"}
            </button>
          </>
        )}
      </form>
      {reveal && (
        <div className="rounded-xl bg-card p-4 text-center">
          <p className="text-3xl font-bold">{reveal.total}/{MAX_SCORE}</p>
          <button onClick={copy} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black">
            {copied ? "Kopirano ✓" : "Podijeli"}
          </button>
          <p className="mt-3 text-sm text-muted">Nova runda sutra u ponoć.</p>
        </div>
      )}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
