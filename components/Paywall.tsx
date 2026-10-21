export default function Paywall() {
  return (
    <div className="rise space-y-5 pt-6 text-center">
      <p className="kicker">Petica Premium</p>
      <h1 className="text-[2.2rem] font-extrabold leading-[1.05]">Još jedna runda? Može — uz Premium ⭐</h1>
      <p className="text-muted">Svaki dan imaš po jednu besplatnu rundu svake igre. Premium otključava neograničene dodatne runde, arhivu i statistiku.</p>
      <a href="/premium" className="btn-accent block rounded-xl py-3.5" style={{ ["--accent" as string]: "#ffb042" }}>Pogledaj Premium</a>
      <a href="/" className="kicker block hover:text-ink">← Petica.</a>
    </div>
  );
}
