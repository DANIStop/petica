import RijeckoGame from "@/components/RijeckoGame";
import { startRijecko } from "./actions";

export const dynamic = "force-dynamic";

export default async function RijeckoPage() {
  const res = await startRijecko();
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status !== "ok") return <p>Današnja mreža još nije spremna. Navrati kasnije.</p>;
  return <RijeckoGame initial={res.view} />;
}
