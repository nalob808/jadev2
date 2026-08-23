import { EXALTATION, SIGN_LORDS } from '../dignity.js';
import { SIGNS, type Graha } from '../types.js';

/**
 * Maṅgala doṣa — also kuja doṣa, and in common speech "manglik".
 *
 * This module is written defensively, because of all the things Jyotiṣa is used
 * for, this is the one that does the most harm when it is handled badly.
 * Matches get called off over it. So:
 *
 *  - **Cancellations are computed alongside the doṣa, never after it.** The
 *    result carries both, and the UI is expected to show them together. A
 *    doṣa reported without the conditions that cancel it is not a finding, it
 *    is a scare.
 *  - **Nothing here returns a verdict.** No "compatible", no "avoid", no score
 *    that reads as a pass mark. It returns which houses Mars occupies from
 *    which reference, and which classical cancellations apply.
 *  - **The reference points are an explicit option.** Reading from the
 *    ascendant alone, and reading from the ascendant, Moon and Venus, give
 *    materially different answers, and both are in wide use.
 *
 * See docs/03-calculation-spec.md. Jade's tone rules on this are in
 * docs/00-vision.md and they are not optional.
 */

/** The houses from a reference point in which Mars is said to form the doṣa. */
export const DOSHA_HOUSES = [1, 2, 4, 7, 8, 12] as const;

export type MangalaReference = 'lagna' | 'moon' | 'venus';

export interface MangalaOptions {
  /**
   * Which points to measure Mars from. The ascendant alone is Parāśara's
   * reading and the strictest to satisfy; adding the Moon is the most common
   * North Indian practice; Venus is used in some southern traditions for
   * marriage specifically. Default is the ascendant and the Moon.
   */
  readonly references?: readonly MangalaReference[];
  /**
   * Whether the 2nd house counts. A minority of authorities read the doṣa from
   * 1, 4, 7, 8 and 12 only, holding that the 2nd concerns family wealth and
   * speech rather than the marriage itself. Default includes it.
   */
  readonly includeSecondHouse?: boolean;
}

const DEFAULTS: Required<MangalaOptions> = {
  references: ['lagna', 'moon'],
  includeSecondHouse: true,
};

export interface MangalaChart {
  readonly ascendantSign: number;
  readonly signOf: Readonly<Record<Graha, number>>;
}

export interface MangalaOccurrence {
  readonly reference: MangalaReference;
  readonly house: number;
  readonly description: string;
}

export interface MangalaResult {
  /** True when Mars occupies a doṣa house from at least one active reference. */
  readonly present: boolean;
  readonly occurrences: readonly MangalaOccurrence[];
  /**
   * Classical conditions found that cancel or blunt the doṣa. Read this before
   * reading `present` — that is the whole point of returning them together.
   */
  readonly cancellations: readonly string[];
  /** Which reference points were consulted, so the answer can be reproduced. */
  readonly references: readonly MangalaReference[];
}

const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;
const houseFrom = (fromSign: number, sign: number): number =>
  ((((sign - fromSign) % 12) + 12) % 12) + 1;

const ordinal = (n: number): string => {
  const s =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${n}${s}`;
};

/**
 * The lagna-specific exemptions: for certain ascendants a particular doṣa house
 * is held not to apply, because Mars there falls in its own or a friendly sign.
 */
const LAGNA_EXEMPTIONS: readonly { lagna: number[]; house: number; why: string }[] = [
  { lagna: [2, 5], house: 2, why: 'Mars in the 2nd from a Gemini or Virgo ascendant' },
  { lagna: [0, 7], house: 4, why: 'Mars in the 4th from an Aries or Scorpio ascendant' },
  { lagna: [3, 9], house: 7, why: 'Mars in the 7th from a Cancer or Capricorn ascendant' },
  { lagna: [8, 11], house: 8, why: 'Mars in the 8th from a Sagittarius or Pisces ascendant' },
  { lagna: [1, 6], house: 12, why: 'Mars in the 12th from a Taurus or Libra ascendant' },
];

export function mangalaDosha(chart: MangalaChart, options: MangalaOptions = {}): MangalaResult {
  const merged = { ...DEFAULTS, ...options };
  const houses: number[] = merged.includeSecondHouse
    ? [...DOSHA_HOUSES]
    : DOSHA_HOUSES.filter((h) => h !== 2);

  const marsSign = chart.signOf.Mars;
  const referenceSign: Record<MangalaReference, number> = {
    lagna: chart.ascendantSign,
    moon: chart.signOf.Moon,
    venus: chart.signOf.Venus,
  };

  const occurrences: MangalaOccurrence[] = [];
  for (const reference of merged.references) {
    const from = referenceSign[reference];
    if (from === undefined) continue;
    const house = houseFrom(from, marsSign);
    if (!houses.includes(house)) continue;
    const label =
      reference === 'lagna' ? 'the ascendant' : reference === 'moon' ? 'the Moon' : 'Venus';
    occurrences.push({
      reference,
      house,
      description: `Mars in ${signName(marsSign)}, the ${ordinal(house)} from ${label}`,
    });
  }

  const cancellations: string[] = [];

  // Mars in its own sign or exalted.
  if (SIGN_LORDS[marsSign] === 'Mars') {
    cancellations.push(`Mars is in ${signName(marsSign)}, its own sign`);
  }
  if (EXALTATION.Mars?.sign === marsSign) {
    cancellations.push(`Mars is exalted in ${signName(marsSign)}`);
  }

  // Jupiter with Mars, or opposite it.
  if (chart.signOf.Jupiter === marsSign) {
    cancellations.push(`Jupiter is with Mars in ${signName(marsSign)}`);
  } else if (houseFrom(marsSign, chart.signOf.Jupiter) === 7) {
    cancellations.push(`Jupiter aspects Mars from ${signName(chart.signOf.Jupiter)}`);
  }

  // Saturn occupying one of the doṣa houses from the ascendant.
  const saturnHouse = houseFrom(chart.ascendantSign, chart.signOf.Saturn);
  if (houses.includes(saturnHouse)) {
    cancellations.push(
      `Saturn also occupies a doṣa house — the ${ordinal(saturnHouse)} from the ascendant`,
    );
  }

  // The lagna-specific exemptions.
  for (const exemption of LAGNA_EXEMPTIONS) {
    if (!exemption.lagna.includes(chart.ascendantSign)) continue;
    if (occurrences.some((o) => o.reference === 'lagna' && o.house === exemption.house)) {
      cancellations.push(`${exemption.why} is classically exempt`);
    }
  }

  return {
    present: occurrences.length > 0,
    occurrences,
    cancellations,
    references: merged.references,
  };
}

export interface MangalaComparison {
  readonly a: MangalaResult;
  readonly b: MangalaResult;
  /**
   * The oldest and least contested cancellation of all: when both charts carry
   * it, the tradition holds that it does not weigh between them.
   */
  readonly mutuallyCancelled: boolean;
}

export function compareMangala(
  a: MangalaChart,
  b: MangalaChart,
  options: MangalaOptions = {},
): MangalaComparison {
  const resultA = mangalaDosha(a, options);
  const resultB = mangalaDosha(b, options);
  return {
    a: resultA,
    b: resultB,
    mutuallyCancelled: resultA.present && resultB.present,
  };
}
