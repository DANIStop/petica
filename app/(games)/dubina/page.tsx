import DubinaGame from "@/components/DubinaGame";
import Paywall from "@/components/Paywall";
import { startDubina } from "./actions";

export const dynamic = "force-dynamic";

export default async function DubinaPage({ searchParams }: { searchParams: { extra?: string; arhiva?: string } }) {
  const res = await startDubina(searchParams.extra === "1", searchParams.arhiva);
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status === "paywall") return <Paywall />;
  if (res.status === "exhausted") return <p>Trenutno nema novih kategorija. Navrati uskoro!</p>;
  if (res.status !== "play" && res.status !== "done") return <p>Današnja kategorija još nije spremna. Navrati kasnije.</p>;
  return <DubinaGame key={res.playId} {...res} />;
}
