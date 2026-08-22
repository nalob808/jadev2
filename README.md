# Jade

**The practice OS for Vedic astrology.** Sidereal chart mathematics accurate to the
arcsecond, a client book, relationship analysis, predictive timing, and client-ready
deliverables — on the web, on any device.

## Status

| Phase |                        |                                                                                        |
| ----- | ---------------------- | -------------------------------------------------------------------------------------- |
| 0     | Rails                  | ✅ done — monorepo, CI, Sentry scrubber, legacy route                                  |
| 1     | Calculation core       | 🔵 in progress — sub-steps 1–5 + Vimśottarī landed and passing against Swiss Ephemeris |
| 2     | People and persistence | ⬜ next                                                                                |
| 3     | Chart workspace        | ⬜                                                                                     |
| 4     | Relationships          | ⬜                                                                                     |
| 5     | Predictive engine      | ⬜                                                                                     |
| 6     | Practice layer         | ⬜                                                                                     |
| 7     | Billing and launch     | ⬜                                                                                     |
| 8     | Beyond                 | ⬜                                                                                     |

## Quick start

```bash
corepack enable                 # gives you pnpm
pnpm install
pnpm test                       # 115 tests, including 90 accuracy checks
pnpm --filter @jade/web dev     # http://localhost:3100
```

The original prototype is preserved at `/legacy` for side-by-side comparison.

## Tests

| Command                                           | What it needs                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm test`                                       | nothing — unit tests everywhere, DB tests skip                              |
| `TEST_DATABASE_URL=… pnpm test`                   | a Postgres; adds tenancy, concurrency and place-search tests                |
| `TEST_DATABASE_URL=… pnpm --filter @jade/web e2e` | a Postgres; drives a browser through sign-in → add person → chart           |
| `pnpm db:doctor`                                  | a configured database; checks that workspace isolation actually holds on it |

`pnpm db:doctor` is the one to run against any database before it holds real
client data. Row-level security is provider-specific: a role with SUPERUSER or
BYPASSRLS skips every policy, so the isolation tests can pass locally while
production has none. The doctor checks the live role, that RLS is enabled
**and forced** on every workspace-scoped table, and then actually tries to read
another workspace's rows.

The database role used for tests must **not** be a superuser — superusers
bypass row-level security, and a passing test that skipped the check is worse
than no test.

## Accuracy

Golden fixtures are **generated from Swiss Ephemeris**, not hand-written:

```bash
pip install pyswisseph
python3 scripts/generate_fixtures.py          # regenerate
python3 scripts/generate_fixtures.py --check  # CI drift gate
WRITE_ACCURACY_REPORT=1 pnpm --filter @jade/astro test
```

Worst-case error of the MIT `astronomy-engine` provider against Swiss Ephemeris across
the fixture set: ayanāṁśa 0.005″, ascendant 1.6″, Sun 1.1″, Moon 4.4″, mean node 0.5″,
outer planets up to 17″. Those last numbers are why a `swisseph` reference provider is
Phase 1 sub-step 1b — see `docs/07-accuracy.md`.

## Layout

```
apps/web        Next.js — app + marketing site + /legacy
apps/worker     Dockerized Node service for long jobs (Fly.io)
packages/astro  THE CORE. Pure calculation library, zero I/O
packages/ui     Design tokens and (from Phase 3) the chart components
packages/db     Drizzle schema, migrations, row-level security, queries
packages/atlas  Place search and historical timezone resolution
packages/interpret  Grounded interpretation — Phase 8
scripts/        Fixture generation and ephemeris data fetch
docs/           The plan. Read docs/05-phases.md before starting work.
```

## Rules

`CLAUDE.md` is the constitution — read it before touching code. The short version:
accuracy is the product, the calculation core stays pure, no silent defaults in
astrology settings, birth data is sensitive, interpretation must cite its factors, and
Jade never predicts death, disease or legal outcomes.
