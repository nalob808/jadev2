# 03 — Calculation specification

This is the contract for `packages/astro`. It is deliberately long, because this is the part
that competitors cannot fake and that determines whether a professional respects the tool.

Where classical authorities disagree, **implement the variants behind a named option** and
document the disagreement here. Never pick silently.

## 0. Time and coordinate pipeline

```
local civil time + place
  → resolved UTC offset (tzdb | manual | LMT)   ← record which
  → UTC → ΔT → TT
  → Julian Day (UT for the ephemeris call)
  → tropical geocentric apparent ecliptic longitude (Swiss Ephemeris)
  → minus ayanāṁśa → SIDEREAL longitude          ← everything downstream
```

- Use **apparent** positions (light-time + aberration + nutation) — this is what all
  professional software reports.
- Topocentric vs geocentric: geocentric default, topocentric as an option (matters for the
  Moon by up to ~1°; some KP practitioners insist on it).
- ΔT from Swiss Ephemeris; never hand-roll.
- Ascendant/MC from Swiss Ephemeris `swe_houses_ex` with sidereal flag, **not** hand-computed —
  the v0 prototype's bisection approach is clever but is a maintenance liability.

## 1. Ayanāṁśa

Ship as an enum, each mapped to the Swiss Ephemeris sidereal mode:

| Key                                                          | Notes                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `lahiri`                                                     | Chitrapakṣa, the government-of-India standard. **Default.**            |
| `lahiri_true_chitra`                                         | True Citrā (Spica fixed at 180°00′). Meaningful minutes of difference. |
| `raman`                                                      | B.V. Raman                                                             |
| `krishnamurti`                                               | KP; required if we ship KP features                                    |
| `yukteshwar`, `jn_bhasin`, `suryasiddhanta`, `fagan_bradley` | completeness                                                           |
| `custom`                                                     | user-entered offset at a stated epoch                                  |

The v0 prototype uses a closed-form mean-precession approximation
(`23.85306 + (5028.796195·T + 1.1054348·T²)/3600`). It is a decent Lahiri approximation near
J2000 and drifts thereafter. **Replace it with the Swiss Ephemeris value.** Keep the old
formula in tests as a sanity bound, not as a source.

Always display the numeric ayanāṁśa value in use, to the arcsecond, somewhere in the chart UI.

## 2. Points

**Grahas:** Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, **Rāhu, Ketu**.

> The v0 prototype has no nodes at all. For a Vedic tool this is the single largest gap —
> Rāhu/Ketu are dasha lords, house occupants, and half of the doṣa logic. Fix in Phase 1.

- Node type: `mean` | `true` — user setting, default `mean` (classical), because true node
  retrogrades and confuses students. Ketu = Rāhu + 180° always.
- **Outer planets** (Uranus, Neptune, Pluto): available, off by default in Vedic profiles,
  clearly labelled as non-classical.
- **Special lagnas:** Bhāva Lagna, Hora Lagna, Ghaṭika Lagna, Vighati Lagna, Śrī Lagna,
  Indu Lagna, Pranapada Lagna.
