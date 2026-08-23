import { norm360 } from '../angles.js';
import type { Graha } from '../types.js';

/**
 * Dig bala — strength by direction.
 *
 * Each graha has a quarter of the sky it is strongest in, and it is weakest
 * exactly opposite. The strength is the angular distance from that weak point,
 * divided by three, so it runs from zero to a full sixty virūpas.
 *
 * The directions:
 *
 *   Mercury, Jupiter   the ascendant — east, rising
 *   Sun, Mars          the midheaven — south
 *   Saturn             the descendant — west, setting
 *   Moon, Venus        the nadir — north
 *
 * These are the **angles**, not the whole-sign house cusps. Jade computes houses
 * whole-sign, but dig bala is a measurement against the actual ascendant and
 * midheaven degrees, and using a sign boundary instead can be wrong by up to
 * thirty degrees — ten whole virūpas.
 */

export type DigDirection = 'ascendant' | 'midheaven' | 'descendant' | 'nadir';

export const DIG_STRONGEST: Record<Graha, DigDirection | null> = {
  Mercury: 'ascendant',
  Jupiter: 'ascendant',
  Sun: 'midheaven',
  Mars: 'midheaven',
  Saturn: 'descendant',
  Moon: 'nadir',
  Venus: 'nadir',
  Rahu: null,
  Ketu: null,
};

export interface DigAngles {
  /** Sidereal ascendant, in degrees. */
  readonly ascendant: number;
  /** Sidereal midheaven, in degrees. */
  readonly midheaven: number;
}

export function digBala(graha: Graha, siderealLongitude: number, angles: DigAngles): number {
  const direction = DIG_STRONGEST[graha];
  if (!direction) return 0;

  const strongest =
    direction === 'ascendant'
      ? angles.ascendant
      : direction === 'midheaven'
        ? angles.midheaven
        : direction === 'descendant'
          ? norm360(angles.ascendant + 180)
          : norm360(angles.midheaven + 180);

  const weakest = norm360(strongest + 180);
  let distance = Math.abs(norm360(siderealLongitude) - weakest);
  if (distance > 180) distance = 360 - distance;
  return distance / 3;
}
