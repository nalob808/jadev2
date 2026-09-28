# The 3D celestial sphere — spike report

**Status:** spike complete, decision pending. Brief: `docs/briefs/jade-3d-spike-prompt.md`.
**Where:** `pnpm dev`, then <http://localhost:3100/spike/sphere>. Off in production unless
`JADE_SPIKES=1`.

The spike had one job: put a rough 3D sphere beside the existing 2D wheel for the same
moment, so Nalu can answer one question before 7–10 weeks are spent on the real thing:
**does the sphere teach something the wheel does not?**

This document is the spike's own answer and the evidence for it. It is a recommendation,
not the decision — the decision is made by looking at the page.

---

## Recommendation

**Narrowly yes, and still don't build the 7–10 week version.** The sphere does teach three
things the wheel cannot, but two of them can be had in 2D for a small fraction of the cost,
and the third doesn't pass the $100 test.

What the sphere shows that the wheel does not, seen on the running page:

1. **Latitude.** On 15 Feb 2027, Mars is retrograde at 8°12′ Siṁha and about 4° _north_ of
   the ecliptic. Venus sat 6.5° south on the spike's first day. The wheel has one scalar
   per body and nowhere to put a second. This is not just decoration: classical graha-yuddha
   rules decide the winner partly by which graha lies to the north, and Rohiṇī-śakaṭa-bheda
   is a latitude question too. (Both are worth checking against the texts before anything
   is built on them.)
2. **The retrograde loop as geometry.** The ±120-day track closes into a loop because
   latitude keeps changing while longitude reverses. The wheel shows only the backwards half.
   This is the most striking thing on the page.
