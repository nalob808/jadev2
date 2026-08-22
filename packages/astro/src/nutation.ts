import { NUTATION_TERMS } from './nutationTable.js';
import { DEG, norm360 } from './angles.js';
import { centuriesFromJ2000 } from './time.js';

export interface Nutation {
  /** Nutation in longitude, degrees. */
  readonly dPsi: number;
  /** Nutation in obliquity, degrees. */
  readonly dEps: number;
  /** Mean obliquity of the ecliptic, degrees. */
  readonly meanObliquity: number;
  /** True obliquity of the ecliptic, degrees. */
  readonly trueObliquity: number;
}

/** The five Delaunay arguments, degrees. Meeus ch. 22. */
export function delaunayArguments(t: number): [number, number, number, number, number] {
  return [
    norm360(297.85036 + 445267.11148 * t - 0.0019142 * t * t + (t * t * t) / 189474),
    norm360(357.52772 + 35999.05034 * t - 0.0001603 * t * t - (t * t * t) / 300000),
    norm360(134.96298 + 477198.867398 * t + 0.0086972 * t * t + (t * t * t) / 56250),
    norm360(93.27191 + 483202.017538 * t - 0.0036825 * t * t + (t * t * t) / 327270),
    norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000),
  ];
}

/**
 * Mean obliquity of the ecliptic, degrees. IAU 1980 / Laskar.
 * Accurate to about 0.01" over ±1000 years from J2000.
 */
export function meanObliquity(t: number): number {
  const seconds = 84381.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t;
  return seconds / 3600;
}

/** Nutation and obliquity at a Terrestrial Time Julian Day. */
export function nutation(jdTt: number): Nutation {
  const t = centuriesFromJ2000(jdTt);
  const [d, m, mp, f, om] = delaunayArguments(t);

  let dPsiArcsec = 0;
  let dEpsArcsec = 0;
  for (const term of NUTATION_TERMS) {
    const arg = (term[0] * d + term[1] * m + term[2] * mp + term[3] * f + term[4] * om) * DEG;
    dPsiArcsec += (term[5] + term[6] * t) * Math.sin(arg);
    dEpsArcsec += (term[7] + term[8] * t) * Math.cos(arg);
  }

  const dPsi = dPsiArcsec / 3600;
  const dEps = dEpsArcsec / 3600;
  const eps0 = meanObliquity(t);
  return { dPsi, dEps, meanObliquity: eps0, trueObliquity: eps0 + dEps };
}
