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

**The transit half landed with Phase 5's scanner**, as planned. Jupiter and
Saturn are scanned over each person's natal Moon, natal Venus and the lord of
their seventh, and every contact carries which pass of the retrograde loop it
is — a slow graha crosses a degree up to three times and all three are real
dates. Only the two slow grahas are watched: Mars is over a point in days and
the Moon in hours, and a timeline that flags everything flags nothing.

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

## Phase 5 — Predictive engine and alerts (2–3 weeks) 🔵 IN PROGRESS

**Goal:** Jade tells you things before you ask.

**Shipped so far: the transit scanner.** Ingresses, stations and crossings, each
returned as a bisected root rather than a sample. Verified against Swiss
Ephemeris over two five-year windows a century apart, with an independent
bisection on the reference side — every event count matched exactly, and the
timing spread runs from 0.15 minutes for the Moon to 64.78 for Saturn near a
station. That spread is the interactive provider's position error expressed as
a time, not the scanner's precision, which is why **a stored or printed transit
date must come from the reference provider**. See `docs/07-accuracy.md`.

The retrograde triple pass works and is the reason the module exists.

**Shipped: watches.** Four rule kinds — a transit reaching a natal point, an
ingress, a station, and a daśā beginning — each producing hits that carry the
exact moment, the rule, and the placements. Nothing interprets and nothing says
whether an event is good or bad; a test asserts no hit ever contains that
vocabulary.

Stored in `watches` and `watch_hits` with RLS forced on both. `pnpm watches:run`
is the body of the nightly job, and it is **idempotent**: hit keys are derived
from the event rather than from when the job ran, so a second pass over an
overlapping window finds the same ten events and records none of them. Verified
against a real Postgres — three runs, ten rows.

**Still to come in this phase:** the long-running worker on Fly.io, the daśā ×
transit heat timeline, event search, and email digests. The digests need Resend
wired to a verified domain, which is a deploy-side step rather than a code one.

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

## Phase 9 — Rectification 🔵 IN PROGRESS

**Goal:** the feature a professional switches software for.

Birth time rectification is the most valuable unsolved problem in this market.
Every practitioner meets clients with "sometime in the morning" on the birth
record, the ascendant is the one thing the whole chart hangs from, and the
existing tools either do not attempt it or produce a single confident number
with no working shown. Astrologers already pay for rectification help. Nothing
good exists.

**Shipped so far: the engine.** A pure sweep over candidate birth times,
scoring each against reported life events by named classical rules. Sixteen
event kinds, each mapped to its houses and kārakas with a citation; seven
scoring rules with fixed, exported weights; every point traceable to the
placements that produced it. The `life_events` table, RLS forced, and the
workspace at `/people/[id]/rectify`.

**The two signals, and why they are the only ones.** Over a window of hours the
ascendant moves about a degree every four minutes and rotates the houses; the
Moon moves half a degree an hour and fixes the balance of the first mahādaśā,
which shifts every daśā boundary in the life. Everything else is still —
Saturn moves two arcseconds an hour. A rule resting on a slow graha's sign
alone fires identically for every candidate and ranks nothing.

**Which is the thing this implementation does that others do not.** The sweep
reports, per rule, the fraction of candidates it fired for, and marks any rule
above 98% or below 2% as non-discriminating. Those rules are shown greyed,
with their firing rate, beneath the ones that actually separated the field. A
rule that fires for everything contributed to every score equally; including it
in a confident-looking spread without saying so is how a tool starts lying
politely. The page also reports **separation** — the best candidate against the
median — and says plainly when the supplied events do not distinguish the
window, which is a fact about the evidence rather than about the chart.

**Deliberately not shipped: an answer.** There is no `bestTime` field on the
result type and no "rectified birth time" anywhere in the UI. The output is a
ranked shortlist, every candidate carries its rules, and `RECTIFICATION_CAVEAT`
travels with it. Adopting a candidate is a separate, labelled act that writes
`min5` accuracy and a source note recording that the time came from a sweep —
because a year later nobody remembers whether an ascendant came from a
certificate or from an inference, and the two deserve very different
confidence.

**On the difficult event kinds.** Bereavement, illness and accident are among
the best rectification anchors there are: precisely dated, unambiguous, and
they engage houses nothing else engages. They are included as _events the
person reports having already happened_ — data, not prophecy. Constitution item
6 forbids predicting death, disease and legal outcomes; it does not forbid
recording that a bereavement occurred in 1998 and asking which birth time is
consistent with it. Nothing in the module produces a forward-looking statement,
and a test asserts it.

