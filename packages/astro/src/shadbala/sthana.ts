import { norm360 } from '../angles.js';
import { EXALTATION } from '../dignity.js';
import type { Graha } from '../types.js';

/**
 * Sthāna bala — positional strength, and the parts of it that are not in doubt.
 *
 * Ṣaḍbala is six strengths assembled from about twenty sub-components, and the
 * authorities differ on roughly half of them. Jade's rule is to build the ones
 * that are unambiguous, verify each against Jagannātha Hora *individually*
 * rather than as a bucket, and name the disputed ones as options rather than
 * pick silently.
 *
 * Everything here is measured in **virūpas**, sixtieths of a rūpa. Sixty
 * virūpas is one rūpa, and the classical minimums a graha must reach are
 * quoted in rūpas.
 */

/** The seven that take part. The nodes have no ṣaḍbala. */
export const BALA_GRAHAS: readonly Graha[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
];

export const VIRUPAS_PER_RUPA = 60;

/**
 * Uccha bala — strength by height.
 *
 * The distance from the graha's **debilitation** point, along the shorter arc,
 * divided by three. At exact debilitation it is zero; at exact exaltation, a
 * full 180° away, it is sixty.
 *
 * The deep exaltation degrees are exact, not sign-wide, which is why this takes
 * a longitude rather than a sign.
 */
export function ucchaBala(graha: Graha, siderealLongitude: number): number {
  const exaltation = EXALTATION[graha];
  if (!exaltation) return 0;
  const exaltationPoint = exaltation.sign * 30 + exaltation.degree;
  const debilitationPoint = norm360(exaltationPoint + 180);
  let distance = Math.abs(norm360(siderealLongitude) - debilitationPoint);
  if (distance > 180) distance = 360 - distance;
  return distance / 3;
}

/**
 * Kendrādi bala — strength by the kind of house.
 *
 * An angle is worth sixty, a succedent thirty, a cadent fifteen. This is the
 * one sub-component nobody argues about.
 */
export function kendradiBala(house: number): number {
  const h = ((house - 1) % 12) + 1;
  if ([1, 4, 7, 10].includes(h)) return 60;
  if ([2, 5, 8, 11].includes(h)) return 30;
  return 15;
}

/** Male, female, and the two the tradition treats as neither. */
export type GrahaSex = 'male' | 'female' | 'neuter';

export const GRAHA_SEX: Record<Graha, GrahaSex> = {
  Sun: 'male',
  Moon: 'female',
  Mars: 'male',
  Mercury: 'neuter',
  Jupiter: 'male',
  Venus: 'female',
  Saturn: 'neuter',
  Rahu: 'neuter',
  Ketu: 'neuter',
};

/**
 * Oja-yugma bala — strength by odd and even.
 *
 * Male grahas want odd signs and odd navāṁśas; female grahas want even. Fifteen
 * virūpas from the rāśi and fifteen from the navāṁśa, so thirty at most.
 *
 * Mercury and Saturn are the awkward ones: the tradition calls them neuter, and
 * different authorities assign them to the male or the female column. The
 * `neuterAs` option names that choice instead of burying it.
 */
export function ojaYugmaBala(
  graha: Graha,
  rashiSign: number,
  navamsaSign: number,
  neuterAs: 'male' | 'female' = 'male',
): number {
  const sex = GRAHA_SEX[graha];
  const wantsOdd = sex === 'neuter' ? neuterAs === 'male' : sex === 'male';
  const rashiOdd = rashiSign % 2 === 0; // Aries is index 0 and is the 1st, odd
  const navamsaOdd = navamsaSign % 2 === 0;
  return (rashiOdd === wantsOdd ? 15 : 0) + (navamsaOdd === wantsOdd ? 15 : 0);
}

/**
 * Drekkāṇa bala — strength by third of a sign.
 *
 * Male grahas gain fifteen in the first third, neuter in the second, female in
 * the last.
 */
export function drekkanaBala(graha: Graha, degreesInSign: number): number {
  const third = Math.min(2, Math.floor(degreesInSign / 10));
  const sex = GRAHA_SEX[graha];
  const wants = third === 0 ? 'male' : third === 1 ? 'neuter' : 'female';
  return sex === wants ? 15 : 0;
}
