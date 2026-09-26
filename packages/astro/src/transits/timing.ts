import type { EphemerisProvider } from '../ephemeris/provider.js';
import { dashaChainAt, type DashaPeriod, type VimshottariResult } from '../dashas/vimshottari.js';
import { houseFrom } from '../yogas.js';
import { SIGNS, type Graha, type PointId } from '../types.js';
import {
  findCrossings,
  findIngresses,
  findStations,
  type ScanOptions,
  type ScanWindow,
  type SiderealFrame,
} from './scan.js';

/**
 * The daśā × transit series: one subject's inner clock crossed with the sky.
 *
 * ## Why the segments are daśās and not date buckets
 *
 * The obvious implementation of a "heat timeline" is to chop the window into
 * equal bins and colour each one by how much is happening in it. That produces
 * a picture whose divisions mean nothing — a bin boundary falling in the middle
 * of an antardaśā splits one period into two readings and joins halves of
 * unrelated ones.
 *
 * So the segments here **are** the antardaśās, clipped to the window. Every
 * division on the axis is a real change of period, which is what a practitioner
 * is reading the timeline for. The transits then fall inside the periods they
 * actually fall inside, and the cross-product is the product of two things that
 * both exist rather than of one thing and a grid.
 *
 * ## There is no heat
 *
 * The word survived in the roadmap and the thing did not, deliberately. A
 * gradient from cool to hot is a verdict — it says this stretch of your life is
 * worse than that one — and Jade is not allowed to say that (CLAUDE.md #6 for
 * the hard cases, #5 for all the rest). What a segment carries instead is a
 * **count of named events**, each of which the reader can open and check. A
 * count is not an intensity: four contacts is more things to look at than one,
 * and the timeline says exactly that and nothing further.
 *
 * `lordEvents` is the one genuine correlation, and it is a fact rather than a
 * judgement: a transit by a graha that also rules the running period is the
 * classical reason to look at a date twice. Jade reports the coincidence and
 * leaves the reading to the practitioner.
 */

/** The natal chart, reduced to what timing needs. */
export interface TimingChart {
  readonly ascendantSign: number;
  /** Sidereal longitude of every point worth aiming a transit at. */
  readonly longitudeOf: Readonly<Partial<Record<PointId, number>>>;
}

export interface TimingTarget {
  readonly id: PointId;
  readonly longitude: number;
  /** "natal Moon in Virgo, the 5th" — printed after a transiting graha. */
  readonly detail: string;
}

export type TimingEventKind = 'contact' | 'ingress' | 'station';

export interface TimingEvent {
  readonly kind: TimingEventKind;
  readonly transiting: PointId;
  readonly jdUt: number;
  /** One line, complete on its own. */
  readonly headline: string;
  /**
   * Everything the headline rests on, so it can be checked rather than trusted
   * (CLAUDE.md #5). Never empty — a test asserts it.
   */
  readonly factors: readonly string[];
  /** Which natal point, for a contact. */
  readonly target?: PointId;
  /** Which of the three passes over one degree, for a contact. */
  readonly pass?: number;
  readonly retrograde?: boolean;
  /** The sign entered, for an ingress; the sign it turns in, for a station. */
  readonly sign?: string;
  /** Which of the subject's houses that sign is. */
  readonly house?: number;
}

export interface TimingSegment {
  /** Clipped to the requested window, so the first and last may be partial. */
  readonly fromJd: number;
  readonly toJd: number;
  /** Mahādaśā lord first, then antardaśā. */
  readonly lords: readonly Graha[];
  /** True when the period is not wholly inside the window. */
  readonly clipped: boolean;
  readonly events: readonly TimingEvent[];
  /**
   * How many events fall in this period. A count of things to look at — never
   * a score, a rating, or an intensity.
   */
  readonly eventCount: number;
  /**
   * Events whose transiting graha is one of this period's own lords.
   *
   * The join that makes this a correlation rather than two lists on one axis.
   */
  readonly lordEvents: readonly TimingEvent[];
}

