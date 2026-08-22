# 01 — Architecture

## Guiding constraint

One person (plus Claude Code) has to be able to build, run and pay for this. So: one
language, one deploy target, boring managed infrastructure, and a calculation core so pure it
can run anywhere — browser, server, worker, or a future mobile app.

## Stack

| Layer         | Choice                                                                                                         | Why                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language      | **TypeScript**, strict, everywhere                                                                             | One language across core, API, web, jobs.                                                                                                               |
| Monorepo      | **pnpm workspaces + Turborepo**                                                                                | Cheap, standard, fast CI.                                                                                                                               |
| Web app       | **Next.js (App Router) + React**                                                                               | Server components for heavy chart pages, one codebase for marketing site + app.                                                                         |
| Styling       | **Tailwind + CSS variables**                                                                                   | Keep the v0 design tokens (`--color-accent`, blueprint corners) — that look is already good and it's Jade's identity.                                   |
| Charts/wheels | **Hand-written React SVG components**                                                                          | Same component renders to screen, to PDF, and to a share image. No chart library can draw a rāśi chakra properly anyway.                                |
| Database      | **Postgres** (Neon or Supabase)                                                                                | Relational data, JSONB for computed chart blobs, cheap at the start.                                                                                    |
| ORM           | **Drizzle**                                                                                                    | Typed SQL without magic; migrations in the repo.                                                                                                        |
| Auth          | **Supabase Auth** or **Clerk**                                                                                 | Don't build auth. Email + Google + Apple.                                                                                                               |
| Payments      | **Stripe** (Billing; Connect later)                                                                            | Subscriptions, tax handling via Stripe Tax.                                                                                                             |
| Jobs/queue    | **pg-boss** on the same Postgres (upgrade to Inngest if it hurts)                                              | Transit scans, alert evaluation, report rendering.                                                                                                      |
| Cache         | Postgres table first, **Redis (Upstash)** when hot                                                             | Chart results are pure functions of their inputs — cache aggressively.                                                                                  |
| PDF           | **Playwright/Chromium** rendering the same React components                                                    | One rendering path, print-perfect output.                                                                                                               |
| Hosting       | **Vercel** for the Next.js app; **Fly.io** (or a Vercel Dockerfile service) for the ephemeris/worker container | Vercel added Dockerfile deploys in July 2026 but with serverless duration/memory caps and no long-running processes — long transit scans belong on Fly. |
| Observability | Sentry + Vercel Analytics + a `/status` accuracy page                                                          | Cheap, enough.                                                                                                                                          |

## Monorepo layout

```
jade/
├── apps/
│   ├── web/                 # Next.js — marketing site + the app
│   └── worker/              # Dockerized Node service: scans, alerts, PDF rendering
├── packages/
│   ├── astro/               # THE CORE. Pure calculation library. No I/O.
│   │   ├── src/
│   │   │   ├── ephemeris/   # provider interface + native + wasm implementations
│   │   │   ├── sidereal/    # ayanamsa, coordinate conversion
│   │   │   ├── points/      # planets, nodes, upagrahas, special lagnas
│   │   │   ├── houses/      # whole sign, bhava madhya, Sripati, Placidus…
│   │   │   ├── vargas/      # D1…D60 divisional charts
│   │   │   ├── strength/    # dignities, avasthas, shadbala, ashtakavarga
│   │   │   ├── yogas/       # yoga detection engine + rule data
│   │   │   ├── dashas/      # vimshottari, ashtottari, yogini, chara…
│   │   │   ├── panchang/    # tithi, nakshatra, yoga, karana, muhurta windows
│   │   │   ├── transits/    # gochara, aspect scanning, event search
│   │   │   ├── relations/   # kutas, synastry, composite timing
│   │   │   └── varshaphala/ # annual charts, Tajika
│   │   └── test/            # golden fixtures — see docs/07-accuracy.md
│   ├── atlas/               # GeoNames-backed place + historical timezone resolution
│   ├── interpret/           # interpretation rules + text library (data, not prose-generation)
│   ├── db/                  # Drizzle schema, migrations, typed queries
│   └── ui/                  # Design system: tokens, primitives, chart SVG components
├── legacy/
│   └── jade-v0.html         # the original single-file prototype, kept as a reference oracle
└── docs/
```

