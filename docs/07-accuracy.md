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

## What is NOT verified, and how to verify it

Two pieces of the calculation spec are deliberately unbuilt because they
could not be checked against an authority. Each is listed with the check that
would let it ship.

| Missing               | Why it is not guessed                                                                                          | How to verify before writing it                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ṣaḍbala**           | Six sources with twenty sub-components, and authorities differ on at least half. See the reconnaissance below. | Verify **per sub-component**, not per bala. `jhora.horoscope.chart.strength` exposes every one as a callable, so a disagreement localises to a single rule. |
| **East Indian chart** | The Bengali sign arrangement could not be confirmed.                                                           | Render the same chart in Jagannātha Hora's Bengali style and match cell by cell.                                                                            |

### The oracle, and the line around it

`PyJHora` is a Python port of Jagannātha Hora and covers every row above:
aṣṭakavarga, ṣaḍbala, 1041 yoga routines, aṣṭakūṭa compatibility and doṣa. It
is installable (`pip install PyJHora`) and it agrees with Jade exactly.

Validated on 2026-08-23 across 17 of the 18 golden fixtures — seven grahas
each, ayanāṁśa and ascendant included:

    worst planet disagreement:  0.0000 arcsec
    ayanāṁśa disagreement:      0.0001 arcsec

That is not approximate agreement; it is the same Swiss Ephemeris underneath,
reached by two independent code paths. Which makes it a usable oracle: it can
be trusted to be a correct _reference_, so a disagreement on a derived table is
a bug in Jade's technique, not noise in the positions.

Two conditions make the comparison meaningful, and both must be set:

1. **Ayanāṁśa mode `LAHIRI`.** Its default is `TRUE_PUSHYA`.
2. **`PLANET_FLAGS` without `SEFLG_TRUEPOS`.** Its default is true positions,
   Jade's is apparent — see the section below. Left alone, every comparison is
   off by up to 55″ and the real technique bugs hide inside that.

The eighteenth fixture, `arctic-tromso`, cannot be compared: PyJHora computes
the ascendant through Placidus, which is undefined above the Arctic Circle, and
`swe.houses_ex` errors. Jade uses whole-sign and returns a correct ascendant
there, which is why that fixture exists.

**PyJHora is AGPL-3.0, and must never enter Jade.** Linking it — even
server-side, even privately — is exactly the trap Swiss Ephemeris sets: the
network clause would oblige Jade to be released in full. The line Jade holds:

- It is a **developer tool**, run in a container to emit fixture JSON. It is
  not a dependency of any package, is never installed by `pnpm install`, and no
  Jade code imports it.
- Techniques are implemented **from the classical sources** — BPHS and its
  commentaries — and then _checked_ against the oracle. Its code is not read
  for logic and not transcribed.
- What lands in the repository is **numbers**: computed values for specific
  moments. Facts about a chart, not expression.

That is the same relationship Jade already has with Swiss Ephemeris, which is
also AGPL and also generates the golden fixtures. The professional licence on
the pre-launch checklist is for _shipping_ Swiss Ephemeris; neither licence is
triggered by generating fixtures with it. If that reading ever needs to be
firmer than a careful reading, it is a question for a lawyer before launch, not
after.

### Apparent versus true positions

Jade and Jagannātha Hora disagree, on purpose, about what a graha's position
means.

Jade computes **apparent** positions — light-time, annual aberration and
gravitational deflection applied. That is the astronomical standard, what Swiss
Ephemeris returns by default, and what most Jyotiṣa software uses. Jagannātha
Hora computes **true** (geometric) positions: `SEFLG_TRUEPOS`, where the graha
actually is at that instant.

Measured across the golden fixtures, worst case:

| Moon  | Sun    | Saturn | Jupiter | Mars   | Venus  | Mercury |
| ----- | ------ | ------ | ------- | ------ | ------ | ------- |
| 0.75″ | 20.83″ | 27.07″ | 29.18″  | 37.99″ | 44.77″ | 55.34″  |