export interface TimingSeries {
  readonly window: ScanWindow;
  readonly segments: readonly TimingSegment[];
  /** Every event in the window, in time order, whatever period it landed in. */
  readonly events: readonly TimingEvent[];
  /** The largest `eventCount` across the segments, so a caller can scale an axis. */
  readonly maxEventCount: number;
  /** Which bodies were scanned, so the UI can say what it is not showing. */
  readonly scanned: readonly PointId[];
}

export interface TimingOptions {
  /**
   * Which transiting bodies to scan.
   *
   * Jupiter and Saturn by default, and that is a product decision as much as an
   * astrological one. A slow graha's arrival is worth a date on a calendar;
   * Mars is over a natal degree in days and the Moon in hours, so including
   * them across a decade produces thousands of events and a timeline that
   * flags everything, which flags nothing. Callers wanting Mars can ask.
   */
  readonly bodies?: readonly PointId[];
  /** Which natal points to aim at. Defaults to the Moon, the Sun and the lagna. */
  readonly targets?: readonly PointId[];
  /** Include sign changes. On by default — an ingress changes the house being transited. */
  readonly ingresses?: boolean;
  /** Include stations. On by default — a graha stationing on a degree sits there for weeks. */
  readonly stations?: boolean;
  readonly scan?: ScanOptions;
}

const DEFAULT_BODIES: readonly PointId[] = ['Jupiter', 'Saturn'];
const DEFAULT_TARGETS: readonly PointId[] = ['Moon', 'Sun', 'Ascendant'];

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

/** Sign name from a longitude. Floored — `SIGNS[7.4]` is `undefined`, which reaches a page as the word. */
function signAt(longitude: number): string {
  return SIGNS[Math.floor(longitude / 30) % 12]!;
}

function ordinal(house: number): string {
  return ORDINALS[house - 1] ?? `${house}th`;
}

/** Human label for a point, so "the Ascendant" does not print as "natal Ascendant". */
function label(id: PointId): string {
  return id === 'Ascendant' ? 'the lagna' : `natal ${id}`;
}

export function timingTargets(
  chart: TimingChart,
  wanted: readonly PointId[] = DEFAULT_TARGETS,
): TimingTarget[] {
  const out: TimingTarget[] = [];
  for (const id of wanted) {
    const longitude = chart.longitudeOf[id];
    if (longitude === undefined) continue;
    const house = houseFrom(chart.ascendantSign, Math.floor(longitude / 30) % 12);
    out.push({
      id,
      longitude,
      detail: `${label(id)} in ${signAt(longitude)}, the ${ordinal(house)}`,
    });
  }
  return out;
}

/**
 * The antardaśās overlapping a window, flattened and clipped.
 *
 * Walks the tree rather than sampling it, so a period shorter than any sampling
 * interval still appears. A mahādaśā with no expanded children contributes
 * itself, which is what a caller asking for one level should get.
 */
function antardashasIn(result: VimshottariResult, window: ScanWindow): DashaPeriod[] {
  const out: DashaPeriod[] = [];
  for (const maha of result.periods) {
    if (maha.endJd <= window.fromJd || maha.startJd >= window.toJd) continue;
    const children = maha.children;
    if (!children || children.length === 0) {
      out.push(maha);
      continue;
    }
    for (const antara of children) {
      if (antara.endJd <= window.fromJd || antara.startJd >= window.toJd) continue;
      out.push(antara);
    }
  }
  return out.sort((a, b) => a.startJd - b.startJd);
}

/**
 * Compute the series.
 *
 * Pure, like everything else in this package: the window is an argument, the
 * provider is an argument, and nothing here reads a clock. A caller wanting
 * "the next ten years" computes those two Julian Days itself.
 */
