import { norm360, wrap180 } from '../angles.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { retrogradeFrom } from '../motion.js';
import { NAKSHATRA_SPAN, nakshatraOf } from '../nakshatra.js';
import { ayanamsa, type AyanamsaMode } from '../sidereal/ayanamsa.js';
import { jdTtFromJdUt } from '../time.js';
import type { NodeType, Outer, PointId, PositionBasis, Graha } from '../types.js';

/**
 * The three dials a graphic ephemeris can be read through.
 *
 * `nakshatra` is written as 360 / 27 rather than a rounded decimal. A rounded
 * 13.3333 degree dial drifts by more than thirty arcseconds by Revatī, which is
 * large enough to put a contact on the wrong side of a professional chart's
 * printed minute.
 */
export const GRAPHIC_EPHEMERIS_MODULI = {
  longitude: 360,
  rashi: 30,
  nakshatra: NAKSHATRA_SPAN,
} as const;

export type GraphicEphemerisFold = keyof typeof GRAPHIC_EPHEMERIS_MODULI;

/** A point the ephemeris provider can move. Angles need a place and are natal references only. */
export type GraphicEphemerisBody = Graha | Outer;

export interface GraphicEphemerisWindow {
  readonly fromJd: number;
  readonly toJd: number;
}

/**
 * Every setting that changes a plotted longitude.
 *
 * They are required even though a provider may have been constructed with the
 * same node type. Keeping them in the result lets the renderer state the frame
 * on screen, and prevents a cached series from losing the settings that made
 * it reproducible.
 */
export interface GraphicEphemerisFrame {
  readonly ayanamsa: AyanamsaMode;
  readonly customAyanamsaAtJ2000?: number;
  readonly nodeType: NodeType;
  readonly positionBasis: PositionBasis;
}

export interface GraphicEphemerisNatalPoint {
  readonly id: PointId;
  /** Natal sidereal longitude, degrees. Normalised by the series builder. */
  readonly longitude: number;
}

export interface GraphicEphemerisEpoch {
  readonly jdUt: number;
  /** The explicit ayanāṁśa removed at this sample, in degrees. */
  readonly ayanamsaValue: number;
}

export interface GraphicEphemerisSample {
  readonly jdUt: number;
  /** Sidereal ecliptic longitude, degrees in [0, 360). */
  readonly longitude: number;
  /**
   * The same longitude with revolutions retained.
   *
   * This is what keeps a curve continuous through 0° and lets a renderer split
   * a folded path at the real boundary instead of drawing a false diagonal.
   */
  readonly unwrappedLongitude: number;
  /** True ecliptic latitude from the provider. It is reported, but not used as y. */
  readonly latitude: number;
  /** Longitude speed in degrees per day. */
  readonly speed: number;
  readonly retrograde: boolean;
}

export interface GraphicEphemerisTrack {
  readonly body: GraphicEphemerisBody;
  readonly samples: readonly GraphicEphemerisSample[];
}

export interface GraphicEphemerisContact {
  readonly fold: GraphicEphemerisFold;
  readonly modulus: number;
  readonly transiting: GraphicEphemerisBody;
  readonly natalPoint: PointId;
  readonly jdUt: number;
  /** Exact sidereal longitude at the refined root. */
  readonly transitLongitude: number;
  readonly natalLongitude: number;
  /** The horizontal reference line both positions share on this dial. */
  readonly foldedLongitude: number;
  /** Signed shortest separation, useful for naming the contact without guessing. */
  readonly separation: number;
  readonly nakshatraIndex: number;
  readonly retrograde: boolean;
}

export interface GraphicEphemerisSeries {
  readonly window: GraphicEphemerisWindow;
  readonly stepDays: number;
  readonly frame: GraphicEphemerisFrame & {
    readonly providerId: EphemerisProvider['id'];
    readonly precisionClass: EphemerisProvider['precisionClass'];
  };
  /** One shared time grid; every track has exactly this many aligned samples. */
  readonly epochs: readonly GraphicEphemerisEpoch[];
  readonly natal: readonly GraphicEphemerisNatalPoint[];
  readonly tracks: readonly GraphicEphemerisTrack[];
  /** Contacts per dial; a dial not asked for in `options.folds` is absent. */
  readonly contacts: Readonly<
    Partial<Record<GraphicEphemerisFold, readonly GraphicEphemerisContact[]>>
  >;
}

