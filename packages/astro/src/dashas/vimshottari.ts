import type { Graha } from '../types.js';
import { VIMSHOTTARI_LORDS, NAKSHATRA_SPAN, nakshatraOf } from '../nakshatra.js';

/** Mahādaśā lengths in years, in Vimśottarī order. Sum = 120 exactly. */
export const VIMSHOTTARI_YEARS: Record<Graha, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

export const VIMSHOTTARI_TOTAL_YEARS = 120;

/**
 * Year length convention. This is a real fork between software packages and
 * it moves daśā boundaries by weeks over a lifetime, so Jade makes it explicit
 * and shows it in the UI rather than burying it.
 *
 *  - 'julian'  365.25 days. What most modern software uses, including
 *              Jagannātha Hora's default and Swiss Ephemeris-based tools.
 *  - 'tropical' 365.2422 days.
 *  - 'savana'   360 days — the classical sāvana year.
 */
export type YearLength = 'julian' | 'tropical' | 'savana';

export const YEAR_DAYS: Record<YearLength, number> = {
  julian: 365.25,
  tropical: 365.2422,
  savana: 360,
};

export interface DashaPeriod {
  /** Chain from mahādaśā outward, e.g. ['Saturn', 'Mercury'] for an antardaśā. */
  readonly lords: readonly Graha[];
  readonly lord: Graha;
  readonly level: number;
  /** Julian Day (UT) of the period start. */
  readonly startJd: number;
  readonly endJd: number;
  readonly years: number;
  children?: DashaPeriod[];
}

export interface VimshottariOptions {
  readonly yearLength?: YearLength;
  /** How many levels to expand: 1 = mahā, 2 = +antara, 3 = +pratyantara … max 5. */
  readonly levels?: number;
}

function lordSequenceFrom(start: Graha): Graha[] {
  const i = VIMSHOTTARI_LORDS.indexOf(start);
  if (i < 0) throw new Error(`vimshottari: '${start}' is not a daśā lord`);
  return Array.from({ length: 9 }, (_, k) => VIMSHOTTARI_LORDS[(i + k) % 9]!);
}

function expand(
  parentLords: readonly Graha[],
  parentStartJd: number,
  parentYears: number,
  dayLength: number,
  level: number,
  maxLevel: number,
): DashaPeriod[] {
  const startLord = parentLords[parentLords.length - 1]!;
  const out: DashaPeriod[] = [];
  let cursor = parentStartJd;
  for (const lord of lordSequenceFrom(startLord)) {
    const years = (parentYears * VIMSHOTTARI_YEARS[lord]) / VIMSHOTTARI_TOTAL_YEARS;
    const endJd = cursor + years * dayLength;
    const node: DashaPeriod = {
      lords: [...parentLords, lord],
      lord,
      level,
      startJd: cursor,
      endJd,
      years,
    };
    if (level < maxLevel) {
      node.children = expand(node.lords, cursor, years, dayLength, level + 1, maxLevel);
    }
    out.push(node);
    cursor = endJd;
  }
  return out;
}

export interface VimshottariResult {
  readonly yearLength: YearLength;
  readonly dayLength: number;
  /** Fraction of the first mahādaśā already elapsed at birth. */
  readonly balanceAtBirthYears: number;
  readonly periods: DashaPeriod[];
}

/**
 * Vimśottarī daśā from the natal Moon.
 *
 * The Moon's position inside its nakṣatra gives the portion of the first
 * mahādaśā already spent at birth; everything else follows by proportion.
 * Child periods sum exactly to the parent span — asserted in the tests.
 */
export function vimshottari(
  moonSiderealLongitude: number,
  birthJdUt: number,
  options: VimshottariOptions = {},
): VimshottariResult {
  const yearLength = options.yearLength ?? 'julian';
  const maxLevel = Math.min(Math.max(options.levels ?? 2, 1), 5);
  const dayLength = YEAR_DAYS[yearLength];

  const nak = nakshatraOf(moonSiderealLongitude);
  const fractionElapsed = nak.degreesInto / NAKSHATRA_SPAN;
  const firstLord = nak.lord;
  const firstTotal = VIMSHOTTARI_YEARS[firstLord];
  const elapsedYears = firstTotal * fractionElapsed;

  // Wind back to the notional start of the running mahādaśā, then lay the
  // whole 120-year cycle forward from there.
  const cycleStartJd = birthJdUt - elapsedYears * dayLength;

  const periods: DashaPeriod[] = [];
  let cursor = cycleStartJd;
  for (const lord of lordSequenceFrom(firstLord)) {
    const years = VIMSHOTTARI_YEARS[lord];
    const endJd = cursor + years * dayLength;
    const node: DashaPeriod = { lords: [lord], lord, level: 1, startJd: cursor, endJd, years };
    if (maxLevel > 1) {
      node.children = expand([lord], cursor, years, dayLength, 2, maxLevel);
    }
    periods.push(node);
    cursor = endJd;
  }

  return {
    yearLength,
    dayLength,
    balanceAtBirthYears: firstTotal - elapsedYears,
    periods,
  };
}

/** The running chain of lords at an instant, outermost first. */
export function dashaChainAt(result: VimshottariResult, jdUt: number): DashaPeriod[] {
  const chain: DashaPeriod[] = [];
  let level: DashaPeriod[] | undefined = result.periods;
  while (level) {
    const hit: DashaPeriod | undefined = level.find((p) => jdUt >= p.startJd && jdUt < p.endJd);
    if (!hit) break;
    chain.push(hit);
    level = hit.children;
  }
  return chain;
}