export function timingSeries(
  provider: EphemerisProvider,
  frame: SiderealFrame,
  window: ScanWindow,
  chart: TimingChart,
  dashas: VimshottariResult,
  options: TimingOptions = {},
): TimingSeries {
  const bodies = options.bodies ?? DEFAULT_BODIES;
  const targets = timingTargets(chart, options.targets ?? DEFAULT_TARGETS);
  const scan = options.scan ?? {};
  const events: TimingEvent[] = [];

  for (const body of bodies) {
    // ------------------------------------------------------------- contacts
    for (const target of targets) {
      for (const crossing of findCrossings(provider, body, target.longitude, window, frame, scan)) {
        const house = houseFrom(chart.ascendantSign, Math.floor(target.longitude / 30) % 12);
        events.push({
          kind: 'contact',
          transiting: body,
          jdUt: crossing.jdUt,
          target: target.id,
          pass: crossing.pass,
          retrograde: crossing.retrograde,
          house,
          sign: signAt(target.longitude),
          headline: `Transiting ${body} reaches ${label(target.id)}`,
          factors: [
            `${target.detail}`,
            `${body} is ${crossing.retrograde ? 'retrograde' : 'direct'} at the contact`,
            crossing.pass > 1
              ? `pass ${crossing.pass} of the retrograde loop over the same degree`
              : 'first and only pass over this degree',
            `crossing in the ${ordinal(house)} house`,
          ],
        });
      }
    }

    // ------------------------------------------------------------ ingresses
    if (options.ingresses !== false) {
      for (const ingress of findIngresses(provider, body, window, frame, scan)) {
        const house = houseFrom(chart.ascendantSign, ingress.signIndex);
        events.push({
          kind: 'ingress',
          transiting: body,
          jdUt: ingress.jdUt,
          sign: ingress.sign,
          house,
          retrograde: ingress.retrograde,
          headline: `${body} enters ${ingress.sign} — the ${ordinal(house)} house`,
          factors: [
            `${ingress.sign} is the ${ordinal(house)} from this lagna`,
            ingress.retrograde
              ? `${body} is backing into the sign it just left, so this is not the lasting entry`
              : `${body} is direct`,
          ],
        });
      }
    }

    // ------------------------------------------------------------- stations
    if (options.stations !== false) {
      for (const station of findStations(provider, body, window, frame, scan)) {
        const house = houseFrom(chart.ascendantSign, station.signIndex);
        events.push({
          kind: 'station',
          transiting: body,
          jdUt: station.jdUt,
          sign: station.sign,
          house,
          retrograde: station.direction === 'retrograde',
          headline: `${body} turns ${station.direction === 'retrograde' ? 'retrograde' : 'direct'} in ${station.sign}`,
          factors: [
            `stationary at ${(station.longitude % 30).toFixed(2)}° ${station.sign}`,
            `in the ${ordinal(house)} house`,
            'a stationary graha holds one degree for weeks, so anything on it is contacted for longer than a date suggests',
          ],
        });
      }
    }
  }

  events.sort((a, b) => a.jdUt - b.jdUt);

  // ------------------------------------------------------------- the segments
  const segments: TimingSegment[] = [];
  for (const period of antardashasIn(dashas, window)) {
    const fromJd = Math.max(period.startJd, window.fromJd);
    const toJd = Math.min(period.endJd, window.toJd);
    if (toJd <= fromJd) continue;

    // The chain at the midpoint rather than the start: a period clipped by the
    // window start would otherwise report the chain of the instant before it.
    const chain = dashaChainAt(dashas, (fromJd + toJd) / 2);
    const lords = chain.map((p) => p.lord);

    const inside = events.filter((event) => event.jdUt >= fromJd && event.jdUt < toJd);
    const lordSet = new Set<string>(lords);
    segments.push({
      fromJd,
      toJd,
      lords,
      clipped: period.startJd < window.fromJd || period.endJd > window.toJd,
      events: inside,
      eventCount: inside.length,
      lordEvents: inside.filter((event) => lordSet.has(event.transiting)),
    });
  }

  return {
    window,
    segments,
    events,
    maxEventCount: segments.reduce((most, segment) => Math.max(most, segment.eventCount), 0),
    scanned: bodies,
  };
}
