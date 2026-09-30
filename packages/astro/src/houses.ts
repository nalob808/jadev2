import { asinDeg, atan2Deg, cosDeg, norm360, sinDeg, tanDeg, wrap180 } from './angles.js';
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
      /*
       * The quadrant systems are implemented, but not here: their cusps need
       * the sidereal time, the obliquity and the latitude, none of which an
       * ascendant degree carries. `houseCusps` builds them and `houseOfCusps`
       * places a longitude against them. This signature stays for the callers
       * that genuinely only have a lagna — the rectification sweep reads its
       * rules in rāśi — and refuses rather than pretending.
       */
      throw new Error(
        `houseOf: '${system}' needs cusps, which an ascendant alone cannot give. ` +
          'Use houseCusps() and houseOfCusps().',
      );
  }
}

/** The twelve whole-sign cusps: each house begins at 0° of its sign. */
export function wholeSignCusps(siderealAscendant: number): number[] {
  const ascSign = Math.floor(norm360(siderealAscendant) / 30);
  return Array.from({ length: 12 }, (_, i) => ((ascSign + i) % 12) * 30);
}

/* -------------------------------------------------------------- quadrants */

/**
 * A house system that has no answer for this chart.
 *
 * Placidus is the case that matters: its cusps are defined as fractions of a
 * point's day arc, and a point that never sets has no day arc to take a
 * fraction of. Above the polar circles some of the four computed cusps simply
 * do not exist.
 *
 * Most software silently substitutes Porphyry there. Jade refuses, because a
 * chart that says "Placidus" and is not Placidus is the same failure as a chart
 * that hides its ayanāṁśa (CLAUDE.md #3). The caller catches this and offers
 * the reader a system that works at their latitude.
 */
export class HouseSystemUndefinedError extends Error {
  readonly system: HouseSystem;
  readonly latitude: number;

  constructor(system: HouseSystem, latitude: number, detail: string) {
    super(`${system} houses are undefined at latitude ${latitude.toFixed(4)}°: ${detail}`);
    this.name = 'HouseSystemUndefinedError';
    this.system = system;
    this.latitude = latitude;
  }
}

/** The ecliptic longitude and declination of the ecliptic point at a right ascension. */
function eclipticPointAt(
  rightAscension: number,
  obliquity: number,
): {
  longitude: number;
  declination: number;
} {
  const longitude = norm360(
    atan2Deg(sinDeg(rightAscension), cosDeg(rightAscension) * cosDeg(obliquity)),
  );
  const declination = asinDeg(sinDeg(obliquity) * sinDeg(longitude));
  return { longitude, declination };
}

/**
 * How far a point's rising is displaced from due east, in degrees of RA.
 *
 * Half the difference between its day arc and twelve hours. Undefined when the
 * point is circumpolar, which is exactly when Placidus has no answer.
 */
function ascensionalDifference(declination: number, latitude: number): number {
  const sine = tanDeg(latitude) * tanDeg(declination);
  if (!Number.isFinite(sine) || Math.abs(sine) > 1) return Number.NaN;
  return asinDeg(sine);
}

/** The four Placidus cusps, as a fraction of the day arc and a starting guess. */
const PLACIDUS_STEPS = [
  { house: 11, fraction: 1 / 3, nocturnal: false, guess: 30 },
  { house: 12, fraction: 2 / 3, nocturnal: false, guess: 60 },
  { house: 2, fraction: 2 / 3, nocturnal: true, guess: 120 },
  { house: 3, fraction: 1 / 3, nocturnal: true, guess: 150 },
] as const;

/**
 * Placidus cusps, tropical, house 1 first.
 *
 * Placidus divides *time*, not space: the 11th cusp is the ecliptic point that
 * has used a third of its day arc since crossing the meridian, the 12th two
 * thirds, and the 2nd and 3rd the same fractions of the night arc below the
 * horizon. That definition is implicit — the answer depends on the declination
 * of the point you are solving for — so each cusp is found by iterating the
 * definition until it stops moving.
 *
 * Verified against Swiss Ephemeris on every golden chart where Placidus is
 * defined; worst case under a milliarcsecond. See `test/houses.test.ts`.
 */
export function placidusCusps(angles: Angles, latitude: number): number[] {
  const { ramc, obliquity } = angles;
  const solved = new Map<number, number>();

  for (const step of PLACIDUS_STEPS) {
    let rightAscension = ramc + step.guess;
    let converged = false;

    /*
     * Fixed-point iteration. It contracts sharply away from the poles — three
     * or four rounds is typical — and the cap exists so that a chart where it
     * does not converge raises rather than returning whatever the last guess
     * happened to be.
     */
    for (let round = 0; round < 100; round += 1) {
      const { declination } = eclipticPointAt(rightAscension, obliquity);
      const difference = ascensionalDifference(declination, latitude);
      if (Number.isNaN(difference)) {
        throw new HouseSystemUndefinedError(
          'placidus',
          latitude,
          `the ecliptic point on the ${step.house}th cusp never sets, so it has no day arc to divide`,
        );
      }

      const next = step.nocturnal
        ? ramc + 180 - step.fraction * (90 - difference)
        : ramc + step.fraction * (90 + difference);

      const moved = Math.abs(wrap180(next - rightAscension));
      rightAscension = next;
      if (moved < 1e-11) {
        converged = true;
        break;
      }
    }

    if (!converged) {
      throw new HouseSystemUndefinedError(
        'placidus',
        latitude,
        `the ${step.house}th cusp did not converge`,
      );
    }

    solved.set(step.house, eclipticPointAt(rightAscension, obliquity).longitude);
  }

  const cusps = new Array<number>(12);
  cusps[0] = norm360(angles.ascendantTropical);
  cusps[9] = norm360(angles.midheavenTropical);
  for (const [house, longitude] of solved) cusps[house - 1] = longitude;
  /* The remaining six are the opposites of the six already solved. */
  for (let house = 4; house <= 9; house += 1) {
    cusps[house - 1] = norm360(cusps[(house + 5) % 12]! + 180);
  }
  return cusps;
}

