import type { Sign } from './types.js';
import { SIGNS } from './types.js';
import { norm360 } from './angles.js';

/**
 * Aṣṭakavarga — the eightfold division.
 *
 * For each of seven grahas, eight contributors (the seven grahas and the
 * ascendant) each mark a set of houses *counted from themselves* as benefic.
 * A sign holding many such marks — bindus — is a sign the graha does well in
 * and transits well through. Summing the seven graha tables gives the
 * sarvāṣṭakavarga, the single most-consulted number in transit work.
 *
 * The tables below are from Bṛhat Parāśara Horā Śāstra. They are not
 * derivable: each row is a list that must be right. Two guards keep them
 * honest — every row's length is asserted against the classical per-graha
 * total (48, 49, 39, 54, 56, 52, 39, summing to 337), and the computed chart
 * is diffed against Jagannātha Hora on the golden fixtures. A transcription
 * slip survives neither.
 *
 * Both guards earned their place immediately. Of the 64 rows here, 60 were
 * right first time and four were not:
 *
 *     Venus from Mars      had house 5, should be 4
 *     Moon  from Moon      was missing house 9
 *     Moon  from Mars      had a spurious house 9
 *     Moon  from Jupiter   had house 12, should be 2
 *
 * The Venus slip broke the 52-bindu total and the totals check caught it
 * alone. The three Moon slips cancelled out — the row still summed to 49, the
 * chart still looked plausible, and only the diff against Jagannātha Hora
 * found them. That is the entire argument for keeping an oracle: a table can
 * be wrong in a way that no internal consistency check can see.
 *
 * Houses are 1-based and counted from the contributor's own sign inclusive,
 * so house 1 is the contributor's sign itself.
 */

export const AV_SUBJECTS = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
] as const;
export type AvSubject = (typeof AV_SUBJECTS)[number];

/** The eight who cast bindus: the seven grahas and the ascendant. */
export const AV_CONTRIBUTORS = [...AV_SUBJECTS, 'Ascendant'] as const;
export type AvContributor = (typeof AV_CONTRIBUTORS)[number];

type BeneficTable = Record<AvContributor, readonly number[]>;

/** Sun's bhinnāṣṭakavarga — 48 bindus. */
const SUN: BeneficTable = {
  Sun: [1, 2, 4, 7, 8, 9, 10, 11],
  Moon: [3, 6, 10, 11],
  Mars: [1, 2, 4, 7, 8, 9, 10, 11],
  Mercury: [3, 5, 6, 9, 10, 11, 12],
  Jupiter: [5, 6, 9, 11],
  Venus: [6, 7, 12],
  Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
  Ascendant: [3, 4, 6, 10, 11, 12],
};

/** Moon's — 49. */
const MOON: BeneficTable = {
  Sun: [3, 6, 7, 8, 10, 11],
  Moon: [1, 3, 6, 7, 9, 10, 11],
  Mars: [2, 3, 5, 6, 10, 11],
  Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
  Jupiter: [1, 2, 4, 7, 8, 10, 11],
  Venus: [3, 4, 5, 7, 9, 10, 11],
  Saturn: [3, 5, 6, 11],
  Ascendant: [3, 6, 10, 11],
};

/** Mars' — 39. */
const MARS: BeneficTable = {
  Sun: [3, 5, 6, 10, 11],
  Moon: [3, 6, 11],
  Mars: [1, 2, 4, 7, 8, 10, 11],
  Mercury: [3, 5, 6, 11],
  Jupiter: [6, 10, 11, 12],
  Venus: [6, 8, 11, 12],
  Saturn: [1, 4, 7, 8, 9, 10, 11],
  Ascendant: [1, 3, 6, 10, 11],
};

/** Mercury's — 54. */
const MERCURY: BeneficTable = {
  Sun: [5, 6, 9, 11, 12],
  Moon: [2, 4, 6, 8, 10, 11],
  Mars: [1, 2, 4, 7, 8, 9, 10, 11],
  Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
  Jupiter: [6, 8, 11, 12],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11],
  Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
  Ascendant: [1, 2, 4, 6, 8, 10, 11],
};

