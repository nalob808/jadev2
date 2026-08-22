import { atan2Deg, cosDeg, norm360, sinDeg, tanDeg } from './angles.js';
import type { EphemerisProvider } from './ephemeris/provider.js';
import type { GeoLocation, HouseSystem } from './types.js';

export interface Angles {
  /** Tropical apparent longitude of the ascendant, degrees. */
  readonly ascendantTropical: number;
  /** Tropical apparent longitude of the midheaven, degrees. */
  readonly midheavenTropical: number;
  /** Local apparent sidereal time, degrees. */
  readonly ramc: number;
  readonly obliquity: number;
}

/**
 * Ascendant and midheaven from local sidereal time, obliquity and latitude.
 *
 * Standard spherical formulae:
 *   MC  : λ = atan2(sin θ, cos θ · cos ε)
 *   Asc : λ = atan2(cos θ, −(sin θ · cos ε + tan φ · sin ε))
 * where θ is the local apparent sidereal time as an angle.
 *
 * Polar caution: above the arctic/antarctic circles the ascendant is still
 * defined but house systems that depend on it degenerate. Jade computes it and
 * lets the caller decide; the UI flags |latitude| > 66.5°.
 */
export function computeAngles(
  provider: EphemerisProvider,
  jdUt: number,
  location: GeoLocation,
): Angles {
  const gast = provider.greenwichApparentSiderealTime(jdUt);
  const ramc = norm360(gast + location.longitude);
  const obliquity = provider.trueObliquity(jdUt);

  const midheavenTropical = norm360(atan2Deg(sinDeg(ramc), cosDeg(ramc) * cosDeg(obliquity)));

  const y = cosDeg(ramc);
  const x = -(sinDeg(ramc) * cosDeg(obliquity) + tanDeg(location.latitude) * sinDeg(obliquity));
  let ascendantTropical = norm360(atan2Deg(y, x));

  // Quadrant correction. atan2 resolves the angle but not which of the two
  // ecliptic points on the horizon is RISING. The ascendant always leads the
  // midheaven in zodiacal order by less than half a circle; when it doesn't,
  // we have the descendant. This matters rarely but catastrophically — without
  // it, high-latitude charts come out exactly 180° wrong.
  if (norm360(ascendantTropical - midheavenTropical) >= 180) {
    ascendantTropical = norm360(ascendantTropical + 180);
  }

  return { ascendantTropical, midheavenTropical, ramc, obliquity };
}

/**
 * House of a sidereal longitude.
 *
 * Whole sign is the Vedic default and the only system where "house" and "sign"
 * are the same object — house 1 is the entire sign the ascendant falls in.
 */
export function houseOf(
  siderealLongitude: number,
  siderealAscendant: number,
  system: HouseSystem,
): number {
  switch (system) {
    case 'whole_sign': {
      const ascSign = Math.floor(norm360(siderealAscendant) / 30);
      const bodySign = Math.floor(norm360(siderealLongitude) / 30);
      return ((bodySign - ascSign + 12) % 12) + 1;
    }
    case 'equal': {
      const delta = norm360(siderealLongitude - siderealAscendant);
      return Math.floor(delta / 30) + 1;
    }
    default:
      throw new Error(
        `houseOf: '${system}' is not implemented yet. Whole sign and equal only. ` +
          'See docs/03-calculation-spec.md §3 before adding a quadrant system.',
      );
  }
}

/** The twelve whole-sign cusps: each house begins at 0° of its sign. */
export function wholeSignCusps(siderealAscendant: number): number[] {
  const ascSign = Math.floor(norm360(siderealAscendant) / 30);
  return Array.from({ length: 12 }, (_, i) => ((ascSign + i) % 12) * 30);
}
