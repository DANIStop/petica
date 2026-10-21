export type GameSlug = "rijecko" | "najblize" | "dubina" | "kad-i-gdje" | "bocanje";

export type GameInfo = {
  slug: GameSlug;
  name: string;
  tagline: string;
  accent: string;
  available: boolean;
};

export const GAMES: GameInfo[] = [
  { slug: "rijecko", name: "Riječko", tagline: "Složi šest riječi u mreži", accent: "#22c55e", available: false },
  { slug: "najblize", name: "Najbliže", tagline: "Pogodi broj što bliže", accent: "#f59e0b", available: true },
  { slug: "dubina", name: "Dubina", tagline: "Što rjeđi odgovor, više bodova", accent: "#38bdf8", available: false },
  { slug: "kad-i-gdje", name: "Kad i gdje", tagline: "Pogodi mjesto i godinu", accent: "#f472b6", available: false },
  { slug: "bocanje", name: "Boćanje", tagline: "Baci što bliže balinu", accent: "#a78bfa", available: false },
];
