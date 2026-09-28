# Build spec: Jade's visual system

Paste this whole file into Claude Code at the root of the Jade monorepo.

---

You are working on Jade, a professional Vedic astrology platform. Read `CLAUDE.md`
fully before touching code — its six non-negotiables bind everything below, and
in particular #1 (accuracy is the product), #2 (`packages/astro` is pure — no DB,
no network, no React, no `Date.now()` inside functions), #5 (interpretation shows
its factors) and #6 (never predict death, disease or legal outcomes).

This is a large build. Work through it in the order given, commit after each
numbered section, and run `pnpm verify` before every commit.

## What already exists — do not rebuild these

- `packages/astro` — pure sidereal engine wrapping `astronomy-engine`. Computes
  positions, houses, 16 vargas, aṣṭakavarga (bhinna + sarva), ṣaḍbala
  components, 22 yogas, Vimśottarī to 5 levels, transit scanning by bisection,
  `timingSeries` (daśā × transit), `eventSearch` (compound queries).
- `packages/ui` — `Wheel.tsx` (SVG, dṛṣṭi coloured by source graha, dashed
  specials), North/South Indian charts, `VargaGrid`, `DashaColumn`,
  `TimingStrip`, licensed Telllu glyphs in `glyphs.tsx`.
- `packages/interpret` — significations libraries, ~150-term glossary with
  scoped context, house readings, plain-voice reading library.
- `apps/web` — Next 14 App Router, React 18. Design tokens in
  `apps/web/src/app/globals.css`: `--paper --surface --ink --rule --accent
  --jade --clay`, element and nature tints, and `--drishti-*` per graha. Fonts
  are Barlow, Barlow Condensed and IBM Plex Mono.

## The finding this whole build rests on

Competitive research verified the following by inspecting the actual DOM of the
market leader. **Astro-Seek's chart is an external SVG embedded in an
`<object>`, containing zero `<script>` elements.** Its entire interaction
vocabulary is 40 `<title>` tooltips and 14 inline `onmouseover` handlers that
filter one planet's aspect lines. There is no canvas anywhere on the site, no
client-side chart engine, no zoom, no pan, no drag, no selection state, no
keyboard access, and no animation — its "Animate chart" control is a form that
round-trips to the server and returns a new static image.

Five further gaps were verified as genuinely empty across the whole category:

1. **No interactive graphic ephemeris exists anywhere.** The technique is sixty
   years old and is a static raster in Solar Fire, Astro Gold, Sirius and
   Astro-Seek alike. Nobody offers hover-to-identify a crossing, click-to-jump
   to that date, or drag-to-scrub.
2. **Nothing renders the nakṣatra band.** Astro-Seek gives the *Arabic* 28
   lunar mansions a graphic calendar and gives the Vedic 27 nothing. A search
   for an interactive nakṣatra wheel returns Pinterest boards and PDFs.
3. **Aṣṭakavarga is an integer grid everywhere.** A dataset of 8 contributors ×
   12 signs is rendered as a table of numbers, which hides the decomposition
   that is the entire point of the technique.
4. **Daśā is a nested table.** One zoomable implementation exists (Shri Jyoti
   Star, Windows, paid); the one open-source attempt exports an Excel file.
5. **Kakṣā is graphed only in Jagannātha Hora**, on Windows, and nowhere on the
   web at all.

And one cross-cutting principle, which is the most important line in this spec:

> Every good interactive visualisation surveyed — Stellarium Web's reticle, NASA
> Eyes' scrubber, in-the-sky.org's shared date slider — has **one piece of global
> state that every view is a projection of.** Astro-Seek's chart cannot even talk
> to the page it sits on. Build one time cursor and one selection model, make
> every view subscribe to both, and Jade is ahead of the entire category on
> interaction before a single glyph is drawn.

Build that first. Sections are ordered so that nothing later can be built
without it.

---

## 1. The shared instrument state

Create `apps/web/src/lib/instrument.tsx`.

A React context holding exactly two things:

```ts
interface InstrumentState {
  /** The moment every view is showing. Julian Day (UT). */
  readonly jd: number;
  /** What is selected, or null. One selection for the whole app. */
  readonly selection: Selection | null;
}

type Selection =
  | { kind: 'graha'; id: PointId }
  | { kind: 'house'; house: number }
  | { kind: 'sign'; signIndex: number }
  | { kind: 'nakshatra'; index: number }       // 0–26
  | { kind: 'pada'; nakshatra: number; pada: number }  // pada 1–4
  | { kind: 'period'; lords: readonly Graha[] };
```

