import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f1115",
        card: "#181b22",
        muted: "#8b93a3",
      },
    },
  },
  plugins: [],
};
export default config;
