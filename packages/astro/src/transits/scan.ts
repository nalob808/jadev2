import { norm360, wrap180 } from '../angles.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { ayanamsa, type AyanamsaMode } from '../sidereal/ayanamsa.js';
import { jdTtFromJdUt } from '../time.js';
import { SIGNS, type PointId } from '../types.js';

/**
 * Transit scanning — finding the moments when the sky does something.
 *
 * Three questions, and they are the ones every predictive feature is built on:
 * when does a graha change sign, when does it turn, and when does it cross a
 * particular degree.
 *
 * All three are the same shape of problem — a continuous function crossing a
 * threshold — and all three are solved the same way: step coarsely until the
 * sign of something flips, then bisect to whatever precision is asked for.
 * Nothing here samples and reports the sample; every returned time is a
 * bisected root.
 *
 * **These scans are sidereal.** The ephemeris provider returns tropical
 * longitudes in the ecliptic of date, and the ayanāṁśa has to come off before
 * anything is compared to a sign boundary or a natal degree. Scanning the
 * provider's raw output instead puts every ingress about twenty-four degrees —
 * and for Saturn, nearly two years — away from where it belongs, while still
 * producing a plausible-looking list of dates.
 *
 * **The retrograde case is the whole difficulty.** A graha that turns
 * retrograde shortly after passing a degree crosses it again going backwards
 * and a third time going forwards. Saturn over a natal Moon is not one event,
 * it is usually three, spread over months, and a scanner that returns the first
 * one and stops is wrong in a way nobody notices until a client asks why the
 * date was off. The step has to be small enough to catch a retrograde loop, and
 * the search must keep going after the first hit.
 */

export interface ScanWindow {
  readonly fromJd: number;
  readonly toJd: number;
}

export interface SiderealFrame {
  /** Which ayanāṁśa. Never defaulted silently — see CLAUDE.md non-negotiable #3. */
  readonly ayanamsa: AyanamsaMode;
  readonly customAyanamsaAtJ2000?: number;
}

/**
 * Sidereal longitude of a body, the same way `computeChart` derives it: the
 * provider's tropical position with the ayanāṁśa of that instant removed.
 */
export function siderealLongitudeAt(
  provider: EphemerisProvider,
  body: PointId,
  jdUt: number,
  frame: SiderealFrame,
): number {
  const value = ayanamsa(jdTtFromJdUt(jdUt), {
    mode: frame.ayanamsa,
    customAtJ2000: frame.customAyanamsaAtJ2000,
    includeNutation: true,
  });
  return norm360(provider.position(body, jdUt).longitude - value);
}

export interface ScanOptions {
  /**
   * Coarse step in days. Must be well under the shortest interval between two
   * crossings, or a retrograde loop is stepped straight over.
   */
  readonly stepDays?: number;
  /** Bisection tolerance in days. One second is 1.16e-5. */
  readonly toleranceDays?: number;
}

/** Default steps, per body. The Moon needs a much finer comb than Saturn. */
export const DEFAULT_STEP_DAYS: Partial<Record<PointId, number>> = {
  Moon: 0.25,
  Mercury: 1,
  Venus: 1,
  Sun: 1,
  Mars: 2,
  Jupiter: 2,
  Saturn: 2,
  Rahu: 2,
  Ketu: 2,
};

const stepFor = (body: PointId, options: ScanOptions): number =>
  options.stepDays ?? DEFAULT_STEP_DAYS[body] ?? 1;

/**
 * Bisect a sign-changing function to a root.
 *
 * `f` must have opposite signs at the ends. Returns the crossing time.
 */
