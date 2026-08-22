# 06 — Getting it live, and getting paid

## The deploy path (do this in Phase 0, not at the end)

1. **Repo**: GitHub, private at first, `main` protected, PR-based, CI required to merge.
2. **Web**: Vercel connected to the repo. Every PR gets a preview URL — this is how you show
   her a feature before it's real.
3. **Database**: Neon (branching databases per preview deploy is worth it) or Supabase (if you
   also want its auth and storage). Either is free to start.
4. **Worker**: Fly.io, one small machine, deployed from `apps/worker/Dockerfile`. Vercel added
   Dockerfile deploys in July 2026, but with serverless duration and memory caps, no persistent
   storage and no long-running processes — multi-year transit scans belong on Fly.
5. **Domain**: buy it early. `jade.app` / `usejade.com` / `jadeastro.com` — check availability
   and, before you commit, run a US trademark search on "Jade" in software/astrology classes.
   "Jade" is a common word; you can likely use it, but check now rather than after you have
   customers and a logo.
6. **Email**: Resend for transactional + digests. Set up SPF/DKIM the week you buy the domain
   so your deliverability is warm by launch.
7. **Secrets**: Vercel/Fly env vars, `.env.example` committed, real `.env` never.

**Environment variables to define in Phase 0** so nothing blocks later:
`DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_/SUPABASE_*`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `EPHE_PATH`, `POSTHOG_KEY`,
`ENCRYPTION_KEY`.

## Deploying to Vercel — the exact settings

Jade ships a `vercel.json`, so the build settings are in the repo rather than
in a dashboard nobody remembers configuring. Leave the Vercel project's Root
Directory at the repository root; the config filters the build to `apps/web`
and points Vercel at `apps/web/.next`.

Environment variables, all three scopes (Production, Preview, Development):

| Variable                        | Value                                                        |
| ------------------------------- | ------------------------------------------------------------ |
| `AUTH_MODE`                     | `supabase` — dev mode throws in production, deliberately     |
| `NEXT_PUBLIC_APP_URL`           | your real origin, e.g. `https://jadeapp.co`                  |
| `DATABASE_URL`                  | the **restricted** role, pooled endpoint (see `db:app-role`) |
| `DIRECT_DATABASE_URL`           | the owner role, direct endpoint — migrations only            |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Settings → API                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API                                    |
| `ENCRYPTION_KEY`                | `openssl rand -base64 32`                                    |

Then in Supabase → Authentication → URL Configuration, which is where magic
links quietly fail if you skip it:

- **Site URL**: your production origin
- **Redirect URLs**: `https://yourdomain/auth/callback`,
  `https://*.vercel.app/auth/callback` for previews, and
  `http://localhost:3100/auth/callback` for local testing

Supabase's built-in email sender is rate-limited to a handful of messages an
hour on the free tier — fine for the first two users, and the point at which
you plug Resend in as custom SMTP under Authentication → Emails.

## The managed-Postgres trap

Neon's `neondb_owner` is a member of `neon_superuser`, which carries the
**BYPASSRLS** attribute. A role with that attribute skips every row-level
security policy unconditionally — so an app connecting as the owner has no
tenant isolation whatsoever, no matter how carefully the policies are written.
Supabase's `postgres` role is the same story. The policies still exist, the
tests still pass locally, and production leaks.

Two things that make this survivable:

- `pnpm db:app-role` provisions a second role that owns nothing and cannot
  bypass anything. The owner keeps running migrations via
  `DIRECT_DATABASE_URL`; the app connects as the restricted role via
  `DATABASE_URL`. Verified end to end: the full browser flow passes under the
  restricted role.
- `pnpm db:doctor` refuses to take configuration's word for it. It provisions
  a row, tries to read it from a different workspace, and fails loudly if it
  can.

Worth knowing precisely: **BYPASSRLS is not inherited through role
membership** — a member of a BYPASSRLS role still has its inserts refused and
its reads filtered (verified on Postgres 16). What matters is whether the
attribute is set directly on the role you connect as, which is exactly what
the doctor checks.

## The one thing to buy before you charge anyone

**Swiss Ephemeris professional licence — CHF 700, one time.** Swiss Ephemeris is dual-licensed:
AGPL or commercial. Because Jade is a hosted service, AGPL's network clause would oblige you to
publish your entire application under AGPL. The professional licence is a one-off CHF 700 with
no royalties, no annual fee, no per-developer or per-product limit, valid 99 years, and it
explicitly permits server-based use accessed by browser. Buy it before the first paid customer.
Until then, develop against `astronomy-engine` (MIT) behind the same provider interface.

