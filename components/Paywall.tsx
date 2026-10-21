export default function Paywall() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">Dodatne runde su Premium ⭐</h1>
      <p className="text-muted">Svaki dan imaš jednu besplatnu rundu svake igre. Premium otključava neograničene dodatne runde.</p>
      <a href="/premium" className="block rounded-xl bg-amber-500 py-3 font-semibold text-black">Pogledaj Premium</a>
      <a href="/" className="block text-muted">← Natrag</a>
    </div>
  );
}
