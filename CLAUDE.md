# Petica. — dnevne igre na hrvatskom

Web platforma (PWA) s 5 dnevnih igara. Sučelje i sav tekst na hrvatskom, pitanja iz općeg znanja (~80%) uz nešto lokalnog sadržaja (~20%).

## Poslovni model
- **Besplatno:** svaki korisnik dnevno igra **svaku od 5 igara po jednom** (dnevna runda, ista za sve).
- **Premium (2,99 €/mj ili 19,99 €/god):** neograničene dodatne runde, arhiva prošlih dana, statistika, bez reklama.
- Dnevni reset: ponoć po `Europe/Zagreb`.

## Stack
- Next.js 14 (App Router, TypeScript, Server Actions), Tailwind
- Supabase (Postgres, Auth s anonymous sign-in, RLS)
- Stripe (Checkout subscriptions, Customer Portal, webhook)
- Vercel (hosting + Cron)
- PWA (manifest + service worker), bez App Storea

## Igre
| Slug | Ime | Mehanika | Izvor sadržaja |
|---|---|---|---|
| `rijecko` | Riječko | 5×5 waffle mreža, 21 slovo, 6 hrvatskih riječi od 5 slova, 15 zamjena | Generator iz rječnika (beskonačno) |
| `najblize` | Najbliže | 5 brojčanih pitanja, bodovi po postotnoj pogrešci | Baza pitanja |
| `dubina` | Dubina | Kategorija, upisuješ odgovor, rjeđi odgovor = više bodova | Baza kategorija + frekvencije odgovora |
| `kad-i-gdje` | Kad i gdje | Fotka → pin na karti + godina | Baza fotografija (Commons/Europeana, licenca obavezna) |
| `bocanje` | Boćanje | Power meter + vjetar, 9 bacanja | Generator staza (seed = datum) |

**MVP = shell + admin + Riječko + Najbliže.** Ostale igre u kasnijim fazama.

### Riječko pravila
- Hrvatska abeceda (30 slova). `lj`, `nj`, `dž` su **jedna pločica**.
- Boje: zelena = točno mjesto, žuta = slovo pripada riječi u tom redu/stupcu, siva = ne pripada.
- Rješenje se **nikad ne šalje klijentu**. Svaka zamjena ide na server koji vraća nove boje.
- Generator (`scripts/gen-rijecko.ts`) offline složi mreže iz pročišćene liste riječi (`data/words-hr-5.txt`) i garantira rješivost u ≤10 zamjena.

### Najbliže pravila
- 5 pitanja po rundi, svako ima jedinicu (m, godina, milijuna ljudi…).
- Bodovi: `max(0, 100 - postotna_pogreška)`, ukupno 0–500.
- Točan odgovor i izvor prikazuju se tek nakon predaje.

## Model podataka
```sql
profiles(id uuid pk → auth.users, display_name, premium_until timestamptz, stripe_customer_id, created_at)

content(id uuid pk, game text, payload jsonb, answer jsonb, source_url text,
        status text check in ('pending','approved','rejected'), difficulty int, created_at)

daily_schedule(date date, game text, content_id uuid → content, primary key(date, game))

plays(id uuid pk, user_id uuid, game text, date date, content_id uuid,
      kind text check in ('daily','extra'), state jsonb, score int, finished_at timestamptz)
  -- unique(user_id, game, date) where kind = 'daily'

user_seen(user_id uuid, content_id uuid, primary key(user_id, content_id))

streaks(user_id uuid, game text, current int, best int, last_date date, primary key(user_id, game))
```
- `answer` je čitljiv **samo** service roleu (zasebna tablica ili view bez kolone za klijenta).
- RLS: korisnik čita i piše samo svoje `plays`, `streaks`, `user_seen`.

## Pravila pristupa
1. Prvi posjet → Supabase anonymous sign-in (bez forme).
2. Nakon prve odigrane igre → nenametljiv prompt „Spremi streak": email magic link, povezuje se na postojeći anon račun.
3. Dnevna runda: ako postoji `plays` (kind=daily) za taj dan i igru → prikaži rezultat i share, ne novu igru.
4. Dodatna runda: samo ako je `premium_until > now()`. Inače paywall ekran.
5. Dodatne runde biraju iz `content` (approved), isključujući `user_seen` i sve sadržaje u budućem `daily_schedule`.
6. **Sve provjere na serveru** (Server Actions). Klijent ne odlučuje o limitu ni o točnosti.

## Share
- Tekst + emoji, bez spoilera, npr. `Petica · Riječko #12 · 4 zamjene ostalo 🟩🟩🟨…`
- Link na `petica.hr/r/[game]/[date]` s OG slikom.

## Admin (`/admin`, samo `role = admin`)
- Lista `pending` sadržaja po igri: odobri / odbij / uredi.
- Kalendar `daily_schedule` za idućih 60 dana, popunjavanje jednim klikom iz odobrenih.
- Bulk import JSON-a.
- Upozorenje kad za neku igru ima < 30 dana zakazanog sadržaja.

## Generiranje sadržaja
- `scripts/gen-questions.ts`: Anthropic API generira serije (npr. 200) pitanja za Najbliže kao JSON `{question, unit, answer, source_url, difficulty}` → upis kao `pending`.
- Svako pitanje mora imati izvor. Ništa ne ide live bez ljudskog odobrenja.
- Deduplikacija po normaliziranom tekstu pitanja.

## Stripe
- Checkout (mjesečno/godišnje) → webhook `checkout.session.completed` i `customer.subscription.updated/deleted` postavlja `premium_until`.
- Customer Portal za otkazivanje.
- Webhook idempotentan (spremi `event.id`).

## UI
- Mobile-first, tamna tema po defaultu, svaka igra ima svoju akcent boju.
- Početna: kartice 5 igara sa statusom (Igraj / Odigrano ✓ / Streak 🔥).
- Copy na hrvatskom, kratko i toplo. Nikakva imena, logotipi ni grafike originalnih igara (Waffle, TimeGuessr, Plain, Krillion, Daily Holes).

## Faze
1. **Shell:** auth (anon + magic link), početna s 5 kartica, `plays` + `streaks`, dnevni reset, PWA.
   *Gotovo kad:* anon korisnik vidi kartice, a streak preživi refresh.
2. **Najbliže:** igra, server provjera, share, admin + generator pitanja.
3. **Riječko:** generator mreža, igra sa server-side zamjenama.
4. **Paywall + Stripe:** limit dnevne runde, dodatne runde za premium, Checkout, webhook, portal.
5. Dubina → Kad i gdje → Boćanje.

## Konvencije
- Server Actions u `app/(games)/[game]/actions.ts`, logika igre u `lib/games/[game]/` (čiste funkcije + testovi).
- Vitest za logiku igara (bodovanje, generator, validacija zamjena).
- Nikad ne commitati ključeve. `.env.example` drži popis varijabli.
