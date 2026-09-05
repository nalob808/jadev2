import type { EphemerisProvider } from './ephemeris/provider.js';
import { siderealLongitudeAt, type SiderealFrame } from './transits/index.js';
import { SIGNS, type PointId } from './types.js';
import { nakshatraOf as nakshatraAt } from './nakshatra.js';

/**
 * What a chart can honestly say when the birth time is unknown.
 *
 * This is the common case in any public library — encyclopaedias record the day
 * of a birth and almost never the hour — and it is where most astrology
 * software quietly lies. The usual behaviour is to assume noon, draw a
 * confident ascendant, and print it identically to a chart cast from a birth
 * register. A student cannot tell the two apart, which makes the software worse
 * than useless for the one thing they are trying to learn.
 *
 * Jade's answer is to compute what is actually determined by the date alone.
 * The distinction is not a matter of opinion, it is a matter of speed:
 *
 *  - **The ascendant is unknowable.** It travels the whole zodiac in a day.
 *    Nothing about it survives the loss of the time, and neither does any
 *    house, since houses are counted from it. So this module returns no
 *    ascendant and no houses at all, and the pages that use it draw none.
 *  - **The Moon is usually unknowable too.** It moves about 13° a day, so it
 *    changes nakṣatra roughly every day and changes sign every two or three.
 *  - **The slow grahas are usually fine.** Saturn moves about two arcminutes a
 *    day. Its sign is not in doubt.
 *
 * So rather than one answer per graha, this returns the answer at both ends of
 * the local day and says whether they agree. A graha that holds its sign for
 * the whole day is reported as certain; one that crosses a boundary is reported
 * as both possibilities, which is the true answer and is more useful than
 * either half of it.
 */

export interface DayRangePosition {
  readonly id: PointId;
  readonly longitudeStart: number;
  readonly longitudeEnd: number;
  readonly signStart: string;
  readonly signEnd: string;
  /** True when the graha is in the same sign at both ends of the day. */
  readonly signCertain: boolean;
  readonly nakshatraStart: string;
  readonly nakshatraEnd: string;
  readonly nakshatraCertain: boolean;
  /** Degrees travelled across the day. Why the certainty is what it is. */
  readonly motion: number;
}

export interface UndatedDay {
  readonly jdStart: number;
  readonly jdEnd: number;
  readonly positions: readonly DayRangePosition[];
  /**
   * Always true, and present so a caller cannot forget. There is no ascendant
   * and no house in this result because neither is determined by a date.
   */
  readonly ascendantUnknowable: true;
}

const BODIES: readonly PointId[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

function signOf(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]!;
}

function nakshatraNameOf(longitude: number): string {
  return nakshatraAt(longitude).name;
}

/**
 * Positions at both ends of a day, with what is and is not settled by the date.
 *
 * `jdStart` and `jdEnd` are the caller's business — they should be local
 * midnight to local midnight at the birthplace, which is the window a date
 * without a time actually denotes. Passing a UT day instead shifts the window
 * by the zone offset and quietly changes the answer near a boundary.
 */
export function positionsAcrossDay(
  provider: EphemerisProvider,
  jdStart: number,
  jdEnd: number,
  frame: SiderealFrame,
): UndatedDay {
  const positions = BODIES.map((id): DayRangePosition => {
    const longitudeStart = siderealLongitudeAt(provider, id, jdStart, frame);
    const longitudeEnd = siderealLongitudeAt(provider, id, jdEnd, frame);

    const signStart = signOf(longitudeStart);
    const signEnd = signOf(longitudeEnd);
    const nakshatraStart = nakshatraNameOf(longitudeStart);
    const nakshatraEnd = nakshatraNameOf(longitudeEnd);

    // Signed motion across the day, wrapped, so a graha crossing 0° Aries
    // reports a small movement rather than 359 degrees of it.
    const motion = ((longitudeEnd - longitudeStart + 540) % 360) - 180;

    return {
      id,
      longitudeStart,
      longitudeEnd,
      signStart,
      signEnd,
      signCertain: signStart === signEnd,
      nakshatraStart,
      nakshatraEnd,
      nakshatraCertain: nakshatraStart === nakshatraEnd,
      motion,
    };
  });

  return { jdStart, jdEnd, positions, ascendantUnknowable: true };
}
