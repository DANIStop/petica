# Deploy (≈15 min, može s mobitela)

## 1. Supabase (supabase.com → New project)
1. SQL Editor: pokreni redom `supabase/migrations/0001_init.sql`, `0002_stripe_extra.sql`, `0003_tighten_rls.sql`, `0004_archive.sql`.
2. Authentication → Sign In / Providers → uključi **Allow anonymous sign-ins**.
3. Authentication → URL Configuration → Redirect URLs: dodaj `https://<tvoja-domena>/auth/callback`.
4. Project Settings → API: kopiraj Project URL, `anon` i `service_role` ključ.

## 2. Vercel (vercel.com → Add New → Project → uvezi GitHub repo `danistop/petica`, branch `claude/new-session-gvqqnq` ili main nakon merga)
Environment Variables:

| Ključ | Vrijednost |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon ključ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role ključ (samo server!) |
| `NEXT_PUBLIC_SITE_URL` | `https://<tvoja-domena>` |
| `CRON_SECRET` | proizvoljan dugi nasumični niz; Vercel ga šalje cronu u `Authorization` zaglavlju |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | iz Stripe dashboarda (kad uključiš premium) |

`ANTHROPIC_API_KEY` treba samo za lokalno pokretanje skripti za generiranje pitanja.

## 3. Stripe (tek kad želiš naplatu; koristi test mode)
- Dvije cijene: 2,99 €/mj i 19,99 €/god → ID-evi u env varijable.
- Webhooks → endpoint `https://<domena>/api/stripe/webhook`, događaji: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Customer portal: uključi u Stripe postavkama.

## 4. Sadržaj (s računala, treba `.env.local` s Supabase ključevima)
```
npx tsx scripts/gen-rijecko.ts 60
npx tsx scripts/gen-questions.ts 200      # + ANTHROPIC_API_KEY
npx tsx scripts/gen-dubina.ts 30          # + ANTHROPIC_API_KEY
```
Zatim u Supabaseu postavi sebi `profiles.role = 'admin'`, u `/admin` odobri sadržaj i klikni „Popuni kalendar".

## 5. Cron
`vercel.json` svaki dan u 22:05 UTC (nakon ponoći po Zagrebu) zove `/api/cron/schedule`, koji dopunjava kalendar
idućih 60 dana odobrenim sadržajem. Cron radi tek kad je postavljen `CRON_SECRET`. Ručno isto radi gumb u `/admin`.

## 6. Kontrolna lista za prvi test (cijeli tok još nije bio isprobavan uz živu bazu)
1. Otvori početnu → vide se 5 kartica (bez ručne prijave; anonimni korisnik se napravi sam).
2. `/admin` → 404 dok ne postaviš `profiles.role = 'admin'`; potom odobri sadržaj i klikni „Popuni kalendar".
3. Odigraj Najbližu → kartica pokaže „Odigrano ✓" i 🔥 1; osvježi stranicu → streak ostaje.
4. Pokušaj ponovno igrati isti dan → vidiš rezultat, ne novu igru; „Još jedna runda" vodi na paywall.
5. U Supabaseu ručno postavi `profiles.premium_until` na budući datum → dodatna runda, `/arhiva` i `/statistika` rade.
6. Stripe test mode: Checkout s karticom 4242 4242 4242 4242 → webhook postavlja `premium_until`.
7. Provjeri da klijent ne vidi rješenja: u Supabase API-ju s anon ključem `content` i `content_answers` moraju vraćati prazno.

Ako nešto pukne, uz poruku greške pošalji i koji je korak bio.
