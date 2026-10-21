"use client";

import { useEffect, useState } from "react";
import { msUntilMidnightZagreb } from "@/lib/date";

const pad = (n: number) => String(n).padStart(2, "0");

/** Odbrojavanje do iduće runde (ponoć po Zagrebu); renderira se tek u pregledniku. */
export default function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilMidnightZagreb());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (ms === null) return <span className="tabular-nums">--:--:--</span>;
  const s = Math.floor(ms / 1000);
  return <span className="tabular-nums">{pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</span>;
}
