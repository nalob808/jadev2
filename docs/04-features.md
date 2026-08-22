# 04 — Feature catalog

Organised by _what the user is doing_, not by technique. Each item is tagged with the tier
that unlocks it: **[F]** free · **[S]** Seeker $9 · **[P]** Practitioner $49 · **[Pro]** $99.

## A. The chart workspace

The screen an astrologer keeps open all day.

- **[F]** Rāśi chakra in North Indian, South Indian, East Indian, and Western wheel styles —
  switchable, all hand-drawn SVG, all print-perfect.
- **[F]** Planet table: degree, nakṣatra + pada, house, dignity, retrograde, combustion, speed.
- **[F]** Live transits ring over the natal wheel with a **time scrubber** — drag through
  days/months/years and watch the sky move. Instant, because the WASM ephemeris runs locally.
- **[S]** All 16 vargas, individually or in a 4×4 contact-sheet grid.
- **[S]** Bhāva chalit overlay toggle (whole-sign vs Śrīpati vs Placidus, side by side).
- **[S]** Aṣṭakavarga: BAV per graha, SAV with the bindu numbers drawn into the wheel houses.
- **[P]** Ṣaḍbala with the full breakdown chart.
- **[S]** Yoga panel: every detected yoga with its source citation, participants, strength, and
  cancellations — click a yoga to highlight the placements that formed it.
- **[S]** Daśā column: Vimśottarī to 5 levels, always visible, always scrolled to _now_.
- **[P]** Multiple dasha systems side by side.
- **[Pro]** **Split view** — any two charts, vargas, or moments compared on one screen.
- **[F]** Pañcāṅga for the chart moment and for today.
- **[S]** Notes attached to any element (a house, a graha, a daśā period, a transit).

## B. People (the thing this all started for)

- **[F]** Add unlimited people. Name, photo, birth data, relationship, tags.
- **[F]** Smart place search with historical timezone resolution + the "verify this offset"
  flag for ambiguous times.
- **[F]** **Time accuracy setting** per person, with a visible confidence band on the ascendant
  when the time is soft.
- **[S]** Multiple birth events per person (recorded / rectified / relocated).
- **[S]** Groups: "family", "the band", "work" — and a group view showing everyone's current
  daśā and major transits on one timeline.
- **[P]** Import from CSV, and from Solar Fire / JHora / AstroSage export formats. _Import is
  the switching cost killer — a professional with 400 saved charts will not retype them._
- **[F]** Export everything, any time, as JSON + PDF. No hostage-taking.

## C. Relationships

- **[S]** Aṣṭakūṭa 36-guṇa scoring with every kūṭa explained and every cancellation shown.
- **[S]** Synastry overlay wheel + house overlay grid.
- **[S]** Maṅgala doṣa analysis with cancellations, written carefully and non-fatalistically.
- **[P]** Daśakūṭa / South Indian scheme; Rajju, Vedha, Mahendra, Strī-Dīrgha.
- **[P]** **Shared timeline** — both charts' daśās, transits and Sade Sati on one axis, with
  convergences auto-flagged.
- **[P]** Composite chart; relationship start-date chart ("the chart of us").
- **[Pro]** Marriage muhūrta finder constrained by both charts.

## D. Timing and prediction

- **[F]** Today's sky, pañcāṅga, and personal transits (the current v0 "Now" tab, kept).
- **[S]** Transit calendar: ingresses, stations, lunations, eclipses, with personal relevance
  scoring, filterable by planet and by house.
- **[S]** Sade Sati tracker with phase dates and historical passes.
- **[P]** **Daśā × transit heat timeline** — the correlation view. Scrollable across decades.
- **[P]** Event search: _"when is Jupiter next transiting my 10th while a Jupiter antardaśā is
  running?"_ Compile the query, scan years, return ranked windows.
- **[P]** Varṣaphala annual chart with Muntha, year lord, Tājika yogas and Mudda daśā.
- **[Pro]** **Muhūrta engine** — the constraint solver with saved rule presets.
- **[Pro]** **Book-wide sky**: which of your clients has a daśā change, a Sade Sati entry, or a
  major return in the next 90 days. One screen, sorted by date. This is the retention feature.
- **[P]** Watches and alerts: standing rules that email/push when a condition becomes true, for
  one person or across the whole client book.

## E. The practice layer (why it costs $99, not $29)

- **[P]** Client book: subjects flagged as clients, with session history and lifetime value.
- **[P]** **Auto prep sheet**: 24 hours before a session, Jade generates a one-page brief —
  running daśās, active transits, what you discussed last time, open predictions, and the
  three factors most worth raising. Delivered by email. _This is the hour-a-week feature._
- **[P]** Session console: split screen with the chart on one side and timestamped notes on the
  other; notes auto-anchor to whatever chart element is selected.
- **[P]** **Branded client report** (PDF + web link): the astrologer's logo and colours, chosen
  sections, generated in seconds from the same components that render the app.
- **[P]** Client portal: a revocable share link where the client sees their chart, their
  current daśā, and the report — nothing else. Beautiful on a phone.
- **[Pro]** **Prediction ledger**: log a prediction with its window, confidence and the factors
  behind it; resolve it later as hit/partial/miss. Personal hit-rate analytics by technique,
  by planet, by daśā lord. Nothing else on the market does this.
- **[Pro]** Life-event log per client, feeding both rectification and research.
- **[Pro]** Research mode: query across your whole book — _"show me every chart where Saturn is
  in the 7th and the marriage ended"_ — with n-counts and a chi-square, so an astrologer can do
  real research on their own data.
- **[P]** Scheduling: either a light built-in booking page, or Cal.com/Calendly sync. Don't
  rebuild Calendly; sync with it.
- **[Pro]** Invoicing via Stripe Connect; per-session pricing and payment links.

## F. Learning and interpretation

- **[F]** Every technical term is a hoverable definition. A student should be able to learn
  Jyotiṣa _from_ the tool.
- **[S]** Interpretation library: curated text for placements, yogas, daśā combinations — each
  with its classical citation, each editable and forkable by the astrologer into their own
  voice. **The astrologer's own library is theirs and exports with them.**
- **[Pro]** AI assistant, tightly grounded: it may only reason over the computed factors of the
  chart in front of it, must cite which factors it used, and is blocked from death/health/legal
  topics. Sends only anonymised computed factors — never names, never raw birth data — and only
  with explicit per-workspace consent.
- **[S]** Sanskrit toggle: Devanāgarī / IAST / plain English on every term.

## G. Delight (cheap to build, disproportionately loved)

- Daily "sky note" push: one sentence, personal, accurate.
- Nakṣatra of the day with its deity and śakti.
- Birthday chart card: solar return summary, beautiful enough to send.
- The wheel as a live wallpaper / share image generator.
- **The couple's page** (private link): the two charts, the shared timeline, the kūṭas, the
  anniversary muhūrtas. It's the feature the whole project started as. Ship it as a first-class
  thing, not an easter egg.