/** Jupiter's — 56, the most generous. */
const JUPITER: BeneficTable = {
  Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
  Moon: [2, 5, 7, 9, 11],
  Mars: [1, 2, 4, 7, 8, 10, 11],
  Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
  Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
  Venus: [2, 5, 6, 9, 10, 11],
  Saturn: [3, 5, 6, 12],
  Ascendant: [1, 2, 4, 5, 6, 7, 9, 10, 11],
};

/** Venus' — 52. */
const VENUS: BeneficTable = {
  Sun: [8, 11, 12],
  Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Mars: [3, 4, 6, 9, 11, 12],
  Mercury: [3, 5, 6, 9, 11],
  Jupiter: [5, 8, 9, 10, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
  Saturn: [3, 4, 5, 8, 9, 10, 11],
  Ascendant: [1, 2, 3, 4, 5, 8, 9, 11],
};

/** Saturn's — 39, tied with Mars for the meanest. */
const SATURN: BeneficTable = {
  Sun: [1, 2, 4, 7, 8, 10, 11],
  Moon: [3, 6, 11],
  Mars: [3, 5, 6, 10, 11, 12],
  Mercury: [6, 8, 9, 10, 11, 12],
  Jupiter: [5, 6, 11, 12],
  Venus: [6, 11, 12],
  Saturn: [3, 5, 6, 11],
  Ascendant: [1, 3, 4, 6, 10, 11],
};

/**
 * The ascendant's own aṣṭakavarga — 49.
 *
 * Kept separate from `AV_SUBJECTS` because it takes no part in the
 * sarvāṣṭakavarga: the classical total of 337 is the seven grahas only.
 * Parāśara gives it, and it is used for questions about the body and the
 * general run of life rather than for transits.
 */
const ASCENDANT: BeneficTable = {
  Sun: [3, 4, 6, 10, 11, 12],
  Moon: [3, 6, 10, 11, 12],
  Mars: [1, 3, 6, 10, 11],
  Mercury: [1, 2, 4, 6, 8, 10, 11],
  Jupiter: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9],
  Saturn: [1, 3, 4, 6, 10, 11],
  Ascendant: [3, 6, 10, 11],
};

export const BENEFIC_HOUSES: Record<AvContributor, BeneficTable> = {
  Sun: SUN,
  Moon: MOON,
  Mars: MARS,
  Mercury: MERCURY,
  Jupiter: JUPITER,
  Venus: VENUS,
  Saturn: SATURN,
  Ascendant: ASCENDANT,
};

/** The classical bindu totals. Every table must sum to its entry. */
export const CLASSICAL_TOTALS: Record<AvContributor, number> = {
  Sun: 48,
  Moon: 49,
  Mars: 39,
  Mercury: 54,
  Jupiter: 56,
  Venus: 52,
  Saturn: 39,
  Ascendant: 49,
};

/** 48 + 49 + 39 + 54 + 56 + 52 + 39. The ascendant is not part of it. */
export const SARVA_TOTAL = 337;

/** One kakṣā: an eighth of a 30° sign, exactly 3°45′. */
export const KAKSHA_SPAN = 30 / 8;

/**
 * Kakṣā lords from 0°00′ to 30°00′ inside every sign.
 *
 * This is the classical sequence stated in Phaladīpikā ch. 23, śloka 18
 * (V. Subrahmanya Sastri translation): Saturn owns the first division,
 * Jupiter the second, then Mars, Sun, Venus, Mercury, Moon and Lagna.
 *
 * Do not reuse `AV_CONTRIBUTORS` here. That array is the convenient order in
 * which Jade builds a prasthāra; it is not the zodiacal kakṣā order. Swapping
 * the two produces a plausible-looking band whose bindu flags are wrong.
 */
export const KAKSHA_LORDS = [
  'Saturn',
  'Jupiter',
  'Mars',
  'Sun',
  'Venus',
  'Mercury',
  'Moon',
  'Ascendant',
] as const satisfies readonly AvContributor[];

