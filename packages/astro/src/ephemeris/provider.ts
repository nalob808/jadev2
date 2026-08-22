import type { PointId } from '../types.js';

/** A body's geocentric apparent position in the true ecliptic of date. */
export interface EclipticPosition {
  /** Tropical longitude, degrees [0, 360). */
  readonly longitude: number;
  /** Ecliptic latitude, degrees. */
  readonly latitude: number;
  /** Distance in AU. */
  readonly distance: number;
  /** Longitude speed, degrees/day. */
  readonly speed: number;
}

/**
 * The one seam between Jade and whichever ephemeris is doing the arithmetic.
 *
 * Two implementations exist on purpose:
 *
 *  - `astronomy-engine`  MIT, no licence to buy, ships everywhere including
 *                        the browser. Precision class 'interactive'.
 *  - `swisseph`          The professional reference. Requires the CHF 700
 *                        commercial licence for a hosted product (AGPL
 *                        otherwise, which would force all of Jade open).
 *                        Precision class 'reference'.
 *
 * Stored charts are always computed by a 'reference' provider. An
 * 'interactive' provider may drive live UI, but its results are re-verified
 * server-side before anything is saved or printed.
 */
export interface EphemerisProvider {
  readonly id: 'astronomy-engine' | 'swisseph-native' | 'swisseph-wasm';
  readonly precisionClass: 'reference' | 'interactive';

  /** Apparent geocentric position, true ecliptic of date. */
  position(body: PointId, jdUt: number): EclipticPosition;

  /** Greenwich apparent sidereal time in degrees [0, 360). */
  greenwichApparentSiderealTime(jdUt: number): number;

  /** True obliquity of the ecliptic, degrees. */
  trueObliquity(jdUt: number): number;
}
