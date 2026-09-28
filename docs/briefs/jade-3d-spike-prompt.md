# Build spec: the 3D celestial sphere — a 3-to-5 day spike, not a commitment

Paste this into Claude Code at the root of the Jade monorepo.

**Read this framing first, and do not skip it.** A polished, accessible,
well-degrading version of this feature is a 7-to-10 week build. This spec is for
a **3-to-5 day spike** whose only job is to produce something Nalu can look at
and judge before that money is spent. Build it rough, build it fast, and do not
polish. The dangerous outcome is the two-to-three week version: fine in a demo,
embarrassing in production, and most projects ship exactly that.

Do not build a heliocentric solar system. Jyotiṣa is geocentric and reads ecliptic
longitude; a sun-centred orrery is beautiful and shows nothing anyone reads a
chart for. Build the sky as the tradition conceives it: **the viewer at the
centre, the ecliptic as a band, the nakṣatra divisions on it, planets riding it.**

---

## What exists already

`packages/astro` is a pure TypeScript sidereal engine wrapping `astronomy-engine`.
It computes sidereal ecliptic longitudes for the Sun, Moon, Mars, Mercury,
Jupiter, Venus, Saturn, Rāhu and Ketu at any Julian Day, and it runs in the
browser — `apps/web/src/lib/transitRing.ts` already does exactly that for the 2D
scrubber. Read that file first; it is the pattern to follow, including its note
about interactive vs reference precision class.

## Decisions already made for you — do not relitigate these

These were researched. Taking them on trust will save you two days.

**Use plain `three.js`, imperatively, in a `'use client'` component. Do not use
react-three-fiber.** Three reasons, in order of weight:

1. **R3F v9 requires React 19.** Jade is on React 18 / Next 14. On React 18 you
   are pinned to R3F 8.18.0 + drei 9.122.0, both frozen since February 2025.
   Choosing R3F here means either shipping dead dependencies or bundling a React
   19 + Next 15 migration into a spike.
2. **R3F defeats three.js tree-shaking.** Its dist namespace-imports all of three
   to build its JSX catalogue. Measured: hand-rolled three with named imports is
   ~141 KB gzip; R3F + three is ~278 KB. The ~90 KB penalty is structural.
3. This scene is static structure plus per-frame transform mutation — exactly
   where React's declarative model adds least.

**Do not use Babylon.js.** `@babylonjs/core` unpacks to ~72 MB. For a 61-draw-call
scene it is categorically the wrong tool.

**SSR:** `three` imports fine on the server; only `new THREE.WebGLRenderer()`
needs a browser. The widely repeated claim that three touches browser APIs at
import time is false for current versions. Still use `dynamic(..., { ssr: false })`,
but for bundle-size reasons rather than the reason you will read online.