**Still to come in this phase:** more rules (Aṣṭottarī cross-check once that
daśā exists, Tājika annual returns once varṣaphala does), a printable
rectification report, and the ability to hold two candidate birth events side
by side rather than adopting one.

**Done when:** the sweep runs over a configurable window and step; events are
stored, excludable and re-runnable; every candidate shows its rules and their
placements; non-discriminating rules are reported as such; a candidate can be
adopted with its provenance recorded; and no output anywhere claims a corrected
time.

> **Prompt:**
> "Read packages/astro/src/rectification. Add the remaining rules behind named
> options, and build the printable rectification report from the same
> components as the chart report. Every rule must return the placements that
> made it fire, weights stay exported, and the discrimination reporting must
> cover any rule you add. Do not add a field that names a single best time."

---

## Phase 10 — Entitlements ✅

**The finding that started it:** nothing in the codebase read `workspaces.plan`. There was no
gating of any kind, which meant the free tier was the entire product and the pricing page was
describing a product that did not exist. That reframes the revenue question. It is not "what
should we build to charge more"; it is **"what should Free stop doing"**.

### The split

Free is your own chart. Paid is doing this work on other people.

|                                                   | Free | Seeker $9 | Practitioner $49 | Professional $99 |
| ------------------------------------------------- | ---- | --------- | ---------------- | ---------------- |
| People                                            | 3    | ∞         | ∞                | ∞                |
| Notes                                             | 10   | ∞         | ∞                | ∞                |
| All 16 vargas, yogas, daśās, aṣṭakavarga, ṣaḍbala | ✅   | ✅        | ✅               | ✅               |
| Export                                            | ✅   | ✅        | ✅               | ✅               |
| Relationships and synastry                        |      | ✅        | ✅               | ✅               |
| Printable reports                                 |      | ✅        | ✅               | ✅               |
| Rectification                                     |      | ✅        | ✅               | ✅               |
| Alerts, sessions, varṣaphala                      |      |           | ⏳               | ⏳               |
| Branding, share links, muhūrta, ledger, API       |      |           |                  | ⏳               |

Free keeps **full calculation depth**, deliberately. A crippled calculator is the wrong thing to
give away when the entire market position is "accuracy is the product" — the free tier has to be
the thing that proves the claim. What Seeker sells is scale and the practice layer.

### What may and may not be gated

The pricing page promises "accuracy is not a paid feature". That is a promise about
_correctness_, not scope: every tier computes the same chart, with the same ephemeris and the
same ayanāṁśa maths. Gating which **pages** a workspace may open is fine. Computing a cheaper,
less accurate chart for a free workspace never is, and `plans.ts` has no vocabulary that could
express it. Constitution item 1.

**Export is not gateable at all.** Constitution item 4 requires export on every plan, and
"always" does not mean "on the tiers that paid for it". There is deliberately no capability key
for it, so the guarantee is structural rather than a matter of remembering. An early draft of
this phase gated export to Seeker; that was wrong and was removed.

### Design decisions worth keeping

- **One table, two consumers.** `apps/web/src/lib/plans.ts` is read by both the marketing
  pricing page and the server-side gate. A tier list maintained twice eventually advertises
  something the product does not grant, and the person who finds the gap is always a customer.
- **Cumulative by construction.** A tier declares only what it _adds_; "everything in Seeker" is
  true because `capabilitiesOf` walks the ladder, not because someone copied bullets down.
- **`built: false` is data, not a footnote.** An unfinished capability renders with a "being
  built" tag automatically. A test asserts that nothing unbuilt sits on Seeker — the only tier
  anyone can actually be charged for today.
- **Enforcement is server-side or it is decoration.** Every gate runs in a page body or a server
  action. The e2e suite navigates directly to gated URLs, because that is what a bookmark does.
- **A refusal explains itself.** `/upgrade` always answers four things: what was blocked, what
  that feature does, which is the _cheapest_ tier with it, and what you are on now.
- **Unknown tier strings degrade to Free, visibly.** Throwing takes the workspace down; granting
  everything turns one typo into free Professional. Free is the recoverable direction — and
  Settings prints the raw stored value so a mis-flagged paying customer can see it.
- **Grandfathering, in the migration.** Every workspace that existed when 0009 ran is on
  Professional at no charge, marked `plan_source = 'grandfathered'`. Taking features away from
  people who signed up when everything was included, to tidy a pricing page, is not a trade
  worth making.
- **`plan_source` exists so billing cannot cancel comped accounts.** When the Stripe webhook
  lands, "no active subscription" and "should be free" are not the same fact. Conflating them
  downgrades every grandfathered and comped workspace at once.

