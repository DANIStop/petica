import NajblizeGame from "@/components/NajblizeGame";
import { startNajblize } from "./actions";

export const dynamic = "force-dynamic";

export default async function NajblizePage() {
  const res = await startNajblize();
  if (res.status === "unauthenticated") return <p>Učitavam… osvježi stranicu za koji trenutak.</p>;
  if (res.status === "empty") return <p>Današnja runda još nije spremna. Navrati kasnije.</p>;
  if (res.status !== "play" && res.status !== "done") return null;
  return <NajblizeGame {...res} />;
}