function bisect(
  f: (jd: number) => number,
  lowJd: number,
  highJd: number,
  toleranceDays: number,
): number {
  let low = lowJd;
  let high = highJd;
  let fLow = f(low);
  // A hard guard: 200 halvings takes any realistic window below any realistic
  // tolerance, and a function that does not converge should stop rather than
  // spin.
  for (let i = 0; i < 200 && high - low > toleranceDays; i += 1) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (fMid === 0) return mid;
    if (fLow < 0 !== fMid < 0) high = mid;
    else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

export interface Ingress {
  readonly body: PointId;
  readonly jdUt: number;
  /** The sign being entered, 0–11. */
  readonly signIndex: number;
  readonly sign: string;
  /** True when the graha backs into the sign it just left. */
  readonly retrograde: boolean;
}

/**
 * Every sign change in the window.
 *
 * A retrograde graha near a cusp can enter, back out, and enter again. All
 * three are returned, each flagged, because "Saturn enters Pisces" on a date
 * that it later leaves again is a statement a practitioner has to be able to
 * see the shape of.
 */
export function findIngresses(
  provider: EphemerisProvider,
  body: PointId,
  window: ScanWindow,
  frame: SiderealFrame,
  options: ScanOptions = {},
): Ingress[] {
  const step = stepFor(body, options);
  const tolerance = options.toleranceDays ?? 1e-5;
  const longitudeAt = (jd: number): number => siderealLongitudeAt(provider, body, jd, frame);

  const out: Ingress[] = [];
  let previousJd = window.fromJd;
  let previousSign = Math.floor(longitudeAt(previousJd) / 30);

  for (let jd = window.fromJd + step; jd <= window.toJd; jd += step) {
    const sign = Math.floor(longitudeAt(jd) / 30);
    if (sign !== previousSign) {
      // The boundary that was crossed is the start of whichever sign is
      // "ahead" in the direction of travel. Measuring the distance to that
      // boundary gives a function that changes sign exactly at the ingress.
      const forward = (sign - previousSign + 12) % 12 === 1;
      const boundary = (forward ? sign : previousSign) * 30;
      const distance = (jd2: number): number => wrap180(longitudeAt(jd2) - boundary);
      const crossing = bisect(distance, previousJd, jd, tolerance);
      out.push({
        body,
        jdUt: crossing,
        signIndex: sign,
        sign: SIGNS[sign]!,
        retrograde: !forward,
      });
    }
    previousSign = sign;
    previousJd = jd;
  }
  return out;
}

export type StationDirection = 'retrograde' | 'direct';

export interface Station {
  readonly body: PointId;
  readonly jdUt: number;
  /** Which way it is turning: `retrograde` means it is stopping and backing up. */
  readonly direction: StationDirection;
  readonly longitude: number;
  readonly signIndex: number;
  readonly sign: string;
}

/** Every station — the moments a graha's apparent motion changes direction. */
export function findStations(
  provider: EphemerisProvider,
  body: PointId,
  window: ScanWindow,
  frame: SiderealFrame,
  options: ScanOptions = {},
): Station[] {
  const step = stepFor(body, options);
  const tolerance = options.toleranceDays ?? 1e-5;
  const speedAt = (jd: number): number => provider.position(body, jd).speed;

  const out: Station[] = [];
  let previousJd = window.fromJd;
  let previousSpeed = speedAt(previousJd);

  for (let jd = window.fromJd + step; jd <= window.toJd; jd += step) {
    const speed = speedAt(jd);
    if (previousSpeed < 0 !== speed < 0) {
      const crossing = bisect(speedAt, previousJd, jd, tolerance);
      const longitude = siderealLongitudeAt(provider, body, crossing, frame);
      const signIndex = Math.floor(longitude / 30);
      out.push({
        body,
        jdUt: crossing,
        direction: speed < 0 ? 'retrograde' : 'direct',
        longitude,
        signIndex,
        sign: SIGNS[signIndex]!,
      });
    }
    previousSpeed = speed;
    previousJd = jd;
  }
  return out;
}

export interface Crossing {
  readonly body: PointId;
  readonly jdUt: number;
  /** The degree crossed. */
  readonly targetLongitude: number;
  readonly retrograde: boolean;
  /**
   * Which pass this is over the same degree in one retrograde loop: 1, 2 or 3.
   * A single direct pass is always 1.
   */
  readonly pass: number;
}

/**
 * Every time `body` crosses `targetLongitude` in the window.
 *
 * This is the one that has to handle the retrograde loop. Saturn over a natal
 * Moon is typically three contacts spread across the better part of a year, and
 * they are the dates a practitioner actually gives out. Returning only the
 * first is the classic error.
 */
export function findCrossings(
  provider: EphemerisProvider,
  body: PointId,
  targetLongitude: number,
  window: ScanWindow,
  frame: SiderealFrame,
  options: ScanOptions = {},
): Crossing[] {
  const step = stepFor(body, options);
  const tolerance = options.toleranceDays ?? 1e-5;
  // The target is a natal sidereal degree, so the transiting position must be
  // sidereal too.
  const target = norm360(targetLongitude);
  // Signed separation from the target, in (-180, 180]. It passes through zero
  // exactly at a crossing, and it is continuous as long as the step never lets
  // the body travel more than 180° — which no graha does at these steps.
  const separation = (jd: number): number =>
    wrap180(siderealLongitudeAt(provider, body, jd, frame) - target);

  const found: Crossing[] = [];
  let previousJd = window.fromJd;
  let previousSeparation = separation(previousJd);

  for (let jd = window.fromJd + step; jd <= window.toJd; jd += step) {
    const current = separation(jd);
    // Guard against the wrap: a jump of more than 180° between samples is the
    // body passing the far side, not a crossing of the target.
    const jumped = Math.abs(current - previousSeparation) > 180;
    if (!jumped && previousSeparation < 0 !== current < 0) {
      const crossing = bisect(separation, previousJd, jd, tolerance);
      found.push({
        body,
        jdUt: crossing,
        targetLongitude: target,
        retrograde: provider.position(body, crossing).speed < 0,
        pass: 0,
      });
    }
    previousSeparation = current;
    previousJd = jd;
  }

  // Number the passes within each retrograde loop. Contacts closer together
  // than a year belong to the same loop for the slow grahas; the Moon's
  // monthly returns are separate events and each is a first pass.
  const loopWindowDays = body === 'Moon' ? 3 : body === 'Sun' ? 30 : 400;
  return found.map((c, i) => {
    let pass = 1;
    for (let k = i - 1; k >= 0; k -= 1) {
      if (c.jdUt - found[k]!.jdUt > loopWindowDays) break;
      pass += 1;
    }
    return { ...c, pass };
  });
}
