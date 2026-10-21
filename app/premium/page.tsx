import { createClient } from "@/lib/supabase/server";
import { isPremium } from "@/lib/premium";
import { openPortal, startCheckout } from "./actions";

export const dynamic = "force-dynamic";

const PERKS = ["Neograničene dodatne runde", "Arhiva prošlih dana", "Statistika", "Bez reklama"];

export default async function PremiumPage({ searchParams }: { searchParams: { uspjeh?: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase.from("profiles").select("premium_until").eq("id", auth.user.id).single()
    : { data: null };
  const premium = isPremium(profile?.premium_until);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Petica Premium</h1>
      {searchParams.uspjeh && !premium && <p className="text-muted">Hvala! Aktivacija traje nekoliko sekundi — osvježi stranicu.</p>}
      <ul className="space-y-1">
        {PERKS.map((p) => <li key={p}>✓ {p}</li>)}
      </ul>
      {premium ? (
        <div className="space-y-3 rounded-xl bg-card p-4">
          <p className="flex gap-4"><a href="/arhiva" className="underline">Arhiva</a><a href="/statistika" className="underline">Statistika</a></p>
          <p>Premium je aktivan do {new Date(profile!.premium_until).toLocaleDateString("hr-HR")}. 🎉</p>
          <form action={openPortal}><button className="rounded-lg bg-white/10 px-4 py-2">Upravljaj pretplatom</button></form>
        </div>
      ) : (
        <form action={startCheckout} className="space-y-3">
          <button name="plan" value="monthly" className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-black">2,99 € / mjesec</button>
          <button name="plan" value="yearly" className="w-full rounded-xl bg-white/10 py-3 font-semibold">19,99 € / godina</button>
        </form>
      )}
      <a href="/" className="block text-center text-muted">← Natrag</a>
    </div>
  );
}