### The honest state of the ladder

Only **Free → Seeker** is a real, chargeable upgrade today. Everything on Practitioner and
Professional is `built: false`. Do not open checkout on those tiers until they are not.

### Instead of a fake Buy button

There is no checkout, so the wall does not pretend there is one. It offers "tell me when this
opens", which writes a row to `upgrade_intents` recording the tier they were on, the tier they
wanted, and the gate that refused them. That is the only unbiased demand signal this product can
currently generate, and it doubles as the list of people to email on the day billing opens.

### Acceptance

- 65 web unit tests including 23 on the matrix; 56 e2e including 7 on the gate.
- Invariant tests, not just value tests: no tier may remove a capability or lower a limit
  relative to a cheaper one; every capability is sold on exactly one tier; no tier allows zero
  of anything.
- `pnpm db:doctor` now checks `life_events` and `upgrade_intents`, **and fails on any
  workspace-scoped table missing from its own list** — the list had already fallen behind twice.
- Migration 0009 also normalises 0008's `life_events` policy onto the two helper functions every
  other policy uses. Written as a new migration rather than an edit, because 0008 is recorded as
  applied on any database that has run it.

> **For the next agent:** do not add a capability key for export, and do not gate a calculation.
> If you add a workspace-scoped table, add it to `expected` in `packages/db/scripts/doctor.ts`
> — the doctor will fail until you do, which is the point. When wiring Stripe, write
> `plan_source = 'stripe'` and never downgrade a row whose source is `grandfathered` or
> `manual`.

---

## Phase 11 — Billing, and the two pages that must ship with it ✅

Phase 10 built the gate. This makes it possible to pay to pass, and writes the
two documents you should not take a card without.

### Stripe

- **Checkout** creates the customer _before_ the session and attaches it to the
  workspace, so the webhook arriving seconds later can find the account. A
  payment you cannot match to an account is the classic version of this bug.
- **The webhook** verifies the signature against the raw body (`request.text()`,
  never `request.json()` — re-serialising changes the bytes), answers 200 to
  events it deliberately ignores so Stripe does not retry-storm the endpoint,
  and claims the event id in `stripe_events` _before_ acting.
- **The billing portal** is Stripe's, not ours. Cards, cancellation, invoices
  and receipts all live there. Every billing screen not built is one that
  cannot leak a card number.
- **All of it is optional.** With no keys set, `billingConfigured` is false, the
  Stripe SDK is never loaded, and the wall keeps offering to record interest.
  This is a tested state, not a degraded one — see `legal-and-billing.spec.ts`.

### The decision is pure, and that is the point

`lib/billing.ts` has no network, no database and no Stripe import. It is the
piece of the system that can take somebody's product away, and a rule that can
only be exercised by replaying live webhooks is a rule nobody exercises.

Two guarantees it enforces, both tested exhaustively:

1. **Billing may only change what billing created.** A workspace whose
   `plan_source` is `grandfathered` or `manual` is untouchable by any Stripe
   event — including an upgrade, because a guard that works in one direction
   only is not a guard. "No active subscription" and "should be Free" are
   different facts, and conflating them cancels every comped account at once,
   silently, starting with the people who trusted you earliest.
2. **`past_due` keeps access.** The card failed and Stripe is retrying for
   about a fortnight. Cutting a paying customer off on the first failed retry
   loses both the customer and the payment that would have recovered.

An unrecognised price resolves to nothing rather than to a guess — a live-mode
price arriving at a test-mode deployment looks exactly like that, and guessing
either gives the product away or removes something just paid for.

### Terms and Privacy

`/terms` carries the never-predict rule in writing, which is the half of
constitution item 6 that was never built. `/privacy` says what Jade actually
holds, who processes it, and how to get it all back.

**The privacy policy states plainly that birth data is not yet encrypted at the
field level.** Storage is encrypted by the host; the fields are not, so anyone
with a live connection string can read a birth time. Writing "your data is
encrypted" and letting the reader infer the stronger meaning would have been
the most quotable false sentence on the site, in the document people read when
deciding whether to trust us with somebody else's birth certificate. An e2e
test asserts that sentence is absent and the honest one is present.

### Acceptance

- 83 web unit tests (18 new, on the billing rules); 63 e2e (7 new).
- `pnpm db:doctor` gained a reasoned exemption list — `stripe_events` carries a
  `workspace_id` but is deliberately not RLS-scoped, because the webhook has no
  session to bind, and the doctor now _prints that reason_ rather than staying
  silent about it.
