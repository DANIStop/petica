/** Nakon završene runde: dodatna runda (premium provjerava server; ostali vide paywall). */
export default function ExtraRoundLink({ game }: { game: string }) {
  return (
    <a
      href={`/${game}?extra=1`}
      className="mt-3 block rounded-xl border px-4 py-2.5 text-center font-semibold transition hover:bg-white/5"
      style={{ borderColor: "color-mix(in srgb, var(--accent, #fff) 55%, transparent)" }}
    >
      Još jedna runda ⭐
    </a>
  );
}
