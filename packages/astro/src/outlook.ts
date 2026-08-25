import type { EphemerisProvider } from './ephemeris/provider.js';
import type { PointId } from './types.js';
import { SIGNS } from './types.js';
import { nakshatraOf } from './nakshatra.js';
import { karanaOf, nityaYogaOf, tithiOf, varaOf, type Panchanga } from './panchanga.js';
import {
  findIngresses,
  findStations,
  siderealLongitudeAt,
  type Ingress,
  type SiderealFrame,
  type Station,
} from './transits/scan.js';

/**
 * A short-range outlook on the sky.
 *
 * This is what a dashboard needs and no single existing function provided: the
 * state of the sky on each of the next N days, plus the events that fall
 * inside that window.
 *
 * Pure, like everything else in this package — `fromJd` is an explicit
 * argument, never a clock reading. That is what makes the whole thing testable
 * against a fixed date and cacheable per day rather than per request.
 *
 * The events and the daily rows are computed separately on purpose. A daily
 * row is a *sample* — where the Moon is at that moment — while an ingress is a
 * bisected *root*, an exact instant. Mixing the two would let a sampled
 * position imply a precision it does not have.
 */

export interface DayOutlook {
  /** Midnight-ish sample point for the day, UT. */
  readonly jdUt: number;
  /** Days from the start of the window. 0 is today. */
  readonly offset: number;
  readonly moonSign: string;
  readonly moonSignIndex: number;
  readonly moonNakshatra: string;
  readonly moonNakshatraLord: string;
  readonly tithi: Panchanga['tithi'];
  readonly vara: Panchanga['vara'];
  /** True when the Moon changes sign at some point during this day. */
  readonly moonChangesSign: boolean;
}

export interface SkyOutlook {
  readonly days: readonly DayOutlook[];
  /** Sign changes by the slower grahas inside the window, as exact instants. */
  readonly ingresses: readonly Ingress[];
  /** Direction changes inside the window, as exact instants. */
  readonly stations: readonly Station[];
  readonly window: { readonly fromJd: number; readonly toJd: number };
}

/**
 * Which bodies are worth reporting movement for over a week.
 *
 * The Moon changes sign every two and a bit days and is reported per-day
 * instead; the Sun changes once a month. Listing every body's ingresses over
 * seven days would bury the one that matters under the Moon's noise — a
 * timeline that flags everything flags nothing.
 */
const SLOW_BODIES: readonly PointId[] = [
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Rahu',
  'Ketu',
];

/** Bodies that can station. The nodes are always retrograde and never turn. */
const STATIONING: readonly PointId[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export interface OutlookOptions {
  readonly days?: number;
  /** Sunrise per day, if known — `vara` is null without it rather than guessed. */
  readonly sunriseFor?: (jdUt: number) => number | null;
}

export function skyOutlook(
  provider: EphemerisProvider,
  fromJd: number,
  frame: SiderealFrame,
  options: OutlookOptions = {},
): SkyOutlook {
  const dayCount = Math.max(1, Math.min(options.days ?? 7, 31));
  const toJd = fromJd + dayCount;

  const days: DayOutlook[] = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const jdUt = fromJd + offset;
    const sun = siderealLongitudeAt(provider, 'Sun', jdUt, frame);
    const moon = siderealLongitudeAt(provider, 'Moon', jdUt, frame);
    // Sampled a day later, to say whether the sign changes during this day.
    const moonTomorrow = siderealLongitudeAt(provider, 'Moon', jdUt + 1, frame);

    const signIndex = Math.floor(moon / 30);
    const nakshatra = nakshatraOf(moon);
    const sunrise = options.sunriseFor?.(jdUt) ?? null;

    days.push({
      jdUt,
      offset,
      moonSign: SIGNS[signIndex]!,
      moonSignIndex: signIndex,
      moonNakshatra: nakshatra.name,
      moonNakshatraLord: nakshatra.lord,
      tithi: tithiOf(sun, moon),
      vara: varaOf(jdUt, sunrise),
      moonChangesSign: Math.floor(moonTomorrow / 30) !== signIndex,
    });
  }

  const window = { fromJd, toJd };
  const ingresses: Ingress[] = [];
  const stations: Station[] = [];

  for (const body of SLOW_BODIES) {
    ingresses.push(...findIngresses(provider, body, window, frame));
  }
  for (const body of STATIONING) {
    stations.push(...findStations(provider, body, window, frame));
  }

  ingresses.sort((a, b) => a.jdUt - b.jdUt);
  stations.sort((a, b) => a.jdUt - b.jdUt);

  return { days, ingresses, stations, window };
}

/** The sky right now, for a dashboard's "where everything is" panel. */
export interface SkyPosition {
  readonly id: PointId;
  readonly longitude: number;
  readonly sign: string;
  readonly signIndex: number;
  readonly degreesInSign: number;
  readonly nakshatra: string;
  readonly retrograde: boolean;
}

export function skyNow(
  provider: EphemerisProvider,
  jdUt: number,
  frame: SiderealFrame,
  bodies: readonly PointId[] = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn',
    'Rahu',
    'Ketu',
  ],
): SkyPosition[] {
  return bodies.map((id) => {
    const longitude = siderealLongitudeAt(provider, id, jdUt, frame);
    const signIndex = Math.floor(longitude / 30);
    // Speed comes from the provider rather than a finite difference here —
    // the provider already knows, and a difference over a day misreports a
    // body that turns during it.
    const speed = provider.position(id, jdUt).speed ?? 0;
    return {
      id,
      longitude,
      sign: SIGNS[signIndex]!,
      signIndex,
      degreesInSign: longitude - signIndex * 30,
      nakshatra: nakshatraOf(longitude).name,
      retrograde: id === 'Rahu' || id === 'Ketu' ? true : speed < 0,
    };
  });
}

/**
 * The pañcāṅga for a moment, without needing a full chart.
 *
 * `computeChart` produces one already, but a dashboard wants today's sky for
 * nobody in particular, and casting a chart for a person who does not exist to
 * get it would be absurd.
 */
export function panchangaNow(
  provider: EphemerisProvider,
  jdUt: number,
  frame: SiderealFrame,
  sunriseJdUt: number | null = null,
): Panchanga {
  const sun = siderealLongitudeAt(provider, 'Sun', jdUt, frame);
  const moon = siderealLongitudeAt(provider, 'Moon', jdUt, frame);
  return {
    tithi: tithiOf(sun, moon),
    nakshatra: nakshatraOf(moon),
    yoga: nityaYogaOf(sun, moon),
    karana: karanaOf(sun, moon),
    vara: varaOf(jdUt, sunriseJdUt),
    elongation: (((moon - sun) % 360) + 360) % 360,
  };
}