- `docs/09-stripe.md` is the setup checklist for the part only a human can do.

> **For the next agent:** never let a Stripe event write to a workspace whose
> `plan_source` is not `default` or `stripe`. The guard is in
> `resolvePlanChange` _and_ repeated in the SQL `WHERE` clause of
> `applyBillingState`; keep both. And do not update the encryption paragraph in
> `/privacy` until field-level encryption actually ships.

### Still true, and still the constraint

Only **Free → Seeker** is chargeable. Everything above it is `built: false`.
Create the Seeker prices in Stripe and leave the rest — a tier with no price id
falls back to "tell me when this opens" on its own.

---

## Phase 12 — Sessions and prep sheets ✅

**The first Practitioner capability that stops being a promise.** Everything on
that tier was `built: false`; this one is now true, and the pricing card and
the upgrade wall pick that up from the same flag automatically.

### Why this one and not another technique

The $100 test asks whether a feature saves a working astrologer an hour a week.
A prep sheet is the only thing in the backlog that answers it directly: an hour
before every reading currently goes on assembling by hand what the software
already knows.

The obvious version of this feature is worthless — it prints the chart again,
and the practitioner already knows the chart. What they cannot get in five
minutes is:

1. **When the daśā next turns.** Not "Venus–Saturn", which they remember — the
   date the antara ends, which they are asked in almost every reading and work
   out by hand almost every time.
2. **The dated transit contacts either side of the appointment**, with every
   pass of a retrograde loop, because those are the dates that get written down
   and handed over.
3. **What was said last time**, which after forty clients is genuinely
   unrecoverable.

### The line this feature must not cross

A prep sheet lists what is _there_. It never says what a period means for the
person, never rates one, and never suggests what to tell them. The moment it
does it stops being preparation and becomes a script — and a script read out by
a practitioner who has not checked it is exactly what makes generated astrology
worthless. Both the unit and e2e suites assert the absence of that vocabulary
on a page a practitioner reads aloud from.

### Decisions worth keeping

- **Aspects are deliberately absent from the diary.** Vedic aspect is primarily
  rāśi dṛṣṭi, so "Saturn aspects her Moon" stays true for about two and a half
  years. It is a standing condition, not a dated event, and listing it under
  "around 12 September" would misrepresent it as news. Standing conditions
  belong in the chart reading, which already covers them.
- **Only slow bodies.** The Moon changes sign every two days; listing its
  contacts would bury the four that matter under sixty that do not.
- **The prep sheet is computed, never stored.** A stored sheet silently rots —
  correct the birth time or change the ayanāṁśa and last month's sheet still
  shows last month's answer.
- **`notes.session_id` is a LINK, not an anchor.** Anchors name stable factors
  ("Mars", "the 7th") precisely so a note can be found from any chart sharing
  that factor. A row id is not a factor, and adding `session` to the anchor
  vocabulary would have broken that invariant for a convenience.
- **A follow-up outlives its session** — nullable `session_id`, ON DELETE SET
  NULL. "Revisit the 10th when Saturn stations" is still true after the
  consultation record is tidied away.
- **`scheduledFor` is a real instant**, unlike birth data, which stores a wall
  clock as text. A birth certificate's characters are the record; a
  consultation is a moment two people must both turn up for. The difference is
  deliberate, and booking runs through the same offset resolver birth data uses
  rather than a second, simpler conversion.
- **`getSessionById`, not `getSession`.** "Session" means both the signed-in
  user's session and a consultation, and the page rendering one imports both.
  One `getSession` in scope resolving to the wrong one is a bug that typechecks.

### Acceptance

- 56 interpret tests (13 new) and 585 astro; 69 e2e (6 new). `pnpm verify` green.
- The multi-pass test is **pinned to a window where a retrograde loop is a fact**
  — over the 180 days a prep sheet covers, the reference chart happens to have
  none, so asserting there would have tested the calendar rather than the code.
- `pnpm db:doctor` caught `sessions` and `follow_ups` as unlisted
  workspace-scoped tables before they shipped. That check was added in Phase 10
  for exactly this, and it worked on its first real opportunity.

> **For the next agent:** do not let the prep sheet start advising. If you add
> graha dṛṣṭi by degree, give it its own section with its own stated orb rather
> than mixing it into the contact diary — the diary's whole value is that every
> line in it is an exact date.

---

## Phase 13 — The public chart library ✅

A front door that shows the product before asking for anything. Jade previously
asked you to sign up and _then_ to type a birth certificate before it would show
you a single chart.

### The finding that shaped the whole feature

The roster is 19 figures. **Exactly one has an attested birth time.**