Requirements:

- **Both live in the URL** as `?t=` (days from today, integer) and `?sel=`
  (a readable encoding like `graha:Saturn`, `nak:12`, `pada:12.3`). Same three
  reasons the wheel's `?g=` already does: reload keeps it, back walks it, a link
  carries the exact view. Follow the existing pattern in `WheelWorkspace.tsx`.
- **A local override during drag.** Writing the URL at 60fps would leave a
  hundred history entries. Hold a live value in state while dragging, commit on
  release. `WheelWorkspace.tsx` already does exactly this for the scrubber —
  reuse the shape.
- `useInstrument()` returns `{ jd, selection, setJd, setSelection, isDragging }`.
- Nothing in this file may read a clock. `todayJd` is a prop supplied by the
  page, as everywhere else in Jade.

Test: setting a selection and reloading restores it; dragging does not write
history; a malformed URL value degrades to the default rather than throwing.

## 2. The nakṣatra ring

New: `packages/ui/src/charts/NakshatraRing.tsx`.

This is the feature nobody else has and it should become Jade's signature image.

A 360° SVG band. Requirements:

- **27 nakṣatra divisions** at 13°20′ each, each subdivided into **4 padas** at
  3°20′. Pada boundaries are the finest division shown and must be exactly
  right — a wrong Rohiṇī boundary in a professional Vedic app is worse than no
  ring at all.
- Each nakṣatra labelled, with its **ruling graha** shown. Use IAST
  romanisation (Aśvinī, Bharaṇī) — see §6 on why not Devanagari here.
- **Live and natal positions plotted on the band**, with natal fixed and transit
  positions moving with the instrument's `jd`.
- **Tārā-bala shading relative to the natal Moon** — the nine tārās repeat three
  times across the 27, and Jade already computes this in
  `packages/astro/src/dayQuality.ts` (`TARAS`, `taraBala`). Reuse it; do not
  recompute.
- **Semantic level-of-detail, not generic collision detection.** At the default
  zoom show the 12 signs and the 27 nakṣatra names. Reveal pada numbers and
  attributes only on zoom or for the selected arc. This is important: 27 labels
  is one every 13.3°, and crowded labels are the single clearest tell of an
  amateur visualisation. Because these labels sit on a ring, spacing is a 1D
  problem you can solve analytically — do not import a 2D collision library.
- **Clicking a nakṣatra or pada sets the app's selection** and every other view
  responds.
- **Gaṇa, yoni and nāḍī** for the selected nakṣatra, shown in the detail panel
  rather than on the ring.

Why this matters, so you make the right calls under pressure: nakṣatra and pada
are load-bearing in Jyotiṣa — they drive Vimśottarī, tārā-bala, muhūrta and
matching. A ring makes visible the structure every other view is derived from,
so a user can finally see *why* their daśā sequence starts where it does.

## 3. The graphic ephemeris — with the nakṣatra fold

New: `packages/ui/src/charts/GraphicEphemeris.tsx` plus whatever pure series
computation it needs in `packages/astro/src/transits/`.

The classic professional visual, made interactive for the first time in the
category. Time on x, longitude on y, planets as curves, natal points as
horizontal reference lines. A crossing is an aspect.

- **Selectable modulus.** 360° (plain), 30° (the rāśi fold), and — the part that
  does not exist anywhere — **13°20′, the nakṣatra fold.** Folding longitude mod
  13°20′ makes every nakṣatra-level contact a line crossing. This imports a
  proven cosmobiology technique (the 45° dial) into a tradition that never
  received it, and it is exactly how a Vedic astrologer reasons about gocara.
  Treat it as the centrepiece.
- **Hover a crossing → name the contact.** Which transiting body, which natal
  point, which nakṣatra, the date.
- **Click a crossing → set the instrument's `jd`.** Every other view flies to
  that moment. This is the gesture that turns a picture into an instrument.
- **Drag the time cursor** to scrub, with the wheel beside it updating live.
- Retrograde must read as a curve turning back on itself — do not smooth it away.
- Natal reference lines keyed by colour to a legend column, the convention
  professional tools already use.
- Computation belongs in `packages/astro` as a pure function taking a window and
  a step; only the rendering lives in `packages/ui`.

## 4. Aṣṭakavarga as data graphics

New: `packages/ui/src/charts/AshtakavargaView.tsx`.

Three views of data Jade already computes in `packages/astro/src/ashtakavarga.ts`:

- **SAV as a radial profile** around the rāśi ring, so house strength reads as a
  shape rather than twelve numbers. Sarva totals 337 across twelve signs — scale
  against that, and label the actual values.
