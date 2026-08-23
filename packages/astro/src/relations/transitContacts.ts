import { lordOfSign } from '../dignity.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { findCrossings, type ScanWindow, type SiderealFrame } from '../transits/scan.js';
import { SIGNS, type Graha } from '../types.js';

/**
 * The transit half of a pair's timeline.
 *
 * Daśā convergences say when both people's inner clocks line up. This says when
 * the actual sky arrives on a point that matters to the relationship. A
 * practitioner reads both together, and neither is much use alone.
 *
 * Only the two slow grahas are scanned. Jupiter and Saturn are the ones whose
 * arrival is worth a date on a calendar — Mars is over a point in days and the
 * Moon in hours, which is noise at this scale, not signal. That is a product
 * decision as much as an astrological one: a timeline that flags everything
 * flags nothing.
 *
 * The points watched are the three the tradition reads for partnership:
 *
 *   the natal Moon        the mind, and what the whole daśā system is built on
 *   natal Venus           the kāraka of the marriage itself
 *   the lord of the 7th   wherever it happens to sit
 *
 * Every contact carries which body, whose chart, which point, and which pass of
 * the retrograde loop — because a slow graha crosses a degree up to three times
 * and all three are real dates.
 */

export type ContactPoint = 'moon' | 'venus' | 'seventhLord';

export interface TransitContactChart {
  readonly ascendantSign: number;
  /** Sidereal longitude of each graha, degrees. */
  readonly longitudeOf: Readonly<Record<Graha, number>>;
}

export interface TransitContact {
  readonly transiting: 'Jupiter' | 'Saturn';
  /** Whose chart the point belongs to. */
  readonly subject: 'a' | 'b';
  readonly subjectName: string;
  readonly point: ContactPoint;
  readonly jdUt: number;
  readonly retrograde: boolean;
  /** 1, 2 or 3 — which pass of the retrograde loop this is. */
  readonly pass: number;
  readonly factors: readonly string[];
}

/**
 * Sign name from a **longitude**, not an index.
 *
 * Taking the index without flooring gives a fractional subscript, and
 * `SIGNS[7.4]` is `undefined` — which reaches the page as the words "in
 * undefined" rather than as an error.
 */
const signAt = (longitude: number): string => SIGNS[Math.floor(longitude / 30) % 12]!;

/** Written to read naturally after a possessive: "Nalu's natal Moon". */
const POINT_LABEL: Record<ContactPoint, string> = {
  moon: 'natal Moon',
  venus: 'natal Venus',
  seventhLord: 'seventh lord',
};

function pointsOf(
  chart: TransitContactChart,
): { point: ContactPoint; longitude: number; detail: string }[] {
  const seventhSign = (chart.ascendantSign + 6) % 12;
  const seventhLord = lordOfSign(seventhSign);
  const out: { point: ContactPoint; longitude: number; detail: string }[] = [];

  const moon = chart.longitudeOf.Moon;
  if (moon !== undefined) {
    out.push({ point: 'moon', longitude: moon, detail: `Moon in ${signAt(moon)}` });
  }
  const venus = chart.longitudeOf.Venus;
  if (venus !== undefined) {
    out.push({ point: 'venus', longitude: venus, detail: `Venus in ${signAt(venus)}` });
  }
  const lordLongitude = chart.longitudeOf[seventhLord];
  if (lordLongitude !== undefined) {
    out.push({
      point: 'seventhLord',
      longitude: lordLongitude,
      // No leading article: this is printed after a possessive, so "Jade's
      // seventh is Taurus" rather than "Jade's the seventh is Taurus".
      detail: `seventh is ${SIGNS[seventhSign]!}, ruled by ${seventhLord}, which sits in ${signAt(lordLongitude)}`,
    });
  }
  return out;
}

export function transitContacts(
  provider: EphemerisProvider,
  frame: SiderealFrame,
  window: ScanWindow,
  charts: { a: TransitContactChart; b: TransitContactChart },
  names: { a: string; b: string } = { a: 'A', b: 'B' },
): TransitContact[] {
  const out: TransitContact[] = [];

  for (const transiting of ['Jupiter', 'Saturn'] as const) {
    for (const side of ['a', 'b'] as const) {
      const chart = charts[side];
      const who = names[side];
      for (const { point, longitude, detail } of pointsOf(chart)) {
        for (const crossing of findCrossings(provider, transiting, longitude, window, frame)) {
          out.push({
            transiting,
            subject: side,
            subjectName: who,
            point,
            jdUt: crossing.jdUt,
            retrograde: crossing.retrograde,
            pass: crossing.pass,
            factors: [
              `transiting ${transiting} reaches ${who}'s ${POINT_LABEL[point]}`,
              `${who}'s ${detail}`,
              crossing.pass > 1
                ? `pass ${crossing.pass} of three — ${transiting} is ${crossing.retrograde ? 'retrograde' : 'direct'} over the same degree`
                : `${transiting} is ${crossing.retrograde ? 'retrograde' : 'direct'}`,
            ],
          });
        }
      }
    }
  }

  return out.sort((x, y) => x.jdUt - y.jdUt);
}
