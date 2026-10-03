import type { Graha, PointId } from './types.js';
import { modalityOfSign } from './types.js';

/**
 * Dṛṣṭi — Vedic aspect.
 *
 * Not the Western degree aspect. A graha aspects whole HOUSES counted from
 * where it sits, and the pattern is asymmetric: Mars strikes forward and back
 * unevenly, Jupiter blesses the trines, Saturn reaches the 3rd and 10th.
 * Everything aspects the 7th.
 *
 * Confusing this with degree-based aspects is the most common way a Western
 * chart engine produces Vedic-looking output that no Jyotiṣī recognises.
 *
 * ## Two doctrines, not one table read two ways
 *
 * BPHS ch. 26 states two things a few verses apart, and collapsing them into
 * one table is the second most common way this subject goes wrong:
 *
 * 1. **The special aspects** — `GRAHA_DRISHTI`, `DRISHTI_STRENGTH`,
 *    `signsAspectedBy`. Every graha aspects the 7th; Mars additionally the 4th
 *    and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th. Every one of
 *    those is a **full** aspect, the extras included — that is what makes them
 *    worth naming. This is the scheme the wheel draws, the yogas test and the
 *    house readings print, because it is what a practitioner means by "Saturn
 *    aspects the 10th".
 *
 * 2. **The graded aspect** — `GRADED_DRISHTI_STRENGTH`, `gradedDrishti`. Every
 *    graha aspects *every* one of seven distances with a strength that depends
 *    on the distance alone: a quarter to the 3rd and 10th, a half to the 5th
 *    and 9th, three quarters to the 4th and 8th, full to the 7th. The three
 *    special aspects of (1) are the exceptions that come out full anyway.
 *
 * These answer different questions. In (1) Venus in Aries aspects Libra and
 * nothing else; in (2) the same Venus also gives Gemini a quarter and Leo a
 * half. A result from one must never be summed with, compared against or
 * substituted for a result from the other, so every `Aspect` carries the
 * `doctrine` that produced its `strength` and the two live behind two
 * functions rather than one function with a flag.
 *
 * **The history, because it is instructive.** `DRISHTI_STRENGTH` used to carry
 * a doc comment promising "three quarters, a half or a quarter" over a table
 * in which every value was 1. The table was right and the comment was wrong:
 * it is the special-aspect table, where full is the whole point. Anything
 * reading those ones as the graded quarters was reading the wrong doctrine's
 * numbers. `test/drishti.test.ts` now pins both tables so the comment and the
 * values cannot drift apart again.
 *
 * ## What this module refuses to do
 *
 * - **No continuous (sphuṭa) dṛṣṭi.** Parāśara also gives a degree-based
 *   formula that interpolates between these steps, and it is what a strict
 *   Dṛg-bala wants. It is a third doctrine, not a refinement of these two, and
 *   it is not implemented here. Jade's ṣaḍbala ships no dṛg bala rather than a
 *   plausible one (see `shadbala/index.ts` for the same policy).
 * - **No totals.** Nothing here sums the aspects on a house into a single
 *   number. Under (1) that sum is just a count of full glances; under (2) it
 *   is a quantity whose scale no text fixes. A caller that wants a weight can
 *   read `strength` and say which doctrine it used.
 * - **No orbs, no degrees.** Degree aspects with orbs are a separate engine,
 *   `aspects/degreeAspects.ts`, off by default in Vedic profiles.
 *
 * ## Rāhu and Ketu: one default, named once
 *
 * The nodes aspecting the 5th, 7th and 9th is widely taught and is not in
 * BPHS, so it is an option — `includeNodes` here, `includeNodeDrishti` in
 * `relations/synastry.ts`. It is **on** by default, because most software and
 * most practitioners use it, and because a reading that shows Rāhu's glance in
 * the house list and hides it in the synastry list is worse than either
 * choice made consistently.
 *
 * That default used to disagree with itself: this module's guard returned
 * nothing for the nodes unless asked, while its own table said to "switch it
 * off with the `includeNodes` option", synastry defaulted it on, and
 * `interpret`'s house reading defaulted it on. One `Rāhu` either glances or
 * does not. The single value is `INCLUDE_NODE_DRISHTI_BY_DEFAULT`, imported by
 * every module that needs to default it, so the next disagreement has to be a
 * deliberate edit to one constant rather than a drift between four files.
 */