**The single most important architectural decision:** `packages/astro` never imports from
`packages/db`, `apps/web`, or anything with an `await fetch` in it. It is a mathematics
library that happens to live in your repo. Everything else is replaceable; this is the asset.

## Ephemeris strategy

The v0 prototype uses `astronomy-engine` (MIT). It is a genuinely good library — but it tops
out around arcsecond-level agreement and doesn't natively speak Jyotiṣa (no ayanāṁśa variants,
no nodes as chart points, no houses). Professionals compare against Swiss Ephemeris. So:

**Define one interface, ship two implementations.**

```ts
export interface EphemerisProvider {
  readonly id: 'swisseph-native' | 'swisseph-wasm' | 'astronomy-engine';
  readonly precisionClass: 'reference' | 'interactive';
  positionEcliptic(body: Body, jdUT: number, opts: PosOpts): EclipticPosition; // λ, β, r, speeds
  houses(jdUT: number, lat: number, lon: number, system: HouseSystem): HouseCusps;
  ayanamsa(jdUT: number, mode: AyanamsaMode): number;
  risingSetting(...): ...;
}
```

- **`swisseph-native`** — [`sweph`](https://github.com/timotejroiko/sweph) (N-API bindings,
  100% Swiss Ephemeris API coverage) running in the Docker worker and in the Next.js Node
  runtime. This is the _reference_ provider. Every stored chart is computed with it.
- **`swisseph-wasm`** — WASM build for the browser, so scrubbing a time slider is instant and
  offline-capable. Marked _interactive_: results shown live but re-verified server-side before
  anything is saved or printed.
- A conformance test asserts the two providers agree within 0.5″ on planets and 1″ on the
  Moon across 10,000 random datetimes. If they diverge, the build fails.

**Licensing — do this before you take a single dollar.** Swiss Ephemeris is dual-licensed:
AGPL, or a professional licence. AGPL's network clause means running it inside a SaaS
obliges you to release your _entire_ application under AGPL. The professional licence is
**CHF 700, one-time, no royalties, valid 99 years, no per-developer or per-product limit**,
and explicitly covers "server-based software where end users access via web browser." Buy it.
It is the cheapest moat you will ever purchase. Until it's bought, develop against
`astronomy-engine` behind the same interface so nothing blocks.

Ephemeris data files (~100 MB for the full set) are **not** committed. A `scripts/fetch-ephe.ts`
downloads them into `.ephe/` and the Docker image bakes them in.

## Atlas and time

Getting the _time_ right is where most astrology software quietly fails, and it's a place to
be conspicuously better.

- **Places**: the free GeoNames dump loaded into Postgres, with `pg_trgm` fuzzy search and
  lat/lon/elevation/timezone per place. Attribution required (CC BY).
- **Zones**: IANA `tzdb` via Luxon. **Known limitation to handle honestly:** tzdb's pre-1970
  data is explicitly best-effort and is wrong for many locations — exactly the era most birth
  charts fall in. So:
  - Every birth event stores the resolved offset **and** how it was resolved
    (`tzdb` | `manual` | `lmt`).
  - The UI shows the offset it used, with a one-click override and a Local Mean Time option.
  - Ambiguous times (DST fall-back, war time, pre-standardisation) are flagged in the UI with
    a "verify this" badge rather than silently guessed.
  - A `timeAccuracy` field: `exact` | `±5min` | `±30min` | `±2h` | `unknown`, which drives a
    visible confidence band on the ascendant and on any house-dependent conclusion.
- **Rectification workspace** (Phase 8) builds directly on this.

## Determinism and caching

```
chartId = sha256(birthEventCanonicalJSON + settingsProfileCanonicalJSON + astroPackageVersion)
```

Every computed chart is content-addressed. Recomputation is free to skip; a change in the
calculation package version invalidates everything automatically, which is exactly what you
want when you fix a bug in the varga math. Store the computed blob as JSONB and treat it as a
cache, never as the source of truth — the source of truth is always (birth event + settings).

## Security posture

- Birth data columns encrypted at rest (pgcrypto or app-level envelope encryption).
- Row-level security by `workspace_id` from day one; get this wrong later and it's a rewrite.
- Client share links: signed, expiring, revocable, no PII in the URL.
- Audit log on every read of another person's birth data by a workspace member.
- No birth data in logs, error reports, or analytics events. Sentry scrubbing configured in
  Phase 0, not Phase 7.