/** Where each contributor sits, as a sign index 0–11 with Aries at 0. */
export type SignPlacement = Record<AvContributor, number>;

export interface Bhinnashtakavarga {
  /** Bindus per sign, Aries first. Always twelve entries summing to the classical total. */
  readonly bindus: readonly number[];
  /** Which contributors gave a bindu in each sign — this is what the UI shows on hover. */
  readonly sources: readonly (readonly AvContributor[])[];
  readonly total: number;
}

/**
 * One graha's (or the ascendant's) bhinnāṣṭakavarga.
 *
 * The sources are carried alongside the counts deliberately. A bare number is
 * not groundable — "Jupiter has 7 bindus in Leo" is only useful to a
 * practitioner who can see that it came from the Sun, Mars, Mercury and the
 * ascendant. The interpretation layer is not allowed to print a claim it
 * cannot decompose (CLAUDE.md, non-negotiable #5).
 */
export function bhinnashtakavarga(
  subject: AvContributor,
  placement: SignPlacement,
): Bhinnashtakavarga {
  const table = BENEFIC_HOUSES[subject];
  const bindus = new Array<number>(12).fill(0);
  const sources: AvContributor[][] = Array.from({ length: 12 }, () => []);

  for (const contributor of AV_CONTRIBUTORS) {
    const from = placement[contributor];
    for (const house of table[contributor]) {
      // Houses are 1-based and inclusive of the contributor's own sign.
      const sign = (from + house - 1) % 12;
      bindus[sign] = (bindus[sign] ?? 0) + 1;
      sources[sign]!.push(contributor);
    }
  }

  return {
    bindus,
    sources: sources.map((s) => [...s]),
    total: bindus.reduce((a, b) => a + b, 0),
  };
}

export interface AshtakavargaResult {
  /** One table per graha, plus the ascendant's. */
  readonly bhinna: Record<AvContributor, Bhinnashtakavarga>;
  /** The seven graha tables summed, per sign. Totals 337. */
  readonly sarva: readonly number[];
  /** Signs ranked by sarva bindus, strongest first. What transit work starts from. */
  readonly strongestSigns: readonly Sign[];
}

/** The geometrical kakṣā containing one sidereal longitude. */
export interface KakshaPosition {
  /** The input longitude normalised to [0, 360). */
  readonly longitude: number;
  /** Aries = 0. */
  readonly signIndex: number;
  /** 0–7 inside the sign. */
  readonly kakshaIndex: number;
  /** The same division in the practitioner-facing 1–8 notation. */
  readonly kakshaNumber: number;
  readonly lord: AvContributor;
  /** Absolute sidereal longitude of the two boundaries. */
  readonly startLongitude: number;
  readonly endLongitude: number;
  /** Degrees elapsed inside this 3°45′ division. */
  readonly degreesInto: number;
}

/** One cell of a graha's eight-cell kakṣā band for a sign. */
export interface KakshaCell {
  readonly subject: AvSubject;
  readonly signIndex: number;
  readonly kakshaIndex: number;
  readonly kakshaNumber: number;
  readonly lord: AvContributor;
  readonly startLongitude: number;
  readonly endLongitude: number;
  /** Whether this lord supplied a bindu in this subject's BAV for the sign. */
  readonly hasBindu: boolean;
}

/** The occupied kakṣā and its BAV judgement at one transit longitude. */
export interface KakshaTransit extends KakshaPosition {
  readonly subject: AvSubject;
  readonly hasBindu: boolean;
}

export function ashtakavarga(placement: SignPlacement): AshtakavargaResult {
  const bhinna = {} as Record<AvContributor, Bhinnashtakavarga>;
  for (const subject of AV_CONTRIBUTORS) {
    bhinna[subject] = bhinnashtakavarga(subject, placement);
  }

  const sarva = new Array<number>(12).fill(0);
  for (const subject of AV_SUBJECTS) {
    const row = bhinna[subject].bindus;
    for (let i = 0; i < 12; i += 1) sarva[i] = (sarva[i] ?? 0) + (row[i] ?? 0);
  }

  const strongestSigns = SIGNS.map((name, i) => ({ name, n: sarva[i] ?? 0 }))
    .sort((a, b) => b.n - a.n || SIGNS.indexOf(a.name) - SIGNS.indexOf(b.name))
    .map((s) => s.name);

  return { bhinna, sarva, strongestSigns };
}

