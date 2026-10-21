# Deploy (≈15 min, može s mobitela)

## 1. Supabase (supabase.com → New project)
1. SQL Editor: zalijepi i pokreni `supabase/migrations/0001_init.sql`, zatim `0002_stripe_extra.sql`.
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
