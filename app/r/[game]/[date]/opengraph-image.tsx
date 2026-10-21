import { ImageResponse } from "next/og";
import { roundNumber } from "@/lib/date";
import { parseShareParams } from "@/lib/share-link";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { game: string; date: string } }) {
  const p = parseShareParams(params.game, params.date);
  const accent = p?.game.accent ?? "#22c55e";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: 80, background: "#0f1115", color: "white", borderLeft: `24px solid ${accent}`,
        }}
      >
        <div style={{ fontSize: 56, color: "#8b93a3" }}>Petica.</div>
        <div style={{ fontSize: 140, fontWeight: 700, color: accent }}>{p?.game.name ?? "Petica"}</div>
        <div style={{ fontSize: 56 }}>{p ? `#${roundNumber(p.date)} · ${p.game.tagline}` : "Pet dnevnih igara"}</div>
      </div>
    ),
    size,
  );
}
