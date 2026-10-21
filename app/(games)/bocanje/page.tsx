import BocanjeGame from "@/components/BocanjeGame";
import Paywall from "@/components/Paywall";
import { startBocanje } from "./actions";

export const dynamic = "force-dynamic";

export default async function BocanjePage({ searchParams }: { searchParams: { extra?: string } }) {
  const res = await startBocanje(searchParams.extra === "1");
  if (res.status === "paywall") return <Paywall />;
  if (res.status !== "ok") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  return <BocanjeGame key={res.view.playId} initial={res.view} />;
}