export interface GraphicEphemerisOptions {
  readonly bodies: readonly GraphicEphemerisBody[];
  readonly natal: readonly GraphicEphemerisNatalPoint[];
  /** Sampling interval. Required: the caller chooses resolution for its window. */
  readonly stepDays: number;
  /** Root tolerance in days. Defaults to 10⁻⁶ days, about 0.086 seconds. */
  readonly toleranceDays?: number;
  /**
   * Which dials to find contacts on. Defaults to all three. The tracks are
   * shared, but each dial's contacts are a separate root search, and a view
   * showing one dial should not pay for the other two.
   */
  readonly folds?: readonly GraphicEphemerisFold[];
}

const FOLDS = Object.keys(GRAPHIC_EPHEMERIS_MODULI) as GraphicEphemerisFold[];
const ANGLES: ReadonlySet<PointId> = new Set<PointId>(['Ascendant', 'Midheaven']);
const EPSILON = 1e-9;

/** Normalise a longitude onto one of the three supported dials. */
export function foldLongitude(longitude: number, fold: GraphicEphemerisFold): number {
  if (!Number.isFinite(longitude)) throw new RangeError('longitude must be finite');
  const modulus = GRAPHIC_EPHEMERIS_MODULI[fold];
  const value = ((longitude % modulus) + modulus) % modulus;
  // Floating arithmetic can leave a value one ulp below the upper boundary.
  // On a dial that is the zero line, never a second almost-identical line.
  return modulus - value < 1e-10 || Math.abs(value) < 1e-10 ? 0 : value;
}

function assertInputs(
  window: GraphicEphemerisWindow,
  frame: GraphicEphemerisFrame,
  options: GraphicEphemerisOptions,
): void {
  if (!Number.isFinite(window.fromJd) || !Number.isFinite(window.toJd)) {
    throw new RangeError('graphic ephemeris window must contain finite Julian Days');
  }
  if (window.toJd <= window.fromJd) {
    throw new RangeError('graphic ephemeris window must end after it starts');
  }
  if (!Number.isFinite(options.stepDays) || options.stepDays <= 0) {
    throw new RangeError('graphic ephemeris stepDays must be a positive finite number');
  }
  if (options.stepDays > (options.bodies.includes('Moon') ? 1 : 2)) {
    throw new RangeError(
      options.bodies.includes('Moon')
        ? 'graphic ephemeris stepDays must be at most 1 day when the Moon is present'
        : 'graphic ephemeris stepDays must be at most 2 days',
    );
  }
  const tolerance = options.toleranceDays ?? 1e-6;
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance >= options.stepDays) {
    throw new RangeError('toleranceDays must be positive, finite, and smaller than stepDays');
  }
  if (frame.ayanamsa === 'custom' && !Number.isFinite(frame.customAyanamsaAtJ2000)) {
    throw new RangeError('a custom ayanāṁśa requires customAyanamsaAtJ2000');
  }
  if (options.bodies.length === 0) throw new RangeError('at least one moving body is required');

  const bodies = new Set<string>();
  for (const body of options.bodies) {
    if (ANGLES.has(body)) throw new RangeError(`${body} is an angle, not a moving ephemeris body`);
    if (bodies.has(body)) throw new RangeError(`moving body '${body}' is duplicated`);
    bodies.add(body);
  }

  const natal = new Set<string>();
  for (const point of options.natal) {
    if (!Number.isFinite(point.longitude)) {
      throw new RangeError(`natal longitude for '${point.id}' must be finite`);
    }
    if (natal.has(point.id)) throw new RangeError(`natal point '${point.id}' is duplicated`);
    natal.add(point.id);
  }

  const count = Math.ceil((window.toJd - window.fromJd) / options.stepDays) + 1;
  if (count > 50_000) {
    throw new RangeError(
      'graphic ephemeris would exceed 50,000 samples; use a larger step or window',
    );
  }
}

function sampleTimes(window: GraphicEphemerisWindow, stepDays: number): number[] {
  const span = window.toJd - window.fromJd;
  const wholeSteps = Math.floor(span / stepDays + EPSILON);
  const times = Array.from(
    { length: wholeSteps + 1 },
    (_, index) => window.fromJd + index * stepDays,
  );
  const last = times[times.length - 1]!;
  if (Math.abs(last - window.toJd) <= EPSILON) times[times.length - 1] = window.toJd;
  else times.push(window.toJd);
  return times;
}

function ayanamsaAt(jdUt: number, frame: GraphicEphemerisFrame): number {
  return ayanamsa(jdTtFromJdUt(jdUt), {
    mode: frame.ayanamsa,
    customAtJ2000: frame.customAyanamsaAtJ2000,
    includeNutation: true,
  });
}

interface ExactPosition {
  readonly longitude: number;
  readonly latitude: number;
  readonly speed: number;
  readonly retrograde: boolean;
}

