"use client";

import { useState, useTransition } from "react";
import { importContent, updateContent, type ActionResult } from "@/app/admin/actions";

function useAction() {
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return { msg, pending, run: (fn: () => Promise<ActionResult>) => start(async () => setMsg(await fn())) };
}

const HINTS: Record<string, string> = {
  najblize: '[{"question":"…","unit":"m","answer":324,"source_url":"https://…","difficulty":2}, …] (5 pitanja = 1 runda)',
  dubina: '[{"category":"Hrvatski otok","entries":[{"text":"Krk","aliases":[],"count":100}, …]}] (≥10 odgovora)',
  "kad-i-gdje": '[{"url":"https://…jpg","author":"…","license":"CC BY 4.0","license_url":"…","source_url":"https://commons…","lat":45.8,"lng":16,"year":1955}, …] (5 = 1 runda)',
};

export function ImportForm({ game }: { game: string }) {
  const [text, setText] = useState("");
  const { msg, pending, run } = useAction();
  return (
    <details className="rounded-xl bg-card p-3 text-sm">
      <summary className="cursor-pointer font-medium">Bulk import JSON</summary>
      <p className="my-2 break-words text-xs text-muted">{HINTS[game]}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full rounded bg-bg p-2 font-mono text-xs" />
      <button disabled={pending || !text.trim()} onClick={() => run(() => importContent(game, text))} className="mt-2 rounded bg-white/10 px-3 py-1 disabled:opacity-50">
        {pending ? "Uvozim…" : "Uvezi kao pending"}
      </button>
      {msg && <p className={`mt-2 ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.message}</p>}
    </details>
  );
}

export function EditForm({ id, initial }: { id: string; initial: string }) {
  const [text, setText] = useState(initial);
  const { msg, pending, run } = useAction();
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-muted">Uredi</summary>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="mt-2 w-full rounded bg-bg p-2 font-mono text-xs" />
      <button disabled={pending} onClick={() => run(() => updateContent(id, text))} className="mt-1 rounded bg-white/10 px-3 py-1 disabled:opacity-50">Spremi</button>
      {msg && <p className={`mt-1 ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.message}</p>}
    </details>
  );
}