/** Houses aspected, counted from the graha's own house as 1. */
export const GRAHA_DRISHTI: Record<Graha, readonly number[]> = {
  Sun: [7],
  Moon: [7],
  Mercury: [7],
  Venus: [7],
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
  // Rāhu and Ketu aspecting 5, 7 and 9 is widely taught and not in BPHS.
  // Included because most software and most practitioners use it; switch it
  // off with the `includeNodes` option rather than editing this table.
  Rahu: [5, 7, 9],
  Ketu: [5, 7, 9],
};

/**
 * Strength of each special aspect: **full, all of them.**
 *
 * Every value here is 1 and that is correct, not a stub. The special aspects
 * are the ones the text singles out *because* they are full: Mars' 4th and 8th
 * strike as hard as its 7th, Jupiter's trines bless as fully as its 7th,
 * Saturn's 3rd and 10th land as heavily as its 7th. A graded reading of these
 * distances is a different doctrine and lives in `GRADED_DRISHTI_STRENGTH`.
 *
 * Kept as a table rather than folded into a constant 1 so that it stays the
 * single place a strength per (graha, distance) is looked up, and so that the
 * tests can assert the two doctrines disagree exactly where they should.
 */
export const DRISHTI_STRENGTH: Record<Graha, Readonly<Record<number, number>>> = {
  Sun: { 7: 1 },
  Moon: { 7: 1 },
  Mercury: { 7: 1 },
  Venus: { 7: 1 },
  Mars: { 4: 1, 7: 1, 8: 1 },
  Jupiter: { 5: 1, 7: 1, 9: 1 },
  Saturn: { 3: 1, 7: 1, 10: 1 },
  Rahu: { 5: 1, 7: 1, 9: 1 },
  Ketu: { 5: 1, 7: 1, 9: 1 },
};

/**
 * The Parāśarī graded aspect, by distance alone — the quarters.
 *
 * This is the *other* doctrine: every graha casts all seven of these, and the
 * strength is a property of the distance, not of the graha. The 7th is full,
 * the 4th and 8th three quarters, the 5th and 9th a half, the 3rd and 10th a
 * quarter.
 *
 * The five distances that are absent — the 1st, 2nd, 6th, 11th and 12th — cast
 * nothing in this scheme. The continuous formula gives them small non-zero
 * values; this table is the stepped reading and does not.
 */
export const GRADED_DRISHTI_STRENGTH: Readonly<Record<number, number>> = {
  3: 0.25,
  4: 0.75,
  5: 0.5,
  7: 1,
  8: 0.75,
  9: 0.5,
  10: 0.25,
};

/** The distances the graded scheme speaks about, ascending. */
export const GRADED_DRISHTI_DISTANCES: readonly number[] = [3, 4, 5, 7, 8, 9, 10];

/**
 * The textual exceptions inside the graded scheme — the special aspects minus
 * the universal 7th.
 *
 * Only Mars, Jupiter and Saturn appear. The nodes are deliberately absent:
 * their 5/7/9 is a modern convention (see `GRAHA_DRISHTI`), no text grades
 * them at all, and promoting a convention to a textual exception inside
 * somebody else's doctrine would be inventing a rule. Under `gradedDrishti`
 * the nodes therefore take the ordinary distance values like everyone else.
 */
export const SPECIAL_FULL_ASPECTS: Partial<Record<Graha, readonly number[]>> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
};

/** Which doctrine produced an aspect's `strength`. See the module header. */
export type DrishtiDoctrine = 'special' | 'graded';

export interface Aspect {
  readonly from: PointId;
  readonly toSign: number;
  /** Houses counted from the aspecting graha, 1-based. */
  readonly distance: number;
  readonly strength: number;
  /**
   * Which scheme `strength` is measured in. Carried on every aspect because a
   * printed or drawn strength is meaningless without it: 0.75 means something
   * only under `graded`, and 1 means something different under each.
   */
  readonly doctrine: DrishtiDoctrine;
}

/**
 * Whether Rāhu and Ketu cast dṛṣṭi unless told otherwise. **On.**
 *
 * One exported value so that this module, `relations/synastry.ts` and anything
 * else that has to default the choice cannot drift apart. The reasoning is in
 * the module header; changing it here changes it everywhere, which is the
 * point.
 */
export const INCLUDE_NODE_DRISHTI_BY_DEFAULT = true;

export interface DrishtiOptions {
  /**
   * Include the nodes' 5/7/9 aspect. Defaults to
   * `INCLUDE_NODE_DRISHTI_BY_DEFAULT` — on, because most software and most
   * practitioners use it, even though it is not in BPHS. Pass `false` for a
   * strictly Parāśarī reading.
   */
  readonly includeNodes?: boolean;
}

