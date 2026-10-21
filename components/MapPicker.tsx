"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

type Place = { lat: number; lng: number };

/** Karta (OpenStreetMap) na kojoj se klikom bira mjesto. Kad se zada `answer`, prikazuje točno mjesto i liniju. */
export default function MapPicker({ value, onPick, answer }: { value: Place | null; onPick?: (p: Place) => void; answer?: Place }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { center: [46, 16], zoom: 4, worldCopyJump: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.on("click", (e) => pick.current?.({ lat: e.latlng.lat, lng: ((e.latlng.lng + 540) % 360) - 180 }));
      map.current = m;
      if (value) marker.current = L.circleMarker([value.lat, value.lng], { radius: 9, color: "#fff", fillColor: "#f59e0b", fillOpacity: 1 }).addTo(m);
      if (answer && value) {
        L.circleMarker([answer.lat, answer.lng], { radius: 9, color: "#fff", fillColor: "#22c55e", fillOpacity: 1 }).addTo(m);
        L.polyline([[value.lat, value.lng], [answer.lat, answer.lng]], { color: "#fff", dashArray: "6" }).addTo(m);
        m.fitBounds([[value.lat, value.lng], [answer.lat, answer.lng]], { padding: [30, 30], maxZoom: 8 });
      }
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    import("leaflet").then((L) => {
      if (!map.current || answer) return;
      marker.current?.remove();
      marker.current = value
        ? L.circleMarker([value.lat, value.lng], { radius: 9, color: "#fff", fillColor: "#f59e0b", fillOpacity: 1 }).addTo(map.current)
        : null;
    });
  }, [value, answer]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-xl" />;
}
