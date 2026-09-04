import type { ComputedChart } from './chart.js';
import type { EphemerisProvider } from './ephemeris/provider.js';
import type { PointId } from './types.js';
import { SIGNS } from './types.js';
import {
  findCrossings,
  findStations,
  siderealLongitudeAt,
  type SiderealFrame,
} from './transits/index.js';

/**
 * The transits worth naming before a consultation.
 *
 * ## What is here, and what is deliberately not
 *
 * **Conjunctions to natal points, with every pass.** Saturn over a natal Moon
 * is typically three contacts spread across the better part of a year, and
 * those three dates are what a practitioner writes down and gives out.
 * Returning only the first is the classic error, and `findCrossings` already
 * handles the retrograde loop, so this composes it rather than re-deriving it.
 *
 * **Stations.** The days a slow graha turns are read as significant in their
 * own right and they are exact, dateable events.
 *
 * **Aspects are NOT here, and that is a considered omission rather than a gap.**
 * Vedic aspect is primarily rāśi dṛṣṭi — Saturn aspects a whole sign, so
 * "Saturn aspects her Moon" is a fact that stays true for roughly two and a
 * half years. It is a standing condition, not a dated event, and putting it in
 * a list headed "around 12 September" would misrepresent it as news. Standing
 * conditions belong in the chart reading, which already covers them. If graha
 * dṛṣṭi by degree is added later it belongs in its own section with its own
 * orb, stated.
 *
 * ## Which bodies
 *
 * Only the slow ones. The Moon changes sign every two and a bit days and the
 * inner grahas are back within weeks; listing their contacts would bury the
 * four or five that matter under sixty that do not. The daily reading already
 * covers the fast movement.
 */

/** Slow enough that a contact means something for weeks either side. */
export const SESSION_BODIES: readonly PointId[] = ['Saturn', 'Jupiter', 'Rahu', 'Ketu', 'Mars'];

/** Natal points worth taking a contact to. The angles matter as much as the grahas. */
export const SESSION_TARGETS: readonly string[] = [
  'Ascendant',
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

/**
 * Named `SessionContact` rather than the obvious `TransitContact`, which is
 * already taken by the synastry module for a contact to *two* charts at once.
 * Two different concepts under one name in one package is how a caller ends up
 * importing the wrong one and only finding out from the shape of the output.
 */
export interface SessionContact {
  readonly kind: 'conjunction';
  /** The transiting body. */
  readonly body: PointId;
  /** The natal point it reaches. */
  readonly target: string;
  readonly jdUt: number;
  /** Which pass over the same degree in one retrograde loop: 1, 2 or 3. */
  readonly pass: number;
  readonly retrograde: boolean;
  /** The natal degree being crossed, for showing the working. */
  readonly targetLongitude: number;
  /** Whole-sign house of the natal point, when the chart can be counted in. */
  readonly targetHouse: number | null;
}

export interface SessionStation {
  readonly kind: 'station';
  readonly body: PointId;
  readonly jdUt: number;
  readonly direction: 'retrograde' | 'direct';
  readonly longitude: number;
  readonly sign: string;
  /** Whole-sign house the station falls in, relative to the natal ascendant. */
  readonly house: number | null;
}

export interface SessionPlacement {
  readonly body: PointId;
  readonly longitude: number;
  readonly sign: string;
  readonly house: number | null;
  readonly retrograde: boolean;
}

export interface SessionTransits {
  readonly fromJd: number;
  readonly toJd: number;
  /** Sorted by date. Every pass of every loop. */
  readonly contacts: readonly SessionContact[];
  readonly stations: readonly SessionStation[];
  /** Where the slow bodies actually are at the session moment. */
  readonly placements: readonly SessionPlacement[];
}

/**
 * Whole-sign house of a longitude, counted from the natal ascendant.
 *
 * Returns null under any other house system rather than guessing. Attributing
 * a transit to the wrong house is worse than saying nothing about it, and the
 * caller drops the house rather than printing a number it cannot stand behind.
 */
export function natalHouseOf(chart: ComputedChart, longitude: number): number | null {
  if (chart.houses.system !== 'whole_sign') return null;
  const sign = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return ((((sign - chart.houses.ascendantSign) % 12) + 12) % 12) + 1;
}

function signOf(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]!;
}

/**
 * Everything dateable happening to this chart in a window.
 *
 * Pure: takes a provider and explicit times, touches no clock. The window is
 * the caller's business — the prep sheet uses roughly a season either side of
 * the consultation, which is the horizon a practitioner is asked about.
 */
export function sessionTransits(
  provider: EphemerisProvider,
  chart: ComputedChart,
  window: { fromJd: number; toJd: number },
  frame: SiderealFrame,
  atJd: number = (window.fromJd + window.toJd) / 2,
): SessionTransits {
  const contacts: SessionContact[] = [];
  const stations: SessionStation[] = [];
  const placements: SessionPlacement[] = [];

  for (const body of SESSION_BODIES) {
    // ------------------------------------------------------------- contacts
    for (const target of SESSION_TARGETS) {
      const natal = chart.points[target];
      if (!natal) continue;

      // A body crossing its own natal degree is a return, which is worth
      // having — a Saturn return is the single most asked-about transit there
      // is — so this is deliberately not skipped.
      for (const crossing of findCrossings(provider, body, natal.longitude, window, frame)) {
        contacts.push({
          kind: 'conjunction',
          body,
          target,
          jdUt: crossing.jdUt,
          pass: crossing.pass,
          retrograde: crossing.retrograde,
          targetLongitude: natal.longitude,
          targetHouse: natalHouseOf(chart, natal.longitude),
        });
      }
    }

    // ------------------------------------------------------------- stations
    // The nodes are always retrograde in the mean model and never station, so
    // asking is meaningless for them rather than merely empty.
    if (body !== 'Rahu' && body !== 'Ketu') {
      for (const station of findStations(provider, body, window, frame)) {
        const longitude = siderealLongitudeAt(provider, body, station.jdUt, frame);
        stations.push({
          kind: 'station',
          body,
          jdUt: station.jdUt,
          direction: station.direction,
          longitude,
          sign: signOf(longitude),
          house: natalHouseOf(chart, longitude),
        });
      }
    }

    // ----------------------------------------------------------- placements
    const longitude = siderealLongitudeAt(provider, body, atJd, frame);
    // Sampled a few hours apart rather than asking the provider for a speed it
    // may not expose. Retrogradation is a direction, and a direction is a
    // difference.
    const later = siderealLongitudeAt(provider, body, atJd + 0.25, frame);
    const delta = ((later - longitude + 540) % 360) - 180;
    placements.push({
      body,
      longitude,
      sign: signOf(longitude),
      house: natalHouseOf(chart, longitude),
      retrograde: delta < 0,
    });
  }

  contacts.sort((a, b) => a.jdUt - b.jdUt);
  stations.sort((a, b) => a.jdUt - b.jdUt);

  return { fromJd: window.fromJd, toJd: window.toJd, contacts, stations, placements };
}
