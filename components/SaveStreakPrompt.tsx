"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "petica-save-streak-dismissed";

// Nenametljiv prompt: povezuje e-mail na postojeći anonimni račun pa streak ostaje.
export default function SaveStreakPrompt() {
  const [hidden, setHidden] = useState(true);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setHidden(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.updateUser({ email }, { emailRedirectTo: `${location.origin}/auth/callback` });
    setState(error ? "error" : "sent");
  }

  if (hidden) return null;
  return (
    <div className="mt-6 rounded-xl bg-card p-4 text-sm">
      {state === "sent" ? (
        <p>Poslali smo ti poruku na {email}. Klikni na link i streak je sačuvan 🔥</p>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <p>Spremi streak 🔥 Upiši e-mail i nećeš ga izgubiti ako promijeniš uređaj.</p>
          <div className="flex gap-2">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tvoj@email.hr"
              className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/40"
            />
            <button disabled={state === "sending"} className="rounded-lg bg-white/10 px-3 py-2 font-semibold">Pošalji</button>
          </div>
          {state === "error" && <p className="text-red-400">Nešto nije u redu. Provjeri adresu i pokušaj ponovno.</p>}
          <button type="button" onClick={dismiss} className="text-muted underline">Ne sada</button>
        </form>
      )}
    </div>
  );
}
