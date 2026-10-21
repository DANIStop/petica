import KadIGdjeGame from "@/components/KadIGdjeGame";
import Paywall from "@/components/Paywall";
import { startKadIGdje } from "./actions";

export const dynamic = "force-dynamic";

export default async function KadIGdjePage({ searchParams }: { searchParams: { extra?: string; arhiva?: string } }) {
  const res = await startKadIGdje(searchParams.extra === "1", searchParams.arhiva);
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status === "paywall") return <Paywall />;
  if (res.status === "exhausted") return <p>Trenutno nema novih fotografija. Navrati uskoro!</p>;
  if (res.status !== "play" && res.status !== "done") return <p>Današnje fotografije još nisu spremne. Navrati kasnije.</p>;
  return <KadIGdjeGame key={res.playId} {...res} />;
}