Other licensing to keep clean:

- **GeoNames** data: Creative Commons Attribution — put the credit in the footer and in
  `/licenses`. It costs you one line.
- **IANA tzdb**: public domain.
- **VedAstro** (MIT, C#): don't take the code, but its 200+ endpoints and open implementations
  of kūṭas, aṣṭakavarga and daśās make an excellent **second opinion** in your test suite. Run
  its Docker image locally and diff your results against it. Free validation.
- Fonts: Barlow / Barlow Condensed from the v0 build are SIL Open Font License — fine.

## Pricing

| Tier             | Price            | Who                                 | Gate                                                                                                                    |
| ---------------- | ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Free**         | $0               | Curious; your own chart             | 3 people, D1 + D9, today's transits                                                                                     |
| **Seeker**       | $9/mo · $79/yr   | The astrologically fluent           | Unlimited people, all vargas, relationships, daśās, notes                                                               |
| **Practitioner** | $49/mo · $429/yr | Serious students, part-time readers | 100 clients, sessions, reports, alerts, varṣaphala, imports                                                             |
| **Professional** | $99/mo · $890/yr | Working astrologers                 | Unlimited clients, branded reports, client portal, muhūrta engine, prediction ledger, research mode, book-wide sky, API |
| Institute        | from $300/mo     | Schools                             | Seats, teacher review, shared libraries                                                                                 |

Why $99 defends itself: it replaces a $255–700 desktop tool _and_ an AstrologyPro-style
$97/month business layer *and* the hour of manual prep before every reading. Frame it in the
pricing copy as **"one reading a month pays for the year."** At a $150 reading fee it does.

Launch offer: annual founding-member price locked for life for the first 100 professionals.
Cash up front and a cohort of design partners who feel like owners.

## Go-to-market, in order

1. **One astrologer at a time.** Get five working Jyotiṣīs using it free for six months in
   exchange for a weekly call. Build what they ask for. Their testimonials are the launch.
2. **The accuracy page as marketing.** Publish the golden test results publicly, versioned, with
   the tolerances and the comparison against JHora / Swiss Ephemeris. No competitor does this.
   It is catnip for the exact audience you want and it doubles as engineering discipline.
3. **Free tools that rank**: a public nakṣatra finder, a Sade Sati calculator, a muhūrta
   checker, a 36-guṇa matcher. Each is a landing page, each is genuinely good, each has "made
   with Jade" on it. This is how AstroSage got 80 million downloads, and none of their free
   tools are pleasant to use.
4. **Write the thing nobody writes**: an honest technical blog on ayanāṁśa differences, sunrise
   conventions, aṣṭakavarga śodhana schools. The Jyotiṣa world has almost no rigorous public
   technical writing. Own that ground and the professionals will find you.
5. **Communities**: r/vedicastrology, ACVA and CVA (the American Vedic astrology bodies), BAVA
   in the UK, astrology conferences. Don't spam — offer free Pro to anyone teaching a course.
6. **Her practice as the flagship.** If she reads for clients, her branded reports going out
   with a discreet "made with Jade" footer is the highest-converting channel you will ever have.

## Legal and ethics (non-optional)

- Terms: guidance and entertainment, not medical/financial/legal advice; no guarantees; the
  no-death/disease/litigation clause stated plainly.
- Privacy: birth data is special-category-adjacent personal data. Encrypt at rest, export on
  request, hard-delete on request, DPA available, no third-party model calls without explicit
  per-workspace consent, and never any birth data in logs or analytics.
- Age gate 16+.
- Refunds: 30 days, no questions. It costs almost nothing and removes the last objection.
- Accessibility: keyboard navigation and screen-reader labels on the chart components. Charts
  are SVG — add `<title>`/`<desc>` and a table fallback. Very few competitors bother; it also
  makes the print and export paths better.

## The two risks worth naming

- **Scope.** The calculation spec is genuinely a year of work if built exhaustively. The phase
  order exists so that a shippable product exists at week six. Resist implementing Kālachakra
  daśā before anyone is paying.
- **Ambition vs. audience.** The professional Jyotiṣa market is small — thousands, not millions.
  That is fine at $99/month (300 professionals ≈ $350k/yr), but it means the free/Seeker tiers
  and the SEO tools aren't a distraction; they're the funnel that finds those professionals.