**The star field must be a `Points` cloud, not a texture.** Use
[brettonw/YaleBrightStarCatalog](https://github.com/brettonw/YaleBrightStarCatalog)
— **MIT licensed**, 9,096 stars. Parse RA/Dec/Vmag, pack to binary (uint16 RA,
int16 Dec, uint8 mag = 5 bytes/star). Measured sizes gzipped: magnitude ≤6.0 is
5,080 stars at **24.5 KB**; ≤6.5 is 8,404 stars at **40.4 KB**. The entire
naked-eye sky in one draw call, sharp at every zoom, and astronomically correct —
which matters here, because users will look for Citrā/Spica and Rohiṇī/Aldebaran
against the planets. A blurry 4K star JPEG would be larger *and* worse.

Do **not** use the HYG database for this: it is CC BY-SA 4.0, and the ShareAlike
attaches to the data you would ship. MIT with 9,096 naked-eye stars strictly
dominates BY-SA with 120,000.

**Skip planet textures.** At the scale planets appear on a celestial sphere they
are a few pixels — a textured sphere is indistinguishable from a coloured disc
with a soft glow. If you later want them,
[Solar System Scope](https://www.solarsystemscope.com/textures/) is CC BY 4.0 and
explicitly commercial with attribution; use 1–2K, never 8K.

## The scene, and its real budget

Computed from actual three.js geometry: **~61 draw calls, ~8,240 triangles.** A
2018 mid-range Android handles that at 60fps without effort. **Performance is not
your risk.** Where time actually goes:

1. **Fill rate is your highest-leverage lever.** iPhone-class at dpr 3 is 2.12
   Mpx/frame; clamped to 1.5 it is 0.53. Four times the work for almost no visual
   gain on a vector scene. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`,
   1.5 on mobile. **Do not add a bloom or glow post-process pass in the spike** —
   that is where naive celestial scenes die.
2. **`troika-three-text` label jank.** SDF generation runs in a worker but is
   async; 48 labels popping in late looks cheap. Call `preloadFont()` before first
   render and never read `textRenderInfo` synchronously.
3. **Label draw calls.** Each `Text` is a mesh, so 48 labels is 48 calls. troika
   exports `BatchedText`, which collapses them to one — but it is **undocumented
   in the README**, requires WebGL2 or `OES_texture_float`, and ignores each
   child's own material. Prototype it early or skip it in the spike.

## What to build, in this order

1. A `'use client'` component, dynamically imported, that creates a renderer in
   `useEffect`, handles resize, and disposes properly on unmount. Handle
   `webglcontextlost` — call `preventDefault()` so restore can happen — and
   `webglcontextrestored`. Context loss is routine on mobile.
2. `OrbitControls` from `three/examples/jsm`, damped, with zoom limits.
3. The ecliptic band as a `RingGeometry(9.6, 10, 360, 1)`, oriented correctly for
   the sidereal frame. **Getting the orientation right is the one piece of real
   astronomy here** — the band must agree with the 2D wheel for the same moment,
   and that agreement is the first thing to test.
4. Sign and nakṣatra dividers as a single `LineSegments`.
5. The nine bodies as small spheres at their sidereal longitudes, coloured from
   Jade's existing `--drishti-*` tokens so the 3D view and the wheel agree.
6. The star field from the Yale catalogue as `Points`, size and brightness from
   magnitude.
7. Labels — 12 signs first. **Add the 27 nakṣatra labels last**, and expect them
   to be the problem.
8. Time scrubbing: reuse `apps/web/src/lib/transitRing.ts`'s approach. Only
   transit positions recompute; nothing else in the scene moves.

## The thing that will make it look amateurish

Nothing in the list above is hard. The risk is entirely aesthetic, and it has one
dominant face:

**Label crowding.** 27 nakṣatras is a label every 13.3°. At any foreshortened
camera angle they collide, overlap and flicker, and that reads as amateur more
than anything else you could do wrong. **Do not reach for a generic 2D collision
library.** These labels sit on a ring, so spacing is a 1D problem: compute
angular separation analytically and use **semantic level-of-detail** — 12 signs
by default, nakṣatras revealed on zoom or only on the near arc. Fade, never
binary on/off, or they flicker during rotation. Solved this way it looks
deliberate rather than algorithmic.

Three smaller faces: default three.js materials and `0xffffff` lines look exactly
like a tutorial, so take line weights and palette from `globals.css`; use
**IAST romanisation** in the 3D layer, because troika ships `bidi-js` but not
HarfBuzz-class shaping and Devanagari conjuncts are likely to render wrongly; and
**Rāhu and Ketu must be exactly 180° apart** — if the render ever shows otherwise
that is a visible bug in a professional Vedic app.

## What the spike does NOT need

Skip all of this. It is what the remaining 5–8 weeks would buy, and including it
now defeats the purpose of a spike.

- Accessibility layer, parallel data table, keyboard navigation
- `prefers-reduced-motion` handling, low-power tiers, `detect-gpu`
- A 2D fallback for the ~3% without WebGL
- The Milky Way backdrop
- Mobile and iOS Safari tuning
- Visual polish of any kind

## How to judge it

Show Nalu the spike beside the existing 2D wheel for the same moment and ask one
question: **does the sphere teach something the wheel does not?**

The honest case for yes: geocentric viewer-at-centre spatial intuition, real
declination (planets are *near* the ecliptic, not on it), planets against actual
stars, and the retrograde loop as visible geometry rather than a curve on a graph.

The honest case for no: the data is one scalar per body — ecliptic longitude —
which is one-dimensional data wrapped on a circle. An SVG ring conveys 100% of it
with crisp text at every zoom, native screen-reader support, ~10 KB instead of
~140, no thermal cost, and it prints. The sphere is enrichment, not the data.

Either answer is a good outcome for five days' work. Write down which one it is
and why, in `docs/` , before anyone decides.
