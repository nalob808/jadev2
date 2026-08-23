import { norm360, separation } from './angles.js';
import type { Graha, PointId } from './types.js';

/**
 * Dignity, combustion and natural friendship.
 *
 * Values are the Bṛhat Parāśara Horā Śāstra standards. Where a school differs
 * — chiefly the nodes, which BPHS does not assign an exaltation to at all —
 * the value is absent rather than invented.
 */

export type Dignity =
  | 'exalted'
  | 'moolatrikona'
  | 'own'
  | 'great_friend'
  | 'friend'
  | 'neutral'
  | 'enemy'
  | 'great_enemy'
  | 'debilitated';

/** Sign rulership. Index 0 = Aries. */
export const SIGN_LORDS: readonly Graha[] = [
  'Mars',
  'Venus',
  'Mercury',
  'Moon',
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Saturn',
  'Jupiter',
];

/** Exaltation sign and the exact degree of deepest exaltation. */
export const EXALTATION: Partial<Record<Graha, { sign: number; degree: number }>> = {
  Sun: { sign: 0, degree: 10 },
  Moon: { sign: 1, degree: 3 },
  Mars: { sign: 9, degree: 28 },
  Mercury: { sign: 5, degree: 15 },
  Jupiter: { sign: 3, degree: 5 },
  Venus: { sign: 11, degree: 27 },
  Saturn: { sign: 6, degree: 20 },
};

/**
 * Mūlatrikoṇa ranges. Note the Moon's sits in Taurus, which is Venus's sign —
 * the one graha whose mūlatrikoṇa is not in a sign it rules. That is classical,
 * not a typo, and the tests assert it deliberately.
 */
export const MOOLATRIKONA: Partial<Record<Graha, { sign: number; from: number; to: number }>> = {
  Sun: { sign: 4, from: 0, to: 20 },
  Moon: { sign: 1, from: 4, to: 30 },
  Mars: { sign: 0, from: 0, to: 12 },
  Mercury: { sign: 5, from: 16, to: 20 },
  Jupiter: { sign: 8, from: 0, to: 10 },
  Venus: { sign: 6, from: 0, to: 15 },
  Saturn: { sign: 10, from: 0, to: 20 },
};

/** Naisargika maitrī — permanent natural friendship. BPHS 3.55–58. */
const FRIENDS: Partial<Record<Graha, readonly Graha[]>> = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Moon: ['Sun', 'Mercury'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus'],
};

const ENEMIES: Partial<Record<Graha, readonly Graha[]>> = {
  Sun: ['Venus', 'Saturn'],
  Moon: [],
  Mars: ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars'],
};

/**
 * Combustion orbs in degrees from the Sun. Configurable because the values
 * differ between authorities by a degree or two; these are the widely used
 * Parāśarī set, with the tighter retrograde orbs where they apply.
 */
export const COMBUSTION_ORBS: Partial<Record<Graha, { direct: number; retrograde: number }>> = {
  Moon: { direct: 12, retrograde: 12 },
  Mars: { direct: 17, retrograde: 17 },
  Mercury: { direct: 14, retrograde: 12 },
  Jupiter: { direct: 11, retrograde: 11 },
  Venus: { direct: 10, retrograde: 8 },
  Saturn: { direct: 15, retrograde: 15 },
};

export function naturalRelation(of: Graha, toward: Graha): 'friend' | 'neutral' | 'enemy' {
  if (of === toward) return 'friend';
  if (FRIENDS[of]?.includes(toward)) return 'friend';
  if (ENEMIES[of]?.includes(toward)) return 'enemy';
  return 'neutral';
}

/**
 * The dignity of a graha at a sidereal longitude.
 *
 * Order of precedence is the classical one: exaltation, then mūlatrikoṇa, then
 * own sign, then the friendship of the sign's lord. Debilitation is checked
 * first because it overrides everything.
 */
export function dignityOf(graha: Graha, siderealLongitude: number): Dignity | null {
  // The nodes have no rulership and no agreed exaltation in BPHS. Returning
  // null says so, rather than inventing a value.
  if (graha === 'Rahu' || graha === 'Ketu') return null;

  const longitude = norm360(siderealLongitude);
  const sign = Math.floor(longitude / 30);
  const degreeInSign = longitude - sign * 30;

  const exaltation = EXALTATION[graha];
  if (exaltation) {
    if (sign === exaltation.sign) return 'exalted';
    if (sign === (exaltation.sign + 6) % 12) return 'debilitated';
  }

  const moolatrikona = MOOLATRIKONA[graha];
  if (
    moolatrikona &&
    sign === moolatrikona.sign &&
    degreeInSign >= moolatrikona.from &&
    degreeInSign < moolatrikona.to
  ) {
    return 'moolatrikona';
  }

  const lord = SIGN_LORDS[sign]!;
  if (lord === graha) return 'own';

  const relation = naturalRelation(graha, lord);
  return relation === 'friend' ? 'friend' : relation === 'enemy' ? 'enemy' : 'neutral';
}

export interface Combustion {
  readonly combust: boolean;
  /** Angular distance from the Sun, degrees. */
  readonly separation: number;
  readonly orb: number;
  /** Within one degree: cazimi, traditionally a strengthening rather than a burning. */
  readonly cazimi: boolean;
}

export function combustionOf(
  graha: Graha,
  siderealLongitude: number,
  sunLongitude: number,
  retrograde: boolean,
): Combustion | null {
  const orbs = COMBUSTION_ORBS[graha];
  if (!orbs) return null;
  const orb = retrograde ? orbs.retrograde : orbs.direct;
  const distance = separation(siderealLongitude, sunLongitude);
  return {
    combust: distance < orb,
    separation: distance,
    orb,
    cazimi: distance < 1,
  };
}

/** Is the graha in its own sign, by rulership alone? */
export function rulesSign(graha: Graha, signIndex: number): boolean {
  return SIGN_LORDS[signIndex] === graha;
}

export function lordOfSign(signIndex: number): Graha {
  return SIGN_LORDS[((signIndex % 12) + 12) % 12]!;
}

export function isBenefic(pointId: PointId): boolean | null {
  // Natural benefics and malefics. The Moon and Mercury are conditional —
  // the Moon on its phase, Mercury on its company — so they return null
  // rather than a flat answer.
  switch (pointId) {
    case 'Jupiter':
    case 'Venus':
      return true;
    case 'Sun':
    case 'Mars':
    case 'Saturn':
    case 'Rahu':
    case 'Ketu':
      return false;
    case 'Moon':
    case 'Mercury':
      return null;
    default:
      return null;
  }
}