- **BAV as small multiples** — eight small charts, one per contributor, so a
  reader can see *who* supplies the bindus. This is the whole argument: a single
  SAV of 28 hides whether the strength comes from benefics or malefics, and the
  grid makes that decomposition invisible.
- **The kakṣā transit band.** A horizontal band per slow graha, each divided into
  its eight kakṣās over time, shaded by whether the transiting graha currently
  occupies a bindu-bearing kakṣā. **Jade does not compute kakṣā yet** — you will
  need to add it to `packages/astro/src/ashtakavarga.ts` first: each sign divides
  into eight kakṣās of 3°45′, each belonging to one of the eight contributors,
  and the transit is scored by whether the occupied kakṣā holds a bindu in that
  graha's bhinnāṣṭakavarga. Add it as a pure function with golden-fixture tests
  before drawing anything.

Only Jagannātha Hora graphs kakṣā at all, on Windows. This is the strongest
professional differentiator available.

## 5. The daśā timeline

New: `packages/ui/src/charts/DashaTimeline.tsx`.

Vimśottarī as a proportional, horizontally zoomable timeline — mahādaśā →
antardaśā → pratyantardaśā — from a 120-year overview down to a single week.

- **Proportion is the point.** A table cannot show that Rāhu gets 18 years and
  the Sun 6, nor where you are inside a period. Widths must be true to duration.
- Zoom and pan; the instrument's `jd` is the cursor.
- **Nested levels revealed by zoom**, not by expanding rows.
- **A strength band underneath** showing transit or aṣṭakavarga context, so a
  reader can see coincidence between a daśā change and a transit.
- **Life events pinned on it**, read from the existing `notes` table where a note
  has a date. This is the retention argument: event annotation turns the timeline
  from a lookup into evidence, and it is the feature most likely to make a
  practitioner keep their client records in Jade.

## 6. Rules that apply to every view above

**Accessibility is not optional and it is cheap here.** The underlying data is
nine bodies and twelve houses — a handful of numbers. For every visual:

- Render real SVG with real DOM nodes, so screen readers and keyboard navigation
  work natively. Do not use canvas for any of §2–§5.
- A parallel `<table>` of the same data, visually hidden but reachable, as
  Highcharts' accessibility module does.
- Keyboard: arrows step the selection, `[` and `]` scrub time, `Esc` clears.
  Expose all of it as real DOM controls too — keyboard handling with no visible
  control is undiscoverable.
- `prefers-reduced-motion: reduce` disables transitions and any auto-play, but
  never disables the feature. Dragging a slider is direct manipulation and stays.
- Anything that auto-animates needs a visible pause control (WCAG 2.2.2, Level
  A). The "essential motion" exemption does not apply, because a static view
  carries identical data.

**Typography.** Use IAST romanisation inside any chart — Aśvinī, Bharaṇī, Kṛttikā.
Devanagari belongs in DOM text where the browser's own text engine shapes it
correctly. Broken conjuncts or misplaced mātrās in a professional Vedic app
destroy credibility in a way a dropped frame never will.

**Correctness your users will check**, in the order they will check it: the
ayanāṁśa in use and its value for the date; whether Rāhu and Ketu are exactly
opposite (if a render ever shows otherwise, that is a visible bug); retrograde
indication; nakṣatra and pada boundaries; whether planets show true latitude or
are flattened onto the ecliptic. State the frame on screen.

**Do not introduce a charting library.** Everything here is hand-written SVG in
the existing style. `Wheel.tsx` is the reference for conventions: `var(--token,
#fallback)` colours, `data-*` attributes on encoded elements so tests can assert
the encoding rather than screenshot it, and a `<title>` child for hover text.

**Tests.** Every encoding asserted in the DOM, never by screenshot. A screenshot
test fails on every legitimate palette change and passes on a dṛṣṭi drawn in the
wrong colour. Follow `apps/web/src/lib/drishtiEncoding.test.tsx` — and note the
lesson recorded in it: its first version passed while checking nothing, because
the layer under test was off by default. Make sure the thing you are asserting
about is actually rendered.

---

## Order of work, and what to do if time runs short

`1 → 2 → 5 → 4 → 3`

Section 1 unblocks everything. Section 2 is the signature image and the clearest
differentiator. Section 5 is the highest retention value. Section 4 is the
strongest professional argument. Section 3 is the most technically involved and
the most likely to overrun — if it slips, the other four still ship a product
nobody else has.

Do not start §3 until §1 is tested and committed.
