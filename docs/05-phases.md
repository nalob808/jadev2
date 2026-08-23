# 05 — Build phases

Each phase has: a **goal**, a **definition of done** (testable), and a **prompt** you can paste
into Claude Code to execute it. Run them in order. Do not start a phase before its predecessor's
tests pass in CI.

Rough solo-with-Claude-Code pacing is given per phase; the honest total to a paid launch is
about four to six months of consistent evenings, and about six weeks to something she uses
every day.

---

## The gate before every push

`pnpm verify` runs exactly what CI runs — `--frozen-lockfile`, format, typecheck, lint, test,
build — in about a minute. Run it before pushing.

Two classes of failure exist **only** in the production build and never in `next dev`:

- **TS2742**, "the inferred type of X cannot be named without a reference to `.pnpm/…`". A
  package whose types appear in an exported signature must be a _direct_ dependency even if
  nothing imports it by name. `tsc --noEmit` does not check declaration emit, so typecheck
  passes and `next build` fails.
- **A `pnpm-lock.yaml` that has drifted from a `package.json`.** Your machine installs anyway;
  CI and Vercel use `--frozen-lockfile` and refuse.

Both reached Vercel once. The `Production build` step in `.github/workflows/ci.yml` is there
so neither does again.

---

## Phase 0 — Rails (2–4 days)

**Goal:** an empty repo that is impossible to build sloppily in.

**Done when:**

- pnpm + Turborepo monorepo with the layout in `01-architecture.md`
- TypeScript strict, ESLint, Prettier, `vitest`, Playwright
- GitHub Actions: typecheck + lint + unit + e2e on every PR
- `apps/web` deploys to Vercel on push; preview URLs on PRs
- Sentry wired with a PII scrubber that drops any field named like birth data
- `legacy/jade-v0.html` committed and openable at `/legacy` for side-by-side comparison
- `CLAUDE.md` and `docs/` committed

> **Prompt:**
> "Read CLAUDE.md and docs/01-architecture.md. Scaffold the Jade monorepo exactly as specified:
> pnpm workspaces + Turborepo, apps/web (Next.js App Router, TypeScript strict, Tailwind with
> the design tokens extracted from legacy/jade-v0.html), apps/worker (Node + Dockerfile),
> packages/astro, packages/atlas, packages/db, packages/ui, packages/interpret. Set up vitest,
> Playwright, ESLint, Prettier, and a GitHub Actions CI that runs typecheck, lint and tests.
> Add Sentry with a beforeSend hook that strips any field matching /birth|natal|dob|lat|lon/.
> Commit legacy/jade-v0.html and serve it at /legacy. No feature code yet."

---

## Phase 1 — The calculation core (3–5 weeks; the real work)

**Goal:** `packages/astro` computes a complete, correct Vedic chart. No UI at all.

Sub-steps, in order:

1. `EphemerisProvider` interface + `astronomy-engine` implementation (so you can start today) +
   `sweph` native implementation behind the same interface.
2. Sidereal conversion, all ayanāṁśa modes, ΔT, apparent positions.
3. Points: 9 grahas **including Rāhu/Ketu**, Asc/MC, outers, upagrahas, special lagnas.
4. Houses: whole sign + Śrīpati + Placidus/KP, bhāva madhya.
5. All 16 vargas.
6. Dignities, combustion, retrogression, avasthās, planetary war.
7. Aṣṭakavarga (BAV, SAV, both śodhana schools, śodhya piṇḍa).
8. Ṣaḍbala, all six sources.
9. Yoga rule engine + the first ~40 yogas with cancellations and citations.
10. Daśās: Vimśottarī (5 levels), Aṣṭottarī, Yoginī, Chara (both variants).
11. Pañcāṅga incl. sunrise conventions, Rāhu Kāla, Choghaḍiyā, muhūrta primitives.
12. Transit scanning, root-finding, ingress/station/lunation/eclipse search.
13. Kūṭa matching and synastry primitives.
14. Varṣaphala/Tājika.

**Done when:**

