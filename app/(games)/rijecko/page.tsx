import Paywall from "@/components/Paywall";
import RijeckoGame from "@/components/RijeckoGame";
import { startRijecko } from "./actions";

export const dynamic = "force-dynamic";

export default async function RijeckoPage({ searchParams }: { searchParams: { extra?: string } }) {
  const res = await startRijecko(searchParams.extra === "1");
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status === "paywall") return <Paywall />;
  if (res.status === "exhausted") return <p>Trenutno nema novih mreža. Navrati uskoro!</p>;
  if (res.status !== "ok") return <p>Današnja mreža još nije spremna. Navrati kasnije.</p>;
  return <RijeckoGame key={res.view.playId} initial={res.view} />;
}
