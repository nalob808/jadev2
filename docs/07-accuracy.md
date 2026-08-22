# 07 — The accuracy program

Professionals do not switch astrology software because the UI is nicer. They switch when the
numbers match, and when someone shows them the proof. This document is both an engineering
discipline and a marketing asset — the results get published at `/accuracy`.

## Golden fixtures

`packages/astro/test/fixtures/` contains **200+ charts** stored as JSON: inputs (datetime,
place, settings) plus expected outputs. Sources for expected values, in priority order:

1. **Swiss Ephemeris directly** (`swetest` CLI) for planetary longitudes, houses, ayanāṁśa,
   eclipses — the reference for anything astronomical.
2. **Jagannātha Hora** (free) for vargas, aṣṭakavarga, ṣaḍbala, daśā boundaries, yogas.
3. **VedAstro** (MIT, Docker) as an automated second opinion on kūṭas and daśās.
4. **Published worked examples** from BPHS, Phaladeepika, Jātaka Pārijāta and the standard
   textbooks — cite the book and page in the fixture.

Fixture coverage must include: modern and pre-1900 births; southern hemisphere; equatorial and
high-latitude (60°+) births; births within 4 minutes of a sign cusp; births at exactly midnight
and exactly noon; a DST fall-back ambiguous hour; a wartime double-DST birth; a pre-standard-
time birth requiring LMT; a leap day; a leap second boundary; retrograde stations; an eclipse
day; a graha yuddha; a Kemadruma chart; a vargottama chart; charts for each of the 27 nakṣatras
as the Moon's position.

## Tolerances (CI fails outside these)

| Quantity                           | Tolerance                                        |
| ---------------------------------- | ------------------------------------------------ |
| Sun, Mercury–Saturn longitude      | 1.0″                                             |
| Moon longitude                     | 2.0″                                             |
| Rāhu/Ketu (mean and true)          | 1.0″                                             |
| Ascendant / MC                     | 2.0″                                             |
| Ayanāṁśa                           | 0.1″                                             |
| House cusps (non-whole-sign)       | 2.0″                                             |
| Varga sign assignment              | exact match, no tolerance                        |
| Nakṣatra + pada                    | exact match                                      |
| Daśā period boundaries             | 60 s (given a stated year-length convention)     |
| Ingress / station / lunation times | 30 s                                             |
| Eclipse contact times              | 60 s                                             |
| Sunrise / sunset                   | 30 s (given a stated disc/refraction convention) |
| Aṣṭakavarga bindus, ṣaḍbala rūpas  | exact / 0.01 rūpa                                |

## Property-based tests

Beyond fixtures, assert invariants over random inputs (fast-check):

- Every longitude ∈ [0, 360).
- Ketu ≡ Rāhu + 180° (mod 360), always.
- Every varga function maps [0,360) onto exactly the 12 signs; every division is reachable.
- SAV total across 12 houses = 337 for the standard scheme.
- The sum of all Vimśottarī mahādaśā years = 120 exactly; child periods sum to the parent's
  span to the millisecond; no gaps, no overlaps, at every level.
- Tithi index ∈ [1,30]; karaṇa sequence follows the classical fixed/movable cycle without gaps.
- A chart computed at time _t_ in zone A equals the same chart computed at the equivalent
  instant in zone B.
- Recomputing any chart twice yields byte-identical JSON (determinism).
- The two ephemeris providers agree within the interactive tolerance.

## Cross-tool comparison harness

`scripts/compare.ts` takes a fixture set and produces a diff report against JHora exports and
VedAstro's API. Run it in CI weekly, publish the summary to `/accuracy` with the `astro`
package version stamped on it. When you differ from JHora, **investigate and then write down
why** — often it's a documented convention difference (ayanāṁśa variant, year length, sunrise
model), and documenting those differences publicly is itself the most credible thing on the
site.

## Regression discipline

- The `astro` package version is stored on every computed chart. Bumping it invalidates the
  cache automatically.
- Any calculation bug fix ships with the failing fixture added _first_.
- Visual regression tests on all four chart styles at three viewports.
- A `CHANGELOG-ASTRO.md` written for astrologers, not developers: "v1.4.0 — Bhakūṭa doṣa
  cancellation now also applies when the two rāśi lords are in mutual friendship (option
  `bhakutaCancellation: 'lordFriendship'`, now on by default). Affects matches with 2–12,
  5–9 and 6–8 rāśi pairs. 41 saved relationship readings changed; see the diff report."