/**
 * Locate a sidereal longitude in the fixed eightfold division of its sign.
 *
 * Exact boundaries belong to the division that begins there: 3°45′ is the
 * first instant of Jupiter's kakṣā, never the last instant of Saturn's.
 */
export function kakshaOf(siderealLongitude: number): KakshaPosition {
  const longitude = norm360(siderealLongitude);
  const signIndex = Math.floor(longitude / 30);
  const degreesInSign = longitude - signIndex * 30;
  const kakshaIndex = Math.min(7, Math.floor(degreesInSign / KAKSHA_SPAN));
  const startLongitude = signIndex * 30 + kakshaIndex * KAKSHA_SPAN;

  return {
    longitude,
    signIndex,
    kakshaIndex,
    kakshaNumber: kakshaIndex + 1,
    lord: KAKSHA_LORDS[kakshaIndex]!,
    startLongitude,
    endLongitude: startLongitude + KAKSHA_SPAN,
    degreesInto: longitude - startLongitude,
  };
}

/**
 * All eight kakṣās for one graha in one sign.
 *
 * A BAV count alone cannot answer this question. The flag comes from the
 * prasthāra source list: the cell bears a bindu exactly when that cell's lord
 * is one of the contributors recorded for the sign.
 */
export function kakshasInSign(
  subject: AvSubject,
  signIndex: number,
  result: AshtakavargaResult,
): readonly KakshaCell[] {
  if (!Number.isInteger(signIndex) || signIndex < 0 || signIndex > 11) {
    throw new RangeError(
      `kakshasInSign: signIndex must be an integer from 0 to 11, got ${signIndex}`,
    );
  }

  const sources = new Set(result.bhinna[subject].sources[signIndex] ?? []);
  const signStart = signIndex * 30;
  return KAKSHA_LORDS.map((lord, kakshaIndex) => ({
    subject,
    signIndex,
    kakshaIndex,
    kakshaNumber: kakshaIndex + 1,
    lord,
    startLongitude: signStart + kakshaIndex * KAKSHA_SPAN,
    endLongitude: signStart + (kakshaIndex + 1) * KAKSHA_SPAN,
    hasBindu: sources.has(lord),
  }));
}

/** Score one live transit against the occupied cell in its graha's own BAV. */
export function kakshaTransit(
  subject: AvSubject,
  siderealLongitude: number,
  result: AshtakavargaResult,
): KakshaTransit {
  const position = kakshaOf(siderealLongitude);
  const sources = result.bhinna[subject].sources[position.signIndex] ?? [];
  return {
    ...position,
    subject,
    hasBindu: sources.includes(position.lord),
  };
}

/**
 * The sarvāṣṭakavarga taken apart by who gave each bindu.
 *
 * `bySource.Saturn[4]` is how many of the seven graha tables received a bindu
 * in Leo *from* Saturn. Summed over the eight contributors, each sign returns
 * exactly its sarva count. This is the decomposition the integer grid hides:
 * a sign of 28 made of benefic bindus and one made of malefic bindus read the
 * same in a table and differently in practice.
 */
export function sarvaByContributor(
  result: AshtakavargaResult,
): Record<AvContributor, readonly number[]> {
  const out = {} as Record<AvContributor, number[]>;
  for (const contributor of AV_CONTRIBUTORS) out[contributor] = new Array<number>(12).fill(0);
  for (const subject of AV_SUBJECTS) {
    result.bhinna[subject].sources.forEach((sources, sign) => {
      for (const contributor of sources) out[contributor]![sign]! += 1;
    });
  }
  return out;
}