That is not a seeding shortcut, it is what the evidence supports.
Encyclopaedias record the date and place of a birth and almost never the hour.
Times for famous people circulate widely in astrological literature, usually
with no primary source and frequently disagreeing with each other by hours —
Gandhi has several in circulation that differ by more than an hour, and the
astrologers publishing Ramanujan's own call it tentative.

So the _dominant_ case in any honest public library is the untimed one, and the
whole design follows from taking that seriously rather than papering over it.

### What an untimed chart shows

`positionsAcrossDay` computes what a date alone actually determines, by
evaluating both ends of the local day and reporting whether they agree:

- **The ascendant is unknowable** — it travels the whole zodiac in a day, and so
  does every house counted from it. The result type contains no ascendant and no
  houses, so a caller cannot read one out by accident.
- **The Moon usually is too** — about 13° a day against a 13°20′ nakṣatra, so it
  changes nakṣatra almost daily.
- **The slow grahas are fine** — Saturn moves about two arcminutes. Reporting it
  as uncertain would be as wrong as inventing a lagna.

A graha that holds its sign all day is reported as certain; one that crosses a
boundary is reported as _both_ signs, which is the true answer and more useful
than either half.

Most software resolves this tension by dropping the refusal: assume noon, draw a
confident ascendant, print it identically to a chart from a birth register. A
student cannot tell the two apart, which makes the software actively harmful for
the one thing they are trying to learn. An e2e test asserts no lagna appears on
an untimed page — and asserts it on the _labels_, not on the word "ascendant",
because the honest disclosure legitimately uses that word and a substring check
would be satisfied by deleting the honesty.

**The missing time is then framed as a question rather than a dead end**, linking
to rectification — which turns our weakest data into the one feature no
competitor has.

### Why `public_figures` is its own table

The obvious design is `subjects.is_public`. It is wrong for a safety reason.

`subjects` holds clients' birth data behind row-level security. The library
reads with no session and no workspace binding, so putting public figures there
means either poking a hole in the isolation policy or running library queries
with RLS bypassed — both of which put one bad predicate between a private client
and a page indexed by Google.

With two tables the library's queries never mention `subjects` at all, so the
leak is **unexpressible rather than merely guarded against**. A test asserts it
through the front door anyway.

The table also carries no `workspace_id`, so `db:doctor`'s unlisted-table probe
has nothing to find and needs no exemption — noted in the doctor where somebody
would look for it.

### Decisions worth keeping

- **The Rodden rating is NOT NULL, and `X` is a legitimate answer.** A CHECK
  constraint enforces that a row rated X or XX has no time and a rated row does,
  so the invariant holds against a hand-written INSERT.
- **The lens is fixed and printed on every page.** No session means no settings
  profile; constitution item 3 forbids a _silent_ default, not a default.
- **Zones resolve through the tz database.** Calcutta kept Howrah Mean Time at
  +05:53:20 until 1941 — software assuming +05:30 puts every 19th-century Indian
  birth twenty-three minutes out.
- **Newton is stored as 4 January 1643**, the Gregorian equivalent of the Julian
  25 December 1642 England was still using, with the note printed beside the
  chart.
- **Summaries are written for Jade, never pasted.** The encyclopaedias they would
  otherwise come from are variously licensed, and a library built on copied prose
  is one that has to be taken down.

### Acceptance

- 593 astro tests (8 new on the untimed day); 78 e2e (9 new). `pnpm verify` green.
- `pnpm --filter @jade/db seed:figures` upserts on slug, so correcting a record
  is editing `packages/db/data/publicFigures.ts` and re-running.

> **For the next agent:** never add a birth time to `publicFigures.ts` without a
> source in `timeSource`, and never lower a rating to make a chart look better.
> If you add a figure whose time you found on an astrology site with no primary
> source, that is `C` at best and probably `X`. The library's only real asset is
> that its ratings can be trusted.

### Still open

The roster is small and heavily untimed. Growing it is research, not code —
every entry needs its date and place checked and its time either sourced or
honestly marked absent.

---

## Phase 8 — Beyond (ongoing)

Ranked by expected return:

1. **Mobile**: PWA with offline charts first (the WASM ephemeris makes this genuinely possible);
   Capacitor wrap for the app stores once retention is proven.
2. **Import from competitors** — Solar Fire, JHora, AstroSage, Parashara's Light. Every import
   format you support is a professional who can switch in an afternoon.
3. **The interpretation layer** — the grounded AI assistant, plus the forkable text library.
4. ~~**Rectification workspace**~~ — promoted to Phase 9 and started; see above.
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
