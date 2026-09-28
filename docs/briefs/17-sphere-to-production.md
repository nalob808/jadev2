# 17 — The celestial sphere, from spike to a page users can open

**Paste this path into Claude Code at the repo root and say: read `docs/briefs/17-sphere-to-production.md` and do it.**

Read `docs/10-sphere-spike.md` first — it is the spike's own report, and it contains the
measurements, the astronomy that was verified, and the six things that went wrong. Do not
re-derive any of it.

## What this is, and what it is not

The spike exists, runs, and is correct. Its frame puts Spica at 179.984° under Lahiri, which
is the definition of the zodiac it draws, and its bodies take their longitudes from the same
`transitRing()` that draws the 2D wheel, so the two agree by construction. **None of that is
being rebuilt.**

This is the shortest honest path from "runs at `/spike/sphere` in development on a demo chart"
to "a practitioner can open it on a real chart in production without it embarrassing them".
That is roughly **3–5 days**, not the 7–10 week build the spike report costed. The difference
is that the report's 7–10 weeks assumed the sphere becoming a Professional analysis surface.
It is not that. Per the report's own verdict it is a **presentation surface** — the thing you
turn toward a client and say "this is where Saturn actually is tonight" — and that job needs
correctness, accessibility and a place to live, not a Milky Way.

Read the report's recommendation before starting. It argues that an unrolled ecliptic strip in
SVG would carry most of what the sphere teaches for a tenth of the cost. That argument stands;
this brief is what to do given that the sphere is being shipped anyway.

## Decision already made: it becomes a lens

Do not put the sphere inside the instrument. The instrument page is already 196 kB of first-load
JS and three.js adds about 250 kB more; a single route must carry that cost alone.

Add **an eighth lens** at `/people/[id]/sphere`, and register it in `subjectLenses()` in
`apps/web/src/lib/nav.ts` between `Instrument` and `Timing`, labelled **Sphere**. Read
`docs/11-information-architecture.md` for what a lens is and why the label and the blurb live in
that one file — `nav.test.ts` will fail the build if a route appears without a home there.

The route follows the instrument's URL conventions exactly, so a link from one to the other
keeps the moment: `?t=<days offset from today>` for the time cursor and `?sel=<selection>` for
a highlighted graha (see `apps/web/src/lib/instrumentStore.ts`). Load the scene with
`dynamic(..., { ssr: false })` and confirm with `pnpm build` that no other route's first-load
figure moves.

`/spike/sphere` stays exactly as it is, gated behind `JADE_SPIKES`. It is the side-by-side
comparison page and the place the context-loss buttons live; it is worth keeping for debugging.

### The lens it is cast in has to be printed

`starFrameShift()` takes the workspace's ayanāṁśa, so all eight modes flow through correctly —
and under Fagan–Bradley, Spica will _not_ sit at 180°. That is true rather than broken, and it
is exactly the case CLAUDE.md #3 exists for. Print the ayanāṁśa, the node type and the
precision class on the page, in the same words the wheel uses. A sphere that shows stars beside
grahas without saying which zodiac it drew them in is unusable for the one thing it is good at,
which is being checked against the real sky.

## The five gates before a user sees it

Each of these is a reason the page cannot ship without it, not a nice-to-have. Do all five.

**1. A text alternative that is the data, not an apology (WCAG 1.1.1).**
Render a real positions table under the canvas: graha, sidereal longitude, **ecliptic latitude**,
nakṣatra and pāda, retrograde. Latitude is the whole reason the sphere exists — the wheel has
one scalar per body and nowhere to put a second — so this table is the sphere's payload in text,
and it should be visible by default rather than hidden behind a disclosure. Feed it from
`sphereBodies()`, the same function that places the spheres, and assert equality in a test: the
table and the render must not be able to disagree.

**2. Keyboard operation (WCAG 2.1.1).**
The canvas takes `tabIndex={0}` with a visible focus ring. Arrow keys orbit, `+`/`-` zoom,
`1`/`2`/`3` call the three existing `SphereHandle.view()` positions, `Escape` moves focus out so
a keyboard user is never trapped. Announce the view change through an `aria-live="polite"`
region; announce the date the same way when the cursor moves, which the 2D scrubber already
does — copy that pattern from `TransitScrubber.tsx`.

**3. `prefers-reduced-motion`.**
Check it with `matchMedia('(prefers-reduced-motion: reduce)')` and listen for changes. When set:
`controls.enableDamping = false`, view changes jump rather than fly, and the retrograde path
draws in one step. There is no autoplaying animation on the page, so WCAG 2.2.2 does not apply
and you do not need a pause button — the motion here is camera inertia and a transition, and
turning both off is the whole fix.

**4. A fallback that is useful, not a blank rectangle.**
About 3% of visitors have no usable WebGL, and a lost context is not always restored. Detect
before mounting the scene, and on failure render the existing 2D `Wheel` plus the positions
table from gate 1, with one plain sentence saying the 3D view needs WebGL. Wrap the scene in an
error boundary that falls back to the same thing, so a driver crash degrades instead of
white-screening. `onContextState` already reports `'lost'`; use it.

**5. Phone.**
Test at 390 px. `touch-action: none` on the canvas only, so a one-finger drag orbits without
fighting page scroll, and the page still scrolls everywhere else. The pixel ratio clamp is
already there (1.5 on coarse pointers). Labels at 27 nakṣatras on a 390 px screen will need the
existing opacity smoothstep tightened; the mechanism exists, tune the constant.

## Two loose ends from the report that ride along

**Use the core's nakṣatra names.** `NAKSHATRA_IAST` in `apps/web/src/lib/sky3d.ts` predates
`packages/astro/src/nakshatra.ts`. Delete the local copy and import the core one, so there is
one spelling of Śraviṣṭhā in the codebase.

**Lagna-aligned pole view.** The one genuinely new idea the spike surfaced: rotate the pole view
so the ascendant sits where the wheel puts it. It is a single rotation about +Y by the natal
ascendant longitude, and it is what lets someone read the sphere and the wheel in one frame
instead of translating between two. Add it as a fourth `view()` kind, and make it the default the
page opens on.

## Explicitly not in scope

Do not build any of this, even if it seems close: the Milky Way backdrop, planet surface
textures, any post-processing or bloom pass, GPU tiering beyond the existing pixel-ratio clamp,
`BatchedText` (measure the draw calls first and only touch it if a real device drops frames),
constellation figures, or an orbital/heliocentric mode. Jyotiṣa is geocentric; a sun-centred
orrery shows nothing anyone reads a chart for.

Do not touch `packages/astro`. The sphere is a view; the maths it needs already exists and is
pure.

## Acceptance

A phase is not complete until its tests pass (CLAUDE.md). Write these:

- The positions table's numbers are `sphereBodies()`' numbers, asserted field by field.
- Under `prefers-reduced-motion: reduce`, damping is off and no transition runs.
- With WebGL unavailable, the fallback renders the wheel and the table, and the page does not
  throw.
- The canvas is focusable and an arrow key moves the camera.
- Rāhu and Ketu remain exactly 180° apart on both node types — the existing test, kept.
- `nav.test.ts` stays green with eight lenses, which proves the route has a home in the menu.
- The lens caption states the ayanāṁśa and node type actually used.

Then run `pnpm verify` and fix what it says. Do not commit with a failing gate; `format:check`
now ignores `.next` and `.turbo`, so a failure there is real.

## Update the report

When it is done, add a section to `docs/10-sphere-spike.md` recording that the spike shipped as a
lens, what was cut, and the measured first-load cost of the new route. The report is the memory
of why this exists; leaving it saying "decision pending" is how a decision gets made twice.
