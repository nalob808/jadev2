import { norm360 } from '../angles.js';
import type { Graha } from '../types.js';

/**
 * The parts of kāla bala — strength by time — that are not in doubt.
 *
 * Kāla bala has nine sub-components and is the most convention-dependent of the
 * six strengths. Two of Jade's rules apply hard here: build only what can be
 * checked, and where the sources disagree, name the option.
 */

/** Natural benefics and malefics, for the purposes of pakṣa bala. */
const NATURAL_BENEFIC: readonly Graha[] = ['Jupiter', 'Venus'];
const NATURAL_MALEFIC: readonly Graha[] = ['Sun', 'Mars', 'Saturn'];

export interface PakshaOptions {
  /**
   * How to treat Mercury.
   *
   * Mercury takes the character of its company, which every text agrees on and
   * no text reduces to a formula. `'benefic'` is the common simplification and
   * the default; `'malefic'` is the other half of the disagreement. Jade's
   * `dignity` module already refuses to give Mercury a flat answer — this is
   * the same refusal, made into a choice the caller has to see.
   */
  readonly mercuryAs?: 'benefic' | 'malefic';
}

export interface PakshaResult {
  /** Elongation of the Moon from the Sun along the shorter arc, 0–180°. */
  readonly elongation: number;
  readonly paksha: 'shukla' | 'krishna';
  readonly virupas: Readonly<Record<string, number>>;
}

/**
 * Pakṣa bala — strength by the fortnight.
 *
 * As the Moon fills, benefics gain and malefics lose; in the waning fortnight
 * it reverses. The measure is the Moon's elongation from the Sun along the
 * shorter arc, divided by three, so it runs 0–60.
 *
 * The Moon's own value is **doubled**, and its side depends on the fortnight:
 * a waxing Moon counts as a benefic, a waning one as a malefic. That doubling
 * is the part most often dropped, and it is worth up to a full rūpa.
 */
export function pakshaBala(
  sunLongitude: number,
  moonLongitude: number,
  grahas: readonly Graha[],
  options: PakshaOptions = {},
): PakshaResult {
  const separation = norm360(moonLongitude - sunLongitude);
  const elongation = separation > 180 ? 360 - separation : separation;
  const paksha = separation <= 180 ? 'shukla' : 'krishna';

  const beneficValue = elongation / 3;
  const maleficValue = 60 - beneficValue;

  const mercuryAs = options.mercuryAs ?? 'benefic';
  const virupas: Record<string, number> = {};

  for (const graha of grahas) {
    if (graha === 'Moon') {
      virupas.Moon = (paksha === 'shukla' ? beneficValue : maleficValue) * 2;
      continue;
    }
    if (graha === 'Mercury') {
      virupas.Mercury = mercuryAs === 'benefic' ? beneficValue : maleficValue;
      continue;
    }
    if (NATURAL_BENEFIC.includes(graha)) virupas[graha] = beneficValue;
    else if (NATURAL_MALEFIC.includes(graha)) virupas[graha] = maleficValue;
  }

  return { elongation, paksha, virupas };
}

/**
 * Naisargika bala — natural, permanent strength.
 *
 * A fixed ranking by apparent brightness: the Sun full, then the Moon, Venus,
 * Jupiter, Mercury, Mars, and Saturn last. Sixty virūpas divided into sevenths,
 * which is why the numbers are the recurring ones they are.
 */
export const NAISARGIKA_BALA: Readonly<Record<Graha, number>> = {
  Sun: 60,
  Moon: (60 * 6) / 7,
  Venus: (60 * 5) / 7,
  Jupiter: (60 * 4) / 7,
  Mercury: (60 * 3) / 7,
  Mars: (60 * 2) / 7,
  Saturn: 60 / 7,
  Rahu: 0,
  Ketu: 0,
};