- The golden fixture suite in `docs/07-accuracy.md` passes at the stated tolerances.
- `swisseph-native` and `swisseph-wasm` agree within 0.5″ across 10,000 random datetimes.
- Every exported function has a doc comment naming its classical source.
- Full chart computation benchmarks under 150 ms.
- **Zero** imports from `db`, `web`, or the network anywhere in the package.

> **Prompt (run once per sub-step, not all at once):**
> "Read docs/03-calculation-spec.md section N. Implement it in packages/astro/src/<area>/ as
> pure functions taking jdUT explicitly. Define the types first in types.ts and show them to me
> before implementing. Then write the implementation plus vitest tests covering: the worked
> examples in the spec, boundary cases (0°, 29°59′, sign cusps, retrograde stations, polar
> latitudes, pre-1900 and post-2100 dates), and the golden fixtures in test/fixtures/. Do not
> touch any other package. Cite the classical source in a doc comment on every exported
> function. Where authorities disagree, implement the variants behind a named option and add a
> row to the disagreement table in docs/03-calculation-spec.md."

---

## Phase 2 — People and persistence ✅ SHIPPED ← **the promise you made her**

**Goal:** the app remembers people. Deploy this the day it works.

**Done when:**

- Postgres + Drizzle with the schema from `02-domain-model.md` (subjects, birth_events, places,
  settings_profiles, charts), RLS on `workspace_id`
- Auth (email + Google), workspaces created on signup
- GeoNames atlas loaded, fuzzy place search, historical timezone resolution with the offset
  source recorded and the ambiguity flag surfaced
- "Add a person" flow that a non-technical person completes in under 60 seconds on a phone
- Person list, person detail, switch between people, delete + export
- Charts computed server-side, content-addressed, cached
- **Deployed at a real URL with her account on it**

> **Prompt:**
> "Read docs/02-domain-model.md. Implement packages/db with Drizzle: schema, migrations, RLS
> policies scoped by workspace_id, and typed query helpers. Then in apps/web add Supabase Auth
> (email + Google), workspace creation on signup, and the subject CRUD flow: list, create, edit,
> delete, export. Build packages/atlas with a GeoNames loader script, trigram place search, and
> timezone resolution via Luxon that returns {offsetMinutes, source, ambiguous} — surface
> `ambiguous` in the UI as a 'verify this time' badge with a manual override and an LMT option.
> Charts are computed on the server via packages/astro and cached in the charts table keyed by
> sha256(birthEvent + settings + astroVersion). Playwright test: sign up, add a person with a
> 1987 Mumbai birth, see a chart, reload, chart is cached."

---

## Phase 3 — The chart workspace (3–4 weeks) 🔵 IN PROGRESS

**Shipped so far:** the varga projection in the core (`buildVargaChart` — every
divisional re-seated on its own ascendant, not the rāśi redrawn sixteen times),
North Indian and South Indian charts as hand-written SVG, the ṣoḍaśavarga
contact sheet, and the Vimśottarī column scrolled to the running period.

**Deliberately not shipped: the East Indian (Bengali) chart.** It was built and
rendered correctly as geometry, but the traditional sign arrangement could not
be verified against a reference implementation, and a plausible-looking guess
at a regional convention is exactly the kind of thing a Bengali astrologer
spots in one glance. Cross-check the layout against Jagannātha Hora or Shri
Jyoti Star before rebuilding it. Two verified styles beat three where one is
invented.

**Still to come in this phase:** the Western wheel, the transit ring with a
time scrubber, bhāva chalit overlay, aṣṭakavarga on the wheel (blocked on the
Phase 1 aṣṭakavarga work), and notes anchored to chart elements.

**Goal:** rebuild the v0 screens as real components over real data, then go far past them.

**Done when:**

