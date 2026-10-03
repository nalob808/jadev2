import { norm360 } from './angles.js';
import type { EphemerisProvider } from './ephemeris/provider.js';
import { ayanamsa } from './sidereal/ayanamsa.js';
import { jdTtFromJdUt } from './time.js';
import type { SiderealFrame } from './transits/scan.js';
import { findSteps, stepWindow } from './transits/roots.js';
import { KARANA_SPAN_DEGREES, NAKSHATRA_SPAN_DEGREES, TITHI_SPAN_DEGREES } from './panchanga.js';

/**
 * When each limb of the pañcāṅga began, and when it turns.
 *
 * ## Why this is separate from `panchanga.ts`
 *
 * That module is pure arithmetic on two longitudes: hand it a Sun and a Moon
 * and it tells you which tithi you are in. It takes no provider and makes no
 * search, which is what lets it run inside a chart computation for free.
 *
 * Boundaries are a different cost and a different shape. Finding when a tithi
 * turns means asking the ephemeris where the Moon and Sun are, repeatedly,
 * until the answer converges — dozens of evaluations per boundary. Putting
 * that inside `panchangaOf` would make every chart pay for dates almost no
 * chart uses.
 *
 * ## Why this is the piece everything else was waiting on
 *
 * The pañcāṅga used to report only `elapsed`, a fraction. A fraction tells you
 * how far through a tithi you are and not when it ends, and *when it ends* is
 * the entire question muhūrta asks. Rāhu kāla, Abhijit, Durmuhūrta, Varjyam,
 * Choghaḍiyā and the whole constraint-solving half of the discipline are
 * windows between instants — and there were no instants.
 *
 * ## The method, and the trap that was walked into first
 *
 * Each limb is a 0–360° quantity cut into equal buckets, so a boundary is a
 * *step*, not a zero crossing. The obvious move — hand a root finder the
 * signed distance to the nearest boundary — looks right and reports a
 * spurious boundary halfway through every tithi, because that sawtooth jumps
 * from +half a bucket to −half in the middle of each one and a root finder
 * cannot tell a jump from a crossing. `findSteps` bisects on the bucket index
 * changing instead, assuming no continuity at all.
 *
 * The comb is sized to the fastest limb. The Moon gains on the Sun at roughly
 * 12°/day, so a tithi lasts about a day and a karaṇa about half of one; a
 * two-hour comb has eight samples inside the shortest of them, which is enough
 * margin that a boundary cannot be stepped over even when the Moon is at
 * perigee and moving fastest.
 *
 * ## Sidereal, like everything else
 *
 * Tithi, karaṇa and yoga are differences and sums of two longitudes, so the
 * ayanāṁśa cancels and the frame does not matter. The nakṣatra is an absolute
 * position and it matters completely — a boundary found in tropical longitudes
 * would be off by the whole ayanāṁśa, about 24°, which is two nakṣatras. The
 * frame is therefore a required argument rather than an option with a default.
 */

/** Two hours. Eight samples inside the shortest karaṇa, at any lunar speed. */
const COMB_DAYS = 2 / 24;

/** How far back and forward a search will look before giving up: three days. */
const HORIZON_DAYS = 3;

/** One limb of the pañcāṅga, with the instants it runs between. */
export interface LimbWindow {
  /** When this one began. Null when it is further back than the horizon. */
  readonly fromJd: number | null;
  /** When it turns. Null when it is further ahead than the horizon. */
  readonly toJd: number | null;
  /** How far through, 0–1, at the instant asked about. */
  readonly elapsed: number;
}

export interface PanchangaWindows {
  readonly tithi: LimbWindow;
  readonly nakshatra: LimbWindow;
  readonly yoga: LimbWindow;
  readonly karana: LimbWindow;
}

/** The sidereal Sun and Moon at an instant, which is all any limb needs. */
function luminaries(
  provider: EphemerisProvider,
  jdUt: number,
  frame: SiderealFrame,
): { sun: number; moon: number } {
  const correction = ayanamsa(jdTtFromJdUt(jdUt), {
    mode: frame.ayanamsa,
    customAtJ2000: frame.customAyanamsaAtJ2000,
    includeNutation: true,
  });
  return {
    sun: norm360(provider.position('Sun', jdUt).longitude - correction),
    moon: norm360(provider.position('Moon', jdUt).longitude - correction),
  };
}

/**
 * The window around `jdUt` for one limb.
 *
 * `angleAt` returns the limb's underlying 0–360° quantity and `span` is the
 * size of one bucket; everything else is the same search for every limb.
 */
function windowFor(angleAt: (jd: number) => number, span: number, jdUt: number): LimbWindow {
  const index = (jd: number): number => Math.floor(norm360(angleAt(jd)) / span);
  const { fromJd, toJd } = stepWindow(index, jdUt, HORIZON_DAYS, { stepDays: COMB_DAYS });

  const into = norm360(angleAt(jdUt)) % span;
  return { fromJd, toJd, elapsed: into / span };
}

/**
 * Every limb's window at one instant.
 *
 * Costs roughly 200 ephemeris calls. Right for a pañcāṅga page or a muhūrta
 * search over a day; wrong inside a loop over a year, which should call
 * `windowFor`-shaped searches once over the whole span instead.
 */
export function panchangaWindows(
  provider: EphemerisProvider,
  jdUt: number,
  frame: SiderealFrame,
): PanchangaWindows {
  const at = (jd: number) => luminaries(provider, jd, frame);

  return {
    tithi: windowFor(
      (jd) => {
        const { sun, moon } = at(jd);
        return norm360(moon - sun);
      },
      TITHI_SPAN_DEGREES,
      jdUt,
    ),

    karana: windowFor(
      (jd) => {
        const { sun, moon } = at(jd);
        return norm360(moon - sun);
      },
      KARANA_SPAN_DEGREES,
      jdUt,
    ),

    nakshatra: windowFor((jd) => at(jd).moon, NAKSHATRA_SPAN_DEGREES, jdUt),

    yoga: windowFor(
      (jd) => {
        const { sun, moon } = at(jd);
        return norm360(sun + moon);
      },
      NAKSHATRA_SPAN_DEGREES,
      jdUt,
    ),
  };
}

/**
 * Every nakṣatra the Moon enters in a window.
 *
 * The one ingress `findIngresses` could never report: it walks sign
 * boundaries, so a nakṣatra change — which happens roughly every day — had no
 * dated form anywhere in Jade, surviving only as a per-day boolean on the
 * outlook. Daily practice is organised around it.
 */
export function moonNakshatraIngresses(
  provider: EphemerisProvider,
  fromJd: number,
  toJd: number,
  frame: SiderealFrame,
): { jdUt: number; nakshatraIndex: number }[] {
  const index = (jd: number): number =>
    Math.floor(luminaries(provider, jd, frame).moon / NAKSHATRA_SPAN_DEGREES);

  return findSteps(index, fromJd, toJd, { stepDays: COMB_DAYS }).map((step) => ({
    jdUt: step.jdUt,
    nakshatraIndex: step.to,
  }));
}