const nodesAllowed = (graha: Graha, options: DrishtiOptions): boolean =>
  (options.includeNodes ?? INCLUDE_NODE_DRISHTI_BY_DEFAULT) ||
  (graha !== 'Rahu' && graha !== 'Ketu');

/**
 * Every sign a graha aspects, given the sign it occupies — the special
 * aspects, every one of them full.
 *
 * For the graded quarters, call `gradedDrishti` instead. These two never mix.
 */
export function signsAspectedBy(
  graha: Graha,
  fromSign: number,
  options: DrishtiOptions = {},
): Aspect[] {
  if (!nodesAllowed(graha, options)) return [];
  const distances = GRAHA_DRISHTI[graha];
  return distances.map((distance) => ({
    from: graha,
    toSign: (fromSign + distance - 1) % 12,
    distance,
    strength: DRISHTI_STRENGTH[graha][distance] ?? 1,
    doctrine: 'special' as const,
  }));
}

export interface GradedDrishtiOptions extends DrishtiOptions {
  /**
   * Whether the three textual exceptions — Mars' 4th and 8th, Jupiter's 5th
   * and 9th, Saturn's 3rd and 10th — come out full inside the graded scheme.
   *
   * **Defaults to true**, because BPHS states the exceptions and the grading
   * in the same chapter and most presentations of the graded table carry them.
   * Pass `false` for the strength of the distance and nothing else, which is
   * what someone building a distance-only weight (a heat map, say, where the
   * grahas are not meant to differ) usually wants.
   */
  readonly specialAspectsFull?: boolean;
}

/**
 * The graded Parāśarī aspect: every graha onto all seven graded distances,
 * with the quarter / half / three-quarter / full strengths.
 *
 * Seven aspects per graha, always — a much longer list than
 * `signsAspectedBy`, most of it weak. It is a weighting instrument, not a
 * statement that Venus "aspects" its 3rd in the sense a practitioner means.
 * Anything printed from it has to say so, which is what `doctrine` is for.
 */
export function gradedDrishti(
  graha: Graha,
  fromSign: number,
  options: GradedDrishtiOptions = {},
): Aspect[] {
  if (!nodesAllowed(graha, options)) return [];
  const full = (options.specialAspectsFull ?? true) ? (SPECIAL_FULL_ASPECTS[graha] ?? []) : [];
  return GRADED_DRISHTI_DISTANCES.map((distance) => ({
    from: graha,
    toSign: (fromSign + distance - 1) % 12,
    distance,
    strength: full.includes(distance) ? 1 : GRADED_DRISHTI_STRENGTH[distance]!,
    doctrine: 'graded' as const,
  }));
}

/**
 * Rāśi dṛṣṭi (Jaimini): signs aspect signs, regardless of what occupies them.
 * Movable signs aspect the fixed signs except the adjacent one; fixed aspect
 * movable except the adjacent; dual signs aspect the other dual signs.
 */
export function signsAspectedBySign(fromSign: number): number[] {
  const modality = modalityOfSign(fromSign);
  const targets: number[] = [];
  for (let sign = 0; sign < 12; sign += 1) {
    if (sign === fromSign) continue;
    const other = modalityOfSign(sign);
    if (modality === 'dual') {
      if (other === 'dual') targets.push(sign);
      continue;
    }
    const wanted = modality === 'movable' ? 'fixed' : 'movable';
    if (other !== wanted) continue;
    // The adjacent sign of the other modality is excluded.
    const gap = (((sign - fromSign) % 12) + 12) % 12;
    if (gap === 1 || gap === 11) continue;
    targets.push(sign);
  }
  return targets;
}

/**
 * Which grahas aspect a given sign — the special aspects.
 *
 * Deliberately the special doctrine only. Under the graded scheme every graha
 * aspects every sign at one of seven distances, so "who aspects this sign" has
 * no interesting answer there; a caller that wants the graded weights asks
 * `gradedDrishti` per graha and keeps the doctrine with the numbers.
 */
export function aspectsOnSign(
  placements: ReadonlyArray<{ pointId: PointId; signIndex: number }>,
  targetSign: number,
  options: DrishtiOptions = {},
): Aspect[] {
  const found: Aspect[] = [];
  for (const { pointId, signIndex } of placements) {
    if (!(pointId in GRAHA_DRISHTI)) continue;
    for (const aspect of signsAspectedBy(pointId as Graha, signIndex, options)) {
      if (aspect.toSign === targetSign) found.push(aspect);
    }
  }
  return found;
}
