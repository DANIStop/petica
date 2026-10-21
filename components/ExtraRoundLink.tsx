/** Nakon završene runde: dodatna runda (premium provjerava server; ostali vide paywall). */
export default function ExtraRoundLink({ game }: { game: string }) {
  return (
    <a href={`/${game}?extra=1`} className="mt-3 block rounded-lg bg-white/10 px-4 py-2 text-center font-semibold">
      Još jedna runda ⭐
    </a>
  );
}
