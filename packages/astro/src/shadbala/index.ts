/**
 * Ṣaḍbala — what Jade computes, and what it deliberately does not.
 *
 * Ṣaḍbala is six strengths assembled from about twenty sub-components. It is
 * the most convention-dependent technique in Jyotiṣa, and the usual way it goes
 * wrong is that an implementation guesses at the disputed pieces until the
 * total looks plausible. A plausible total made of half-guessed parts is
 * exactly the "wrong degree" this project treats as a severity-one bug, so:
 *
 * **There is no ṣaḍbala total here.** Not yet. A total is only as trustworthy
 * as its weakest component, and two large ones are not yet reconciled. What is
 * exported is the set of components that were verified individually against
 * Jagannātha Hora across all seventeen golden charts, plus two implemented from
 * the classical text with their divergence documented.
 *
 * Several of these are used standalone by practitioners anyway — dig bala and
 * uccha bala especially — so this is useful before it is complete.
 *
 * ## Verified exactly against the reference
 *
 * | Component      | Result                                                    |
 * | -------------- | --------------------------------------------------------- |
 * | uccha          | exact, 119/119                                            |
 * | kendrādi       | exact, 119/119                                            |
 * | oja-yugma      | exact, 119/119, with the neuter grahas counted as male    |
 * | dig            | exact, 119/119, against the reference's *second* method   |
 * | pakṣa          | exact wherever the reference returns a value in range     |
 * | naisargika     | a fixed table; matches to the digit                       |
 *
 * Two findings from that verification are worth keeping:
 *
 * - **The reference's default dig bala is broken.** `_dig_bala(method=1)`
 *   returns values above 60 on a third of the sample — up to 99.95 — and dig
 *   bala is bounded at 60 by construction. `method=2` matches Jade exactly on
 *   every graha of every chart. Where an implementation ships two methods, one
 *   of them is usually wrong.
 * - **The reference's pakṣa bala goes out of range too**, returning −41.45 on
 *   one chart and 101.45 on another. Jade agrees with it on every chart where
 *   it stays inside 0–60.
 *
 * ## Implemented from the text, not reconciled
 *
 * - **Drekkāṇa bala.** Classically fifteen virūpas or nothing, by the graha's
 *   sex and which third of the sign it occupies. The reference's function of
 *   that name returns 0, 2.5, 5 and 10 — a dignity scale, a different quantity
 *   entirely. Jade implements the classical rule and does not follow it.
 * - **Sapta-vargaja bala.** Six of the seven divisions agree with the reference
 *   exactly; the seventh, the horā, does not, because the reference uses a
 *   twelve-sign horā where the classical rule admits only Cancer and Leo. Its
 *   relationship model also cannot be recovered from its API, and reading its
 *   source to find out is the line this project does not cross. Jade implements
 *   the pañcadhā maitrī compound relationship from the text.
 *
 * ## Not implemented
 *
 * Nathonnata, ayana, ceṣṭā, tribhāga, abda, māsa, vāra, horā, yuddha and dṛk
 * bala. The reference's nathonnata returns negative values where the classical
 * range is 0–60, and the calendrical four depend on a year and month reckoning
 * that would need its own verification programme. See `docs/07-accuracy.md`.
 */

export * from './sthana.js';
export * from './dig.js';
export * from './saptavargaja.js';
export * from './kala.js';