- **Upagrahas:** Gulika/Māndi (by the day-segment method — implement both the "start of
  Saturn's portion" and "end of portion" conventions as an option), Dhūma, Vyatipāta,
  Parivesha, Indrachāpa, Upaketu, Kāla, Mṛtyu, Ardhaprahara, Yamaghaṇṭaka.
- **Fixed stars** (Phase 8): the 27 yogatārās of the nakṣatras, plus the standard Western set.

Per-point derived data: sign, degree-in-sign, nakṣatra + pada + nakṣatra lord, sub-lord (KP)
and sub-sub-lord, house (by chosen system), retrograde flag and station proximity, combustion,
planetary war (graha yuddha, within 1°), directional strength, avasthās (bālādi, jāgradādi,
dīptādi, lajjitādi), and varga positions.

**Combustion orbs** (configurable; these are the common Parāśarī values, in degrees from Sun):
Moon 12, Mars 17, Mercury 14 (12 retro), Jupiter 11, Venus 10 (8 retro), Saturn 15.

## 3. Houses

- **Whole sign (rāśi) is the default** and the primary Vedic frame. House _n_ = the _n_-th sign
  from the lagna sign. Do not let a Western default leak in here.
- **Bhāva chalit** as a parallel view: Śrīpati (equal-from-midpoint), Porphyry, KP/Placidus.
  Show both, because a planet at 29° of the 1st rāśi is often in the 2nd bhāva and this is
  exactly where practitioners argue.
- House significations (kāraka + bhāvat bhāvam) are data, not code.

## 4. Divisional charts (vargas)

Implement all sixteen (ṣoḍaśavarga), each as a pure `(siderealLon) → sign` function, plus the
"varga of a varga" navāṁśa-in-navāṁśa view.

| Varga             | Divisions | Rule                                                                                                                                                                               |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 Rāśi           | 1         | the sign itself                                                                                                                                                                    |
| D2 Horā           | 2         | odd sign: 1st half → Leo, 2nd half → Cancer; even sign: reversed                                                                                                                   |
| D3 Drekkāṇa       | 3         | 1st third → same sign, 2nd → 5th from it, 3rd → 9th from it                                                                                                                        |
| D4 Caturthāṁśa    | 4         | quarters → 1st, 4th, 7th, 10th from the sign                                                                                                                                       |
| D7 Saptāṁśa       | 7         | odd sign: count from the sign; even sign: from the 7th from it                                                                                                                     |
| D9 Navāṁśa        | 9         | movable: from the same sign; fixed: from the 9th; dual: from the 5th                                                                                                               |
| D10 Daśāṁśa       | 10        | odd: from the same sign; even: from the 9th                                                                                                                                        |
| D12 Dvādaśāṁśa    | 12        | count from the same sign                                                                                                                                                           |
| D16 Ṣoḍaśāṁśa     | 16        | movable: from Aries; fixed: from Leo; dual: from Sagittarius                                                                                                                       |
| D20 Viṁśāṁśa      | 20        | movable: Aries; fixed: Sagittarius; dual: Leo                                                                                                                                      |
| D24 Caturviṁśāṁśa | 24        | odd: from Leo; even: from Cancer                                                                                                                                                   |
| D27 Bhāṁśa        | 27        | fire: Aries; earth: Cancer; air: Libra; water: Capricorn                                                                                                                           |
| D30 Triṁśāṁśa     | 30        | odd: Mars 5°(Ari), Saturn 5°(Aqu), Jupiter 8°(Sag), Mercury 7°(Gem), Venus 5°(Lib); even: mirrored — Venus 5°(Tau), Mercury 7°(Vir), Jupiter 8°(Pis), Saturn 5°(Cap), Mars 5°(Sco) |
| D40 Khavedāṁśa    | 40        | odd: from Aries; even: from Libra                                                                                                                                                  |
| D45 Akṣavedāṁśa   | 45        | movable: Aries; fixed: Leo; dual: Sagittarius                                                                                                                                      |
| D60 Ṣaṣṭyāṁśa     | 60        | count from the same sign, ×2; carry the 60 deity names and their benefic/malefic nature                                                                                            |

Also: **Vargottama** detection, **Ṣaḍvarga/Saptavarga/Daśavarga/Ṣoḍaśavarga strength tables**
(Viśvā, Vimśopaka bala), and the D9 lagna-as-lagna view.

## 5. Aspects (dṛṣṭi)

- **Graha dṛṣṭi**: every graha aspects the 7th fully. Mars additionally 4th & 8th; Jupiter 5th
  & 9th; Saturn 3rd & 10th. Rāhu/Ketu: 5th, 7th, 9th behind an option (schools differ).
- Partial aspect strengths (¼, ½, ¾) per the Parāśarī table — configurable on/off.
- **Rāśi dṛṣṭi** (Jaimini): movable signs aspect fixed signs except the adjacent one; fixed
  aspect movable except adjacent; dual aspect dual.
- Western-style degree aspects with orbs: available, off by default in Vedic profiles.
  (The v0 prototype's transit engine is degree-aspect based — keep it, but make graha dṛṣṭi
  the primary Vedic reading.)

## 6. Strength

- **Ṣaḍbala**, all six with full sub-components: Sthāna (uccha, saptavargaja, ojhayugma,
  kendrādi, drekkāṇa), Dig, Kāla (nathonnatha, pakṣa, tribhāga, varṣa/māsa/vāra/hora, ayana,
  yuddha), Cheṣṭā, Naisargika, Dṛk. Report in rūpas and as a percentage of the classical
  minimum requirement per graha.
- **Aṣṭakavarga**: Bhinnāṣṭakavarga for the 7 grahas + Lagna (the standard benefic-point
  tables), Sarvāṣṭakavarga totals, **Trikoṇa śodhana** and **Ekādhipatya śodhana** (implement
  both the Parāśara and the "reduction-optional" schools as an option), Śodhya Piṇḍa, and
  Kakṣyā-level transit reading.
- **Vimśopaka bala** across the varga schemes.
- **Bhāva bala** and **Ishta/Kashta phala**.

## 7. Yogas

A **rule engine**, not a pile of `if` statements. Rules are data:

```ts
type YogaRule = {
  id: 'gaja_kesari';
  name: 'Gaja Kesarī Yoga';
  source: 'Bṛhat Parāśara Horā Śāstra 41.1';
  conditions: Condition[]; // composable predicates over the ComputedChart
  cancellations?: Condition[]; // bhaṅga rules
  strengthFrom: ('shadbala' | 'dignity' | 'aspect_count')[];
  category: 'raja' | 'dhana' | 'mahapurusha' | 'arishta' | 'sannyasa' | 'other';
  significations: string[];
};
```

Ship at minimum: Pañca Mahāpuruṣa (Ruchaka, Bhadra, Haṁsa, Mālavya, Śaśa), Gaja Kesarī,
Budhāditya, Chandra-Mangala, Dhana yogas (lords of 2/5/9/11 combinations), Rāja yogas
(kendra–trikoṇa lord relationships), Vipareeta Rāja yogas (Harṣa/Sarala/Vimala), Neecha
Bhaṅga Rāja yoga (all four classical cancellation conditions), Kemadruma + its cancellations,
Śakaṭa, Kāla Sarpa (and why many schools reject it — say so in the UI), Amala, Adhi, Sunapha /
Anapha / Durudhara, Pārijāta, Lakṣmī. Every detected yoga must cite its source and show which
placements triggered it, and must display its cancellations. **A yoga list without cancellation
logic is astrologically dishonest and every professional will spot it in ten seconds.**

## 8. Daśās

| System                                                                                           | Length      | Notes                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vimśottarī**                                                                                   | 120 y       | Primary. From natal Moon's nakṣatra. Year length is a _setting_: 365.25 d (default, matches most software), 365.2422 d, or 360 sāvana days. State it in the UI — dasha boundaries move by weeks between conventions. |
| Aṣṭottarī                                                                                        | 108 y       | With its classical applicability condition (Kṛṣṇa pakṣa day birth / Śukla pakṣa night birth, per school — make it an option, don't force it)                                                                         |
| Yoginī                                                                                           | 36 y        | From Moon's nakṣatra                                                                                                                                                                                                 |
| Ṣoḍaśottarī, Dvādaśottarī, Pañcottarī, Śatābdika, Caturaśīti-sama, Dvisaptati-sama, Ṣaṣṭi-hāyanī | conditional | Phase 8 completeness — this is where Kala's "nine+ dasha systems" claim comes from                                                                                                                                   |
| **Chara daśā (Jaimini)**                                                                         | sign-based  | Ship both the Parāśara/K.N. Rao and the Raman variants — they differ and practitioners are partisan                                                                                                                  |
| Sthira, Nārāyaṇa, Śūla, Mandūka daśās                                                            | sign-based  | Phase 8                                                                                                                                                                                                              |
| Kālachakra daśā                                                                                  | complex     | Phase 8; get it right or don't ship it                                                                                                                                                                               |

Requirements for all: five levels (mahā → antara → pratyantara → sūkṣma → prāṇa), exact
timestamps in the subject's local time _and_ UTC, balance-at-birth, and a **daśā sandhi**
(junction) flag for the last/first 5% of a period.

## 9. Pañcāṅga and muhūrta

- Tithi (Moon − Sun in 12° steps), Nakṣatra, Nitya Yoga (Moon + Sun in 13°20′ steps), Karaṇa
  (half-tithi, 7 movable + 4 fixed), Vāra (from **sunrise**, not midnight).
- **Sunrise convention is a real fork**: disc-centre vs upper-limb, with/without refraction.
  Indian pañcāṅgas commonly use upper limb with standard refraction. Make it a setting; state
  the default; note that it shifts vāra-dependent results near dawn.
- Rāhu Kāla, Yamagaṇḍa, Gulika Kāla, Abhijit muhūrta, Durmuhūrta, Varjyam, Choghaḍiyā, Horā.
- Solar/lunar month, ayana, ṛtu, samvatsara, and both Amānta and Pūrṇimānta month naming.
- **Muhūrta finder** — the feature that earns the subscription: a constraint solver.
  _"Find the best three-hour windows between 1 Sep and 30 Oct for a business launch, requiring
  Tārā bala ≥ good, Candra bala ≥ neutral, no Rāhu Kāla, lagna lord unafflicted, avoiding
  Vishti karaṇa, favouring Puṣya."_ Rules are saved presets, results are ranked with the score
  broken out so the astrologer can see _why_ one window beat another.

## 10. Transits (gochara) and search

- Live sidereal positions vs natal (the v0 engine already does this well — port it).
- **Gochara from the Moon** (candra lagna) as the classical primary frame, with the standard
  benefic/malefic results-by-house table, **Vedha** cancellation points, and **Aṣṭakavarga
  bindu filtering** (a transit through a house with 2 bindus ≠ one with 7).
- **Sade Sati** tracker: Saturn through the 12th/1st/2nd from natal Moon, phase-by-phase with
  dates, plus Kaṇṭaka/Aṣṭama Śani.
- Jupiter return, Saturn return, nodal return, solar return dates.
- **Event search across time**: retrograde stations, sign ingresses (all bodies), lunations,
  eclipses (Swiss Ephemeris `swe_sol_eclipse_when_loc` / `swe_lun_eclipse_when`) with local
  visibility, planetary wars, combustion enter/exit, nakṣatra ingresses of the Moon.
- **Root-finding**: bisection then Brent's method on the angular difference function; cache
  ingress tables per year per settings profile — they're identical for every user.
- **Daśā × transit correlation** (this is a genuinely novel view): score each day over a range
  by how strongly the running daśā lords are being activated by transit — same lord conjoined,
  aspected, or transiting the daśā lord's natal house. Output as a heat-strip timeline under
  the daśā bar. Nobody ships this well; it's the screenshot that sells the product.

## 11. Relationship analysis

- **Aṣṭakūṭa (36 guṇa)**: Varṇa 1, Vaśya 2, Tārā 3, Yoni 4, Graha Maitrī 5, Gaṇa 6, Bhakūṭa 7,
  Nāḍī 8 — with the standard exception rules (Bhakūṭa and Nāḍī doṣa cancellations: same
  nakṣatra different pada, same rāśi different nakṣatra, lords in mutual friendship, etc.).
- **Daśakūṭa** (South Indian, 10 kūṭas) as an alternative scheme.
- **Maṅgala/Kuja doṣa**: from lagna, Moon _and_ Venus; severity grading; the full cancellation
  list (both partners afflicted, Mars in own/exaltation sign, Mars aspected by Jupiter,
  Saturn's aspect, age > 28 school, etc.). Present it as _analysis_, never as a verdict —
  this is the single most socially harmful output in Indian astrology software and Jade should
  be conspicuously more careful than the competition. UI copy matters here.
- **Rajju, Vedha, Mahendra, Strī-Dīrgha, Nāḍī** (Tamil/Telugu traditions).
- **Papa Sāmya** — malefic balance comparison rather than one-sided doṣa blaming.
- **Overlay synastry wheel** (A's chart with B's grahas on an outer ring) and **house overlay**
  ("your Saturn sits in their 7th").
- **Shared timeline**: both partners' Vimśottarī bars, transits, and Sade Sati on one axis,
  with automatically flagged convergences (both in a 7th-lord daśā; simultaneous Jupiter
  transit to the 7th). This is the relationship view that doesn't exist anywhere and it is
  going to be the thing people screenshot.
- **Composite / relationship chart** by the midpoint method, plus the "marriage muhūrta"
  finder using both charts as constraints.

## 12. Varṣaphala (annual)

Tājika system: solar return chart cast for the exact moment the Sun returns to its natal
sidereal longitude, Muntha, Varṣeśa (year lord) by the classical 5-fold test, Tājika aspects
with their deeptāṁśa orbs, the 16 Tājika yogas (Ikkavāla, Induvāra, Ithāsala, Īsarāpha,
Nakta, Yamayā, Manāū, Kambūla, Gairi Kambūla, Khallāsara, Rudda, Duphāli Kuttha, Dutthotha
Dāvīra, Tambīra, Kuttha, Durapha), Pañcavargīya bala, Hārṣa bala, Mudda daśā, and Sahams
(the ~50 Arabic-part-like sensitive points).

## 13. Numerical and engineering requirements

- All angles in degrees, normalised to `[0, 360)`; every comparison via a `wrap180` helper.
- No floating-point equality anywhere; tolerances are explicit named constants.
- Every public function is pure and takes `jdUT` explicitly. No ambient time.
- Performance budget: a full D1 + 16 vargas + ṣaḍbala + aṣṭakavarga + yogas + 2-level
  Vimśottarī in **< 150 ms** server-side. A 5-year daily transit scan in **< 3 s** (worker).
- Every exported function has a doc comment naming its classical source.