Just under an arcminute at the extreme. No sign, house, nakṣatra or varga
changes. A degree printed to the minute can differ by one — and a practitioner
checking Jade against the tool they already trust will notice, so the setting
is named, persisted with the chart, and shown.

`positionBasis: 'true'` is **not implemented on the astronomy-engine
provider**, and throws there rather than approximating. The geometric route
available to it — differencing heliocentric vectors — lands within 0.35″ on the
Sun but drifts past 20″ on the outer planets, and `GeoMoon` is not a geometric
position at all. A basis wrong by 20″ that exists to close a gap of 55″ trades
one disagreement for another while looking authoritative. It belongs on the
swisseph provider, where it is a single flag, and can ship the day the
professional licence is bought.

## Aṣṭakavarga — shipped, and what it cost

The prediction in the table above was that recalling the tables approximately
"produces a chart that totals correctly and is wrong row by row". That is
exactly what happened, and it is worth recording because it is the argument for
the whole verification programme.

Of the 64 rows written from the classical text, 60 were right and four were
not:

| Table | Row          | Written          | Correct    | Caught by      |
| ----- | ------------ | ---------------- | ---------- | -------------- |
| Venus | from Mars    | house 5          | house 4    | totals check   |
| Moon  | from Moon    | missing house 9  | includes 9 | **the oracle** |
| Moon  | from Mars    | spurious house 9 | omits 9    | **the oracle** |
| Moon  | from Jupiter | house 12         | house 2    | **the oracle** |

The Venus slip broke the 52-bindu total and the cheap internal check found it.
The three Moon slips **cancelled**: the row still summed to 49, the
sarvāṣṭakavarga still summed to 337, every internal invariant held, and the
chart looked entirely plausible. Nothing short of a diff against a reference
implementation would have found them.

Localising them took the oracle in a second mode. `av.get_ashtaka_varga` takes
a sign placement directly, so 60 synthetic placements give an overdetermined
linear system in the 96 unknowns of one table, solved exactly and returning
binary values. The recovered tables reproduced all eight classical totals —
48, 49, 39, 54, 56, 52, 39 and the ascendant's 49 — which were not inputs to
the fit. Each of the four corrections was then checked against the classical
reading before being accepted.

Both modes are guarded in CI: the fixtures are regenerated and diffed, so a
PyJHora upgrade that changes a number fails the build rather than quietly
rewriting the reference.

## Yogas — twelve of sixteen agree exactly, and the other four are explained

A curated set: the five Pañca Mahāpuruṣa, gajakesarī, budhāditya, candra-maṅgala,
adhi, the lunar quartet (sunaphā / anaphā / durudhurā / kemadruma), the solar
trio (veśi / vāsi / ubhayacharī), the three viparīta rāja yogas under their own
names — harṣa, sarala, vimala — and nīcabhaṅga. Not the ~260 in circulation:
most are cited without their cancellation rules, and a yoga list without
cancellations is astrologically dishonest.

Three differences from Jagannātha Hora turned out to be **definitional, not
arithmetical**, and each is now a named option rather than a silent choice:

| Option                | Parāśara (Jade's default)       | Jagannātha Hora                     |
| --------------------- | ------------------------------- | ----------------------------------- |
| `nodesCountAsGrahas`  | seven grahas only               | Rāhu and Ketu count too             |
| `sunSpoilsLunarYogas` | the Sun is simply not counted   | the Sun's presence spoils the house |
| `lunarSolarReporting` | both sides occupied ⇒ durudhurā | reports all three at once           |

`JHORA_COMPATIBLE` turns all three on, and is worth surfacing as a "match
Jagannātha Hora" toggle for a practitioner reconciling Jade against the tool
they already use. Under it, **twelve of the sixteen yogas agree on every one of
the seventeen charts** — including all five Pañca Mahāpuruṣa and the entire
lunar set.

Finding those three took the oracle used as a hypothesis test. Four candidate
readings were scored against sunaphā and anaphā over seventeen charts:

    +nodes, Sun spoils      34/34      7 grahas, Sun spoils    32/34
    +nodes                  33/34      7 grahas, excl. Sun     31/34

That is a definition recovered by measurement rather than guessed at.

The comparison also found a real bug in Jade. Under the strict reading the
Sun's presence stops the _named yoga_ forming — but the grahas standing there
are still standing there, and kemadruma asks whether the Moon is **alone**, not
whether anaphā formed. Conflating the two reported a solitary Moon flanked by
Mars and Mercury.

### The four that do not reconcile

Pinned as tests with their explanations, so a change in either implementation
resurfaces them:

- **kemadruma** (3 charts) — the Moon really is unattended _and_ a classical
  cancellation applies. JHora folds the cancellation into the boolean and
  answers "no". Jade reports the yoga **and** its cancellations, which is
  strictly more information: the practitioner sees the condition and the relief.
- **gajakesarī** (3 charts) — BPHS gives it as Jupiter in a kendra from the
  Moon, which is what Jade implements. Jupiter _is_ in a kendra on all three and
  JHora still declines, so it applies further conditions its API does not
  expose. Jade will not guess at them.
- **veśi and vāsi** (1 chart each) — the house is empty of every body including
  the nodes, and JHora reports the yoga anyway. Whatever produces that is not
  the rule in the text, so Jade does not copy it.

## Ṣaḍbala — the reconnaissance, before the build

`strength.shad_bala` returns only six aggregates plus totals, and matching an
aggregate means guessing conventions for every sub-component inside it until
the number agrees. That is fitting to a tool, not implementing from a text, and
it is how a plausible-but-wrong ṣaḍbala gets shipped.

The module exposes each sub-component separately, which changes the problem
entirely — a disagreement localises to one rule:

    _uchcha_bala  _sapthavargaja_bala  _ojayugama_bala  _kendra_bala
    _drekkana_bala  _dig_bala  _nathonnath_bala  _paksha_bala
    _tribhaga_bala  _abda_bala  _masa_bala  _vaara_bala  _hora_bala
    _ayana_bala  _yuddha_bala  _cheshta_bala  _naisargika_bala  _drik_bala

Two findings worth having before writing a line:

**The disputes are visible in the API itself.** There is `_dig_bala(method=1)`
and `method=2`; `_cheshta_bala` and `_cheshta_bala_new`; three separate
`_sapthavargaja_bala` variants. Where an implementation ships alternatives the
sources disagree, and Jade must name the option rather than pick one silently
(CLAUDE.md, working rules).

**Two components do not behave classically.** On the reference chart,
`_dig_bala(method=1)` returns 63.40 for Saturn — dig bala is bounded at 60, and
`method=2` returns 56.60 for the same graha. `_nathonnath_bala` returns −8.92
for four grahas, where the classical range is 0 to 60. Whatever those encode,
matching them would import a convention Jade cannot defend from the text.

So the split, when this is built:

| Clean — implement and verify                        | Disputed — implement behind a named option         |
| --------------------------------------------------- | -------------------------------------------------- |
| uccha, kendrādi, oja-yugma, drekkāṇa                | sapta-vargaja (three variants in the wild)         |
| dig bala, in the classical bounded form             | nathonnata, ayana, ceṣṭā                           |
| abda, māsa, vāra, hora, tribhāga — calendrical      | pakṣa (doubling the Moon's value is not universal) |
| naisargika — a fixed table, already confirmed exact | dṛk (depends on the aspect-strength convention)    |

Deliberately not started before the yogas: a practitioner opens a chart to read
its yogas, not its rūpas, and the yoga core is unambiguous where this is not.

## Regression discipline

- The `astro` package version is stored on every computed chart. Bumping it invalidates the
  cache automatically.
- Any calculation bug fix ships with the failing fixture added _first_.
- Visual regression tests on all four chart styles at three viewports.
- A `CHANGELOG-ASTRO.md` written for astrologers, not developers: "v1.4.0 — Bhakūṭa doṣa
  cancellation now also applies when the two rāśi lords are in mutual friendship (option
  `bhakutaCancellation: 'lordFriendship'`, now on by default). Affects matches with 2–12,
  5–9 and 6–8 rāśi pairs. 41 saved relationship readings changed; see the diff report."