3. **Real stars behind the grahas.** Ketu sits 2° from Regulus (Maghā's yogatārā). Citrā
   lands on Spica. It is satisfying, and it builds trust with anyone who checks it against
   the sky.

What it does not do: save a working astrologer an hour, or let them charge more for
analysis. Every number on the sphere is already on the wheel or can go in the positions
table. Where it could earn money is **in the room with a client**, as a presentation surface
("this is where Saturn actually is tonight"). That is a consumer/client-facing feature, not
a Professional-tier one.

**The cheaper route to 1 and 2:** an **unrolled ecliptic strip** — an SVG of longitude
(0–360°, nakṣatra and rāśi ticks) against latitude (±8°), with the bright stars near the
ecliptic plotted as dots. It shows latitude, draws retrograde loops as real loops, puts
Regulus beside Ketu, prints, is accessible, needs no WebGL, and costs roughly the 10 KB the
wheel costs, not 250 KB. Add a latitude column to the positions table alongside it. That is
perhaps a week's work, and it keeps nearly all of what the sphere teaches.

If the sphere is still wanted afterwards, it is a consumer-tier or client-presentation
feature, and this spike is its starting point.

---

## What was built

| Piece                               | Where                                                         |
| ----------------------------------- | ------------------------------------------------------------- |
| The maths (no three.js, tested)     | `apps/web/src/lib/sky3d.ts`, `sky3d.test.ts`                  |
| The scene (plain three, imperative) | `apps/web/src/components/CelestialSphere.tsx`                 |
| Sphere + wheel + one scrubber       | `apps/web/src/components/SphereSpike.tsx`                     |
| The page (dev only)                 | `apps/web/src/app/spike/sphere/page.tsx`                      |
| Palette mirror + drift test         | `apps/web/src/lib/skyPalette.ts`, `sky3d-palette.test.ts`     |
| Star catalogue packer               | `scripts/build-star-catalogue.ts` → `public/sky/bsc-v6.0.bin` |
| IAST font subset                    | `public/sky/fira-sans-condensed-500-iast.woff`                |

The page is built on the public reference chart (7 Nov 2001, Ann Arbor, the same one the
marketing hero draws), so it touches no workspace or birth data. The only change to existing
code is that `providerFor` in `transitRing.ts` is now exported.

The decisions in the brief were followed as written: plain `three` with named imports and no
R3F, no Babylon, `dynamic(..., { ssr: false })` for bundle reasons, the Yale catalogue (MIT)
rather than HYG, no planet textures, no post-processing, pixel ratio clamped to 2 (1.5 on
coarse pointers), context loss handled, OrbitControls damped and limited.

## The astronomy — the one piece of real work

The scene sits in the **sidereal ecliptic of date**: ecliptic = XZ plane, +Y = north
ecliptic pole, Aśvinī 0° on +X, longitude counter-clockwise seen from the north pole (the
same sense as the wheel).

- **Bodies** take their longitude from `transitRing()`, the very function that draws the
  wheel's outer ring, so the two views agree _by construction_ (tested with exact equality).
  Latitude comes from the same provider. Rāhu and Ketu are exactly 180° apart on both node
  types (tested), and a dashed nodal axis through the viewer would visibly miss the centre if
  they ever weren't.
- **Stars** are J2000 equatorial. Each one is rotated onto the J2000 ecliptic, then shifted by
  general precession minus the mean ayanāṁśa. Nutation cancels exactly out of a sidereal
  longitude, so the stars (mean equinox) and the planets (true equinox) meet in the same
  frame. For Lahiri the shift is constant to <0.01° across 1900–2100 (tested); that is the
  definition of a sidereal zodiac.
- **The check that matters:** Lahiri is _defined_ by Citrā/Spica at 180°. The frame puts
  Spica at **179.984°**. Regulus comes out at 125.97° (5°58′ Siṁha), Antares at 225.9° and
  Aldebaran in Rohiṇī. A wrong axis, sign or epoch anywhere would have broken the Spica test.
- The **celestial equator** is drawn dashed. It crosses the band at the tropical equinox,
  ~335.8° sidereal, and the gap from there to Aśvinī 0° _is_ the ayanāṁśa, drawn. That makes
  it a good teaching image.
- **Precision class: interactive.** It inherits `transitRing`'s class and additionally ignores
  proper motion, annual aberration and ecliptic tilt for the stars, which together stay under
  about a minute of arc within a century of J2000. Nothing on the page is saved or printed.
- Only Lahiri (and custom) are fitted in the core, so that is what the page uses. The node
  type is a visible toggle.

## Measured

| Measure                           | Brief's estimate | Spike                                                                            |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| three + OrbitControls, gzip       | ~141 KB          | **140 KB** (esbuild, named imports)                                              |
| troika-three-text, gzip           | —                | **+43 KB** (183 KB with three)                                                   |
| Star file ≤ V 6.0                 | 5,080 / 24.5 KB  | 5,080 stars / **29.8 KB** gzip (6 B/star: +1 byte colour temperature)            |
| IAST font                         | —                | **31.6 KB** woff                                                                 |
| Triangles                         | ~8,240           | **~7,800–8,030** outside; ~4,600 from the centre                                 |
| Draw calls                        | ~61              | **99–105** outside; ~33 from the centre (every troika label is its own mesh)     |
| Scrub step (dev build)            | —                | **2.4 ms** median, 6.5 ms p95, across 60 steps, including the 2D wheel re-render |
| Path recompute (5 bodies, ±120 d) | —                | ~30 ms, so done on release rather than every frame                               |

Rendering is on demand: nothing is drawn unless the camera, the date or a label changes, so a
still sphere costs nothing. **Performance is not the risk, as the brief said.** The first-view
cost is about 250 KB over what the wheel page already ships (astronomy-engine is already there
for the scrubber).

## What went wrong, and what that predicts for the full build

1. **Barlow Condensed has no underdotted IAST glyphs.** ṣ ṇ ṭ ḍ ṛ ḥ ṁ ṅ are missing. Troika has
   no system fallback, so labels like Puṣya came out broken. The sphere uses a Fira Sans
   Condensed subset instead, which covers every rāśi, nakṣatra and graha name (it lacks only ṝ
   and ṃ). **This affects the whole app:** the 2D UI is silently falling back to a system font
   for these characters today. Worth a separate look.
2. **A flat `RingGeometry` band is invisible from the centre.** The spec's viewer-at-centre view
   sees the annulus edge-on, and radial dividers too. Fixed by crossfading to a ±1° spherical zone
   as the camera moves in, and by drawing each divider twice (radial + meridian) in the one
   `LineSegments`.
3. **World-sized planets turn into blobs from inside.** Bodies and labels now hold a constant
   pixel size at any distance. That is what makes one scene work from both the centre and the
   outside.
4. **Label crowding was exactly as bad as predicted, and the 1D approach worked.** Each ring
   label's opacity is a smoothstep of _(screen distance to the nearer neighbour) ÷ (space the
   pair needs)_. Nakṣatras also fade in only on the near arc and when zoomed. Nothing flickers
   in rotation. The surprise was the _second_ collision: **graha labels against rāśi labels**,
   which hid Śani's "R" on the first render (a correctness problem, not a cosmetic one). Graha
   labels now never fade and stack upward in screen space, and ring and star labels yield
   smoothly to their boxes. The cost is that a rāśi name disappears when a graha sits on it.
5. **three resets the clear colour on context restore.** The sky came back black. Found with the
   page's own "Lose context / Restore" buttons and fixed.
6. **`BatchedText` was not attempted.** With ~57 labels the draw-call count roughly doubled from
   the estimate. Harmless here; a full build should prototype it.
7. **Test note:** a hidden browser tab gets no `requestAnimationFrame`, so an on-demand renderer
   reports nothing until it is visible. That is correct behaviour, but any automated visual test
   has to foreground the page.

Also noticed, not caused by the spike: the existing `Wheel` has a **hydration mismatch** where its
SVG path strings differ in the last float digit between server and browser trig. Rounding the
coordinates would fix it.

## What was deliberately skipped (per the brief)

Accessibility layer, data table, keyboard navigation, reduced motion, GPU tiers, 2D fallback,
Milky Way, mobile/iOS tuning, polish. Also skipped: rotating the pole view to put the lagna on
the left as the wheel does, which would make side-by-side comparison easier if this goes
further. `NAKSHATRA_IAST` is defined in `sky3d.ts`; a core version has since appeared in
`packages/astro/src/nakshatra.ts` and should replace it if the spike is kept.

## If the answer is "build it anyway"

Start from this code, not from scratch. The remaining weeks go on everything in the skipped
list above plus `BatchedText`, and on the one new idea the spike surfaced: lagna-aligned
orientation, so the sphere and the wheel can be read in the same frame.
