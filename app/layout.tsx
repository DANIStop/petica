import type { Metadata, Viewport } from "next";
import AnonSignIn from "@/components/AnonSignIn";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Petica.",
  description: "Pet dnevnih igara na hrvatskom.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0f1115" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>
        <AnonSignIn />
        <RegisterSW />
        <main className="mx-auto max-w-md px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