/**
 * Porphyry cusps — the two quadrants either side of the meridian, trisected.
 *
 * The oldest quadrant system and the simplest: no declination, no iteration,
 * just the arc from the midheaven to the ascendant cut in three, and the arc
 * from the ascendant to the lower midheaven cut in three. Defined wherever an
 * ascendant is, which is why Jade can offer it at latitudes where Placidus
 * cannot be computed at all.
 *
 * In Jyotiṣa these same twelve longitudes are the **bhāva madhya** — the middle
 * of each house rather than its edge. `sripatiCusps` takes that step.
 */
export function porphyryCusps(ascendant: number, midheaven: number): number[] {
  const toAscendant = norm360(ascendant - midheaven);
  const toLowerMidheaven = norm360(midheaven + 180 - ascendant);

  const cusps = new Array<number>(12);
  cusps[0] = norm360(ascendant);
  cusps[9] = norm360(midheaven);
  cusps[10] = norm360(midheaven + toAscendant / 3);
  cusps[11] = norm360(midheaven + (2 * toAscendant) / 3);
  cusps[1] = norm360(ascendant + toLowerMidheaven / 3);
  cusps[2] = norm360(ascendant + (2 * toLowerMidheaven) / 3);
  /* The remaining six are the opposites of the six already solved. */
  for (let house = 4; house <= 9; house += 1) {
    cusps[house - 1] = norm360(cusps[(house + 5) % 12]! + 180);
  }
  return cusps;
}

/** The point halfway from `from` to `to`, travelling forward through the zodiac. */
function midpointForward(from: number, to: number): number {
  return norm360(from + norm360(to - from) / 2);
}

/**
 * Śrīpati bhāva boundaries.
 *
 * Śrīpati reads the Porphyry longitudes as bhāva **madhya**, the middle of each
 * house, and puts the boundary — the bhāva sandhi — halfway between one madhya
 * and the next. So the ascendant degree sits at the *centre* of the first
 * bhāva, not at its edge.
 *
 * That difference is the whole argument the system exists to settle: a graha at
 * 29° of the lagna rāśi is in the first house by whole sign and very often in
 * the second bhāva by Śrīpati, and practitioners who use both want to see the
 * two answers side by side rather than pick one.
 */
export function sripatiCusps(ascendant: number, midheaven: number): number[] {
  const madhyas = porphyryCusps(ascendant, midheaven);
  return madhyas.map((madhya, index) => midpointForward(madhyas[(index + 11) % 12]!, madhya));
}

/** The twelve equal cusps: house 1 begins at the ascendant degree. */
export function equalCusps(siderealAscendant: number): number[] {
  return Array.from({ length: 12 }, (_, i) => norm360(siderealAscendant + i * 30));
}

/**
 * Which house a longitude falls in, given the twelve cusps.
 *
 * The only house-assignment function that works for every system, because it
 * asks the cusps rather than re-deriving them. Houses are unequal in a quadrant
 * system — at high latitude wildly so — so "which 30° block is this in" is not
 * an answer, and neither is anything measured from the ascendant.
 */
export function houseOfCusps(longitude: number, cusps: readonly number[]): number {
  const position = norm360(longitude);
  for (let house = 1; house <= 12; house += 1) {
    const into = norm360(position - cusps[house - 1]!);
    const span = norm360(cusps[house % 12]! - cusps[house - 1]!);
    if (into < span) return house;
  }
  /*
   * Unreachable for a well-formed cusp set: the twelve spans sum to 360°, so
   * every longitude is inside exactly one. It is here because "no house" is not
   * an answer a chart can carry, and a cusp set malformed enough to get here
   * would be a bug worth seeing as a wrong house rather than a crash.
   */
  return 1;
}

/** What `houseCusps` needs to place a quadrant system. */
export interface HouseFrameInput {
  readonly angles: Angles;
  readonly latitude: number;
  /** Degrees subtracted from a tropical longitude to reach the sidereal one. */
  readonly ayanamsa: number;
}

/**
 * The twelve sidereal cusps for a house system.
 *
 * One entry point so that no surface picks its own. Whole sign and equal need
 * only the ascendant; the quadrant systems need the sidereal time, the
 * obliquity and the latitude, which is why the input is a frame rather than a
 * number.
 */
export function houseCusps(system: HouseSystem, input: HouseFrameInput): number[] {
  const ascendant = norm360(input.angles.ascendantTropical - input.ayanamsa);
  const midheaven = norm360(input.angles.midheavenTropical - input.ayanamsa);

  switch (system) {
    case 'whole_sign':
      return wholeSignCusps(ascendant);
    case 'equal':
      return equalCusps(ascendant);
    case 'sripati':
      return sripatiCusps(ascendant, midheaven);
    case 'placidus':
      return placidusCusps(input.angles, input.latitude).map((cusp) =>
        norm360(cusp - input.ayanamsa),
      );
  }
}