- `packages/ui` has the design system (tokens lifted from v0 — keep the blueprint corners and
  the steel accent; that look is Jade's identity) and the chart SVG components: North, South,
  East Indian, Western wheel
- Chart page: wheel + planet table + yoga panel + daśā column + pañcāṅga, per person, per
  settings profile
- Varga grid, aṣṭakavarga overlay, bhāva chalit toggle
- Transit ring with a **time scrubber** running the WASM provider locally at 60 fps
- Notes attachable to chart elements
- Fully responsive; the wheel is legible and interactive on a phone
- Light and dark themes; print stylesheet correct
- Visual regression tests (Playwright screenshots) on all four chart styles

> **Prompt:**
> "Read docs/04-features.md section A and docs/01-architecture.md. Extract the design tokens
> from legacy/jade-v0.html into packages/ui as CSS variables + Tailwind theme. Build the chart
> rendering components as pure React SVG taking a ComputedChart: NorthIndianChart,
> SouthIndianChart, EastIndianChart, WesternWheel, plus PlanetTable, YogaPanel, DashaColumn,
> PanchangCard, VargaGrid, AshtakavargaOverlay. They must render identically on server and
> client and print correctly. Then assemble the /people/[id]/chart page. Add the transit
> scrubber using the WASM ephemeris provider client-side, with server re-verification before
> anything is saved. Add Playwright visual regression tests for all four chart styles at three
> viewport sizes."

---

## Phase 4 — Relationships ✅ COMPLETE

**Shipped:** aṣṭakūṭa verified against every one of the 11,664 possible pairings
(the technique reads only two nakṣatras and two pādas, so the whole input space
is enumerable); maṅgala doṣa with its cancellations computed alongside it and
returned together; synastry as house overlays both ways plus whole-sign dṛṣṭi;
the two-ring **overlay wheel**; the **shared daśā timeline** with named
convergences; the `relationships` table with RLS; and `/relationships`.

**The convergence rules are four, and they are named**: both running the same
graha, the two running lords in mutual dṛṣṭi, one person's running lord sitting
in the other's seventh, and either running the lord of their own seventh. Each
band carries the rule that flagged it and the placements that produced it. There
is no intensity, no score and no colour scale from good to bad — a highlighted
band is a claim, and a claim has to be decomposable.

**Deferred to Phase 5, where it belongs:** the _transit_ half of the timeline.
Convergences today are daśā-to-daśā and chart-to-chart. Adding transiting Saturn
and Jupiter over both charts needs the scanning machinery Phase 5 builds for
watches, and a second, weaker version of it here would be waste.

**Deliberately not shipped: a compatibility score.** Aṣṭakūṭa's total is
displayed as a footnote to its eight components, never as a headline, and
nothing in `packages/astro/src/relations` returns a verdict. An e2e test asserts
that no verdict language appears on the page, which is there to catch the
well-meaning future addition of a "compatibility: 62%" badge.

**Goal:** the module that makes the product personal and sells the most consultations.

**Done when:** aṣṭakūṭa with cancellations, synastry overlay wheel, house overlay, Maṅgala doṣa
(carefully worded), the shared daśā/transit timeline with auto-flagged convergences, and the
private couple's page with its own share link.

> **Prompt:**
> "Read docs/03-calculation-spec.md section 11 and docs/04-features.md section C. Implement
> packages/astro/src/relations (kūṭas with all cancellation rules, synastry aspects, house
> overlays, composite chart, convergence detection across two daśā timelines) with tests
> against the worked examples. Then build the /relationships/[id] page: overlay wheel, kūṭa
> breakdown with every rule shown and explained, and the shared timeline component. Maṅgala
> doṣa output must be phrased as analysis with cancellations shown first — review the copy
> against the tone rules in docs/00-vision.md before shipping."

---

## Phase 5 — Predictive engine and alerts (2–3 weeks)

**Goal:** Jade tells you things before you ask.

**Done when:** the worker service runs scheduled scans; watches evaluate nightly; the daśā ×
transit heat timeline renders across decades; event search compiles a query and returns ranked
windows; email digests send; the book-wide sky screen works.

> **Prompt:**
> "Read docs/03-calculation-spec.md section 10 and docs/04-features.md section D. Build
> apps/worker as a Dockerized Node service with pg-boss: nightly job that evaluates all enabled
> watches, a job that precomputes per-year ingress/station/lunation/eclipse tables shared across
> all users, and a job that computes the daśā×transit correlation series for a subject over a
> date range. Add the /timing pages: heat timeline, event search builder, book-wide sky.
> Emails via Resend with React Email templates. Deploy the worker to Fly.io. Include a
> load test: 1,000 subjects × 20 watches evaluated in under 5 minutes."

---

## Phase 6 — The practice layer (3 weeks)

**Goal:** the reason it costs $99.

**Done when:** client book, sessions with auto prep sheets emailed 24h ahead, session console
with anchored notes, branded PDF reports rendered by Playwright from the same components,
revocable client share links, and the prediction ledger with hit-rate analytics.

> **Prompt:**
> "Read docs/04-features.md section E. Implement sessions, notes with anchors, reports, share
> links and predictions per docs/02-domain-model.md. The prep sheet is a scheduled job that
> assembles running daśās, active transits, last session's notes and open predictions into a
> React Email + a stored snapshot. PDF generation runs in apps/worker via Playwright rendering
> the same packages/ui components with a print theme and the workspace's branding. Share links
> are signed, scoped, expiring and revocable, and resolve to a projection — never the raw
> subject row. Add the prediction ledger with resolve flow and per-technique hit-rate stats."

---

## Phase 7 — Billing, polish, launch (2–3 weeks)

**Done when:** Stripe subscriptions with the four tiers and a 14-day Pro trial, usage limits
enforced server-side, onboarding that gets a new user to their own chart in under two minutes,
the marketing site, the public accuracy page, legal pages, and **the Swiss Ephemeris
professional licence purchased and its receipt filed**.

> **Prompt:**
> "Read docs/06-launch.md. Implement Stripe Billing with the four tiers, webhooks, the customer
> portal, Stripe Tax, and server-side entitlement checks in a single `can(workspace, feature)`
> helper used everywhere. Build the marketing site at apps/web/(marketing): landing, pricing,
> the comparison table from docs/00-vision.md, the accuracy page rendering live results from the
> golden test suite, docs, privacy policy, terms including the no-death/health/legal-prediction
> clause, and GDPR export/delete flows. Add PostHog with birth data excluded from all events."

---

## Phase 8 — Beyond (ongoing)

Ranked by expected return:

1. **Mobile**: PWA with offline charts first (the WASM ephemeris makes this genuinely possible);
   Capacitor wrap for the app stores once retention is proven.
2. **Import from competitors** — Solar Fire, JHora, AstroSage, Parashara's Light. Every import
   format you support is a professional who can switch in an afternoon.
3. **The interpretation layer** — the grounded AI assistant, plus the forkable text library.
4. **Rectification workspace** — life-event log + candidate ascendant search + scoring. Charge
   for it; astrologers pay for rectification tooling and nothing good exists.
5. **Western tropical as a first-class second tradition** — Placidus, progressions, solar arc,
   returns, Hellenistic (zodiacal releasing, annual profections). Doubles the market.
6. **The API product** — the calculation core is already a clean library; expose it. Competing
   Vedic APIs charge ~$29–89/month.
7. **Remaining daśā systems and Jaimini depth** — Kālachakra, Nārāyaṇa, Śūla; this is the
   "nine+ dasha systems" parity claim.
8. **Teams/institutes** — student seats, teacher review of student readings, assignment charts.
9. **Fixed stars, harmonics, midpoints, research database** (an astro-databank of public charts).

---

## The fast path: something she uses in two weeks

If you want a win before the long build, cut this line through the phases:

- **Days 1–2:** Phase 0.
- **Days 3–7:** Phase 1 sub-steps 1–5 only (ephemeris, sidereal, points _with nodes_, whole-sign
  houses, D9). That's already more than v0 has.
- **Days 8–12:** Phase 2 in full, deployed. She can add people.
- **Days 13–14:** Port the v0 "Now" + "Transits" screens onto the new data (a subset of Phase 3).

Two weeks in: a real URL, her account, unlimited people, correct charts with Rāhu/Ketu, live
transits. Then continue with Phase 1 in depth underneath her, without breaking anything —
which is exactly what the pure-core architecture buys you.
