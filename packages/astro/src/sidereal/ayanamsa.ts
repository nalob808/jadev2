import { centuriesFromJ2000 } from '../time.js';
import { nutation } from '../nutation.js';

/**
 * Ayanāṁśa modes Jade supports. Each maps 1:1 onto a Swiss Ephemeris sidereal
 * mode so the two providers can never silently disagree about which zodiac
 * they are in.
 *
 * Never default this silently anywhere in the app — CLAUDE.md, non-negotiable #3.
 */
export type AyanamsaMode =
  | 'lahiri'
  | 'lahiri_true_chitra'
  | 'raman'
  | 'krishnamurti'
  | 'yukteshwar'
  | 'fagan_bradley'
  | 'suryasiddhanta'
  | 'custom';

export const AYANAMSA_LABELS: Record<AyanamsaMode, string> = {
  lahiri: 'Lahiri (Chitrapakṣa)',
  lahiri_true_chitra: 'True Citrā',
  raman: 'B. V. Raman',
  krishnamurti: 'Krishnamurti (KP)',
  yukteshwar: 'Yukteshwar',
  fagan_bradley: 'Fagan–Bradley',
  suryasiddhanta: 'Sūrya Siddhānta',
  custom: 'Custom offset',
};

/**
 * Cubic fits of the MEAN ayanāṁśa (nutation excluded), degrees, in Julian
 * centuries of TT from J2000.
 *
 * Fitted by least squares against Swiss Ephemeris over 1700–2200 at 3000
 * sample points. Measured max error for `lahiri`: 0.0002 arcsec — i.e. this
 * reproduces Swiss Ephemeris rather than approximating precession
 * independently. Regenerate with `python3 scripts/generate_fixtures.py --ayanamsa`.
 *
 * The v0 prototype used a bare precession polynomial with no reference epoch
 * calibration and drifted by arcminutes; that is why this exists.
 */
const MEAN_AYANAMSA_FIT: Partial<Record<AyanamsaMode, readonly [number, number, number, number]>> =
  {
    // [constant, ×T, ×T², ×T³]
    lahiri: [23.85709236051419, 1.396887925035841, 0.0003070810067976883, 1.5866507414720884e-8],
  };

export interface AyanamsaOptions {
  readonly mode: AyanamsaMode;
  /** Only used when mode === 'custom': degrees at J2000. */
  readonly customAtJ2000?: number;
  /**
   * Include nutation in longitude. TRUE is correct when subtracting from
   * apparent (true-equinox-of-date) tropical longitudes, which is what both
   * Jade providers produce. Swiss Ephemeris does the same internally.
   */
  readonly includeNutation?: boolean;
}

/**
 * Ayanāṁśa in degrees at a Terrestrial Time Julian Day.
 *
 * @throws if the mode has no fit yet — deliberately. A wrong zodiac is worse
 * than a missing feature, so unimplemented modes fail loudly rather than
 * falling back to Lahiri.
 */
export function ayanamsa(jdTt: number, options: AyanamsaOptions): number {
  const t = centuriesFromJ2000(jdTt);

  let mean: number;
  if (options.mode === 'custom') {
    if (options.customAtJ2000 === undefined) {
      throw new Error("ayanamsa: mode 'custom' requires customAtJ2000");
    }
    const lahiri = MEAN_AYANAMSA_FIT.lahiri!;
    // Custom offsets are defined as a constant shift from Lahiri's precession rate.
    mean = options.customAtJ2000 + lahiri[1] * t + lahiri[2] * t * t + lahiri[3] * t * t * t;
  } else {
    const fit = MEAN_AYANAMSA_FIT[options.mode];
    if (!fit) {
      throw new Error(
        `ayanamsa: mode '${options.mode}' is declared but not yet fitted. ` +
          'Add its coefficients via scripts/generate_fixtures.py --ayanamsa ' +
          'rather than falling back to another zodiac.',
      );
    }
    mean = fit[0] + fit[1] * t + fit[2] * t * t + fit[3] * t * t * t;
  }

  if (options.includeNutation === false) return mean;
  return mean + nutation(jdTt).dPsi;
}