function positionAt(
  provider: EphemerisProvider,
  body: GraphicEphemerisBody,
  jdUt: number,
  frame: GraphicEphemerisFrame,
  ayanamsaValue = ayanamsaAt(jdUt, frame),
): ExactPosition {
  const position = provider.position(body, jdUt, frame.positionBasis);
  return {
    longitude: norm360(position.longitude - ayanamsaValue),
    latitude: position.latitude,
    speed: position.speed,
    retrograde: retrogradeFrom(body, position.speed, frame.nodeType),
  };
}

function bisectContact(
  provider: EphemerisProvider,
  body: GraphicEphemerisBody,
  targetLongitude: number,
  lowJd: number,
  highJd: number,
  frame: GraphicEphemerisFrame,
  toleranceDays: number,
): number {
  const target = norm360(targetLongitude);
  const distance = (jdUt: number): number =>
    wrap180(positionAt(provider, body, jdUt, frame).longitude - target);

  let low = lowJd;
  let high = highJd;
  let fLow = distance(low);
  let fHigh = distance(high);
  if (Math.abs(fLow) < 1e-12) return low;
  if (Math.abs(fHigh) < 1e-12) return high;

  // Every caller supplies a bracket discovered on the unwrapped curve. This
  // guard catches a step too coarse to preserve that branch before it can emit
  // a plausible but wrong date.
  if (fLow < 0 === fHigh < 0) {
    throw new Error(`contact root for ${body} at ${target.toFixed(8)}° is not bracketed`);
  }

  for (let iteration = 0; iteration < 200 && high - low > toleranceDays; iteration += 1) {
    const mid = (low + high) / 2;
    const fMid = distance(mid);
    if (Math.abs(fMid) < 1e-12) return mid;
    if (fLow < 0 !== fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  void fHigh;
  return (low + high) / 2;
}

interface FoldedNatalGroup {
  readonly foldedLongitude: number;
  readonly points: readonly GraphicEphemerisNatalPoint[];
}

function natalGroups(
  natal: readonly GraphicEphemerisNatalPoint[],
  fold: GraphicEphemerisFold,
): readonly FoldedNatalGroup[] {
  const groups = new Map<
    string,
    { foldedLongitude: number; points: GraphicEphemerisNatalPoint[] }
  >();
  for (const point of natal) {
    const foldedLongitude = foldLongitude(point.longitude, fold);
    // Points exactly one modulus apart must share one root calculation. Nine
    // decimals is far tighter than the sub-arcsecond promise of the provider.
    const key = foldedLongitude.toFixed(9);
    const group = groups.get(key);
    if (group) group.points.push(point);
    else groups.set(key, { foldedLongitude, points: [point] });
  }
  return [...groups.values()];
}

function thresholdsBetween(
  from: number,
  to: number,
  foldedLongitude: number,
  modulus: number,
): number[] {
  if (Math.abs(to - from) < EPSILON) return [];
  const thresholds: number[] = [];
  if (to > from) {
    const first = Math.floor((from - foldedLongitude) / modulus + EPSILON) + 1;
    const last = Math.floor((to - foldedLongitude) / modulus + EPSILON);
    for (let multiple = first; multiple <= last; multiple += 1) {
      thresholds.push(foldedLongitude + multiple * modulus);
    }
  } else {
    const first = Math.ceil((to - foldedLongitude) / modulus - EPSILON);
    const last = Math.ceil((from - foldedLongitude) / modulus - EPSILON) - 1;
    for (let multiple = last; multiple >= first; multiple -= 1) {
      thresholds.push(foldedLongitude + multiple * modulus);
    }
  }
  return thresholds;
}

function contactsForFold(
  provider: EphemerisProvider,
  tracks: readonly GraphicEphemerisTrack[],
  natal: readonly GraphicEphemerisNatalPoint[],
  fold: GraphicEphemerisFold,
  frame: GraphicEphemerisFrame,
  toleranceDays: number,
): GraphicEphemerisContact[] {
  const modulus = GRAPHIC_EPHEMERIS_MODULI[fold];
  const groups = natalGroups(natal, fold);
  const contacts: GraphicEphemerisContact[] = [];

  for (const track of tracks) {
    const firstSample = track.samples[0]!;
    for (const group of groups) {
      const firstFolded = foldLongitude(firstSample.unwrappedLongitude, fold);
      const startSeparation = Math.min(
        Math.abs(firstFolded - group.foldedLongitude),
        modulus - Math.abs(firstFolded - group.foldedLongitude),
      );
      if (startSeparation < 1e-9) {
        const nakshatra = nakshatraOf(firstSample.longitude);
        for (const natalPoint of group.points) {
          contacts.push({
            fold,
            modulus,
            transiting: track.body,
            natalPoint: natalPoint.id,
            jdUt: firstSample.jdUt,
            transitLongitude: firstSample.longitude,
            natalLongitude: natalPoint.longitude,
            foldedLongitude: group.foldedLongitude,
            separation: wrap180(firstSample.longitude - natalPoint.longitude),
            nakshatraIndex: nakshatra.index,
            retrograde: firstSample.retrograde,
          });
        }
      }
    }

    for (let index = 1; index < track.samples.length; index += 1) {
      const before = track.samples[index - 1]!;
      const after = track.samples[index]!;
      for (const group of groups) {
        const thresholds = thresholdsBetween(
          before.unwrappedLongitude,
          after.unwrappedLongitude,
          group.foldedLongitude,
          modulus,
        );
        for (const threshold of thresholds) {
          const jdUt = bisectContact(
            provider,
            track.body,
            threshold,
            before.jdUt,
            after.jdUt,
            frame,
            toleranceDays,
          );
          const exact = positionAt(provider, track.body, jdUt, frame);
          const nakshatra = nakshatraOf(exact.longitude);
          for (const natalPoint of group.points) {
            contacts.push({
              fold,
              modulus,
              transiting: track.body,
              natalPoint: natalPoint.id,
              jdUt,
              transitLongitude: exact.longitude,
              natalLongitude: natalPoint.longitude,
              foldedLongitude: group.foldedLongitude,
              separation: wrap180(exact.longitude - natalPoint.longitude),
              nakshatraIndex: nakshatra.index,
              retrograde: exact.retrograde,
            });
          }
        }
      }
    }
  }

  const bodyOrder = new Map(tracks.map((track, index) => [track.body, index]));
  const natalOrder = new Map(natal.map((point, index) => [point.id, index]));
  contacts.sort(
    (a, b) =>
      a.jdUt - b.jdUt ||
      (bodyOrder.get(a.transiting) ?? 0) - (bodyOrder.get(b.transiting) ?? 0) ||
      (natalOrder.get(a.natalPoint) ?? 0) - (natalOrder.get(b.natalPoint) ?? 0),
  );
  return contacts;
}

/**
 * Sample the moving sky and refine every crossing of every natal reference.
 *
 * The result carries all three folds over one shared set of positions. Switching
 * from 360° to the rāśi or nakṣatra dial is therefore a projection, not a fresh
 * ephemeris calculation. No clock, locale, storage or network is consulted.
 */
export function graphicEphemerisSeries(
  provider: EphemerisProvider,
  window: GraphicEphemerisWindow,
  frame: GraphicEphemerisFrame,
  options: GraphicEphemerisOptions,
): GraphicEphemerisSeries {
  assertInputs(window, frame, options);
  const tolerance = options.toleranceDays ?? 1e-6;
  const times = sampleTimes(window, options.stepDays);
  const epochs = times.map((jdUt) => ({ jdUt, ayanamsaValue: ayanamsaAt(jdUt, frame) }));
  const natal = options.natal.map((point) => ({ ...point, longitude: norm360(point.longitude) }));

  const tracks = options.bodies.map((body): GraphicEphemerisTrack => {
    let previousLongitude: number | null = null;
    let previousUnwrapped: number | null = null;
    const samples = epochs.map((epoch): GraphicEphemerisSample => {
      const exact = positionAt(provider, body, epoch.jdUt, frame, epoch.ayanamsaValue);
      const unwrappedLongitude =
        previousLongitude === null || previousUnwrapped === null
          ? exact.longitude
          : previousUnwrapped + wrap180(exact.longitude - previousLongitude);
      previousLongitude = exact.longitude;
      previousUnwrapped = unwrappedLongitude;
      return {
        jdUt: epoch.jdUt,
        longitude: exact.longitude,
        unwrappedLongitude,
        latitude: exact.latitude,
        speed: exact.speed,
        retrograde: exact.retrograde,
      };
    });
    return { body, samples };
  });

  const contacts: Partial<Record<GraphicEphemerisFold, readonly GraphicEphemerisContact[]>> = {};
  for (const fold of options.folds ?? FOLDS) {
    contacts[fold] = contactsForFold(provider, tracks, natal, fold, frame, tolerance);
  }

  return {
    window: { ...window },
    stepDays: options.stepDays,
    frame: {
      ...frame,
      providerId: provider.id,
      precisionClass: provider.precisionClass,
    },
    epochs,
    natal,
    tracks,
    contacts,
  };
}
