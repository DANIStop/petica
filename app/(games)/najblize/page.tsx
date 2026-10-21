import NajblizeGame from "@/components/NajblizeGame";
import Paywall from "@/components/Paywall";
import { startNajblize } from "./actions";

export const dynamic = "force-dynamic";

export default async function NajblizePage({ searchParams }: { searchParams: { extra?: string } }) {
  const res = await startNajblize(searchParams.extra === "1");
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status === "paywall") return <Paywall />;
  if (res.status === "exhausted") return <p>Trenutno nema novih rundi. Navrati uskoro!</p>;
  if (res.status !== "play" && res.status !== "done") return <p>Današnja runda još nije spremna. Navrati kasnije.</p>;
  return <NajblizeGame key={res.playId} {...res} />;
}
