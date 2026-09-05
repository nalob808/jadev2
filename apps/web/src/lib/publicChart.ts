import {
  AstronomyEngineProvider,
  computeChart,
  dashaChainAt,
  jdFromUnixMs,
  positionsAcrossDay,
  vimshottari,
  type ComputedChart,
  type AyanamsaMode,
  type DashaPeriod,
  type SiderealFrame,
  type VimshottariResult,
  type UndatedDay,
} from '@jade/astro';
import { resolveOffset, toUtcMillis, type LocalDateTime } from '@jade/atlas';
import type { PublicFigure } from '@jade/db';

/**
 * Casting a chart for somebody in the public library.
 *
 * ## The lens is fixed, and said out loud
 *
 * These pages have no session and therefore no settings profile, so the lens
 * cannot come from the reader. It is declared here as one constant and printed
 * on every page that uses it. Constitution item 3 forbids a silent default, not
 * a default — the rule is that the reader can always see which ayanāṁśa
 * produced what they are looking at, and on a page meant to teach from, that
 * matters more than anywhere else.
 *
 * ## Two shapes, because there are two kinds of record
 *
 * A figure with an attested birth time gets a real chart. A figure without one
 * gets `UndatedDay` — positions at both ends of the day with the uncertainty
 * stated — and no ascendant, because a date does not determine one. The
 * discriminated union is deliberate: a caller cannot accidentally read houses
 * off an untimed figure, because an untimed result has none to read.
 */

export const LIBRARY_LENS = {
  ayanamsa: 'lahiri' as AyanamsaMode,
  nodeType: 'mean' as const,
  houseSystem: 'whole sign',
  label: 'Lahiri ayanāṁśa · whole-sign houses · mean nodes',
};

const FRAME: SiderealFrame = { ayanamsa: LIBRARY_LENS.ayanamsa };

export interface TimedFigureChart {
  readonly kind: 'timed';
  readonly chart: ComputedChart;
  readonly dasha: VimshottariResult;
  readonly jdUt: number;
  /** The offset actually used, for printing beside the birth data. */
  readonly offsetMinutes: number;
}

export interface UntimedFigureChart {
  readonly kind: 'untimed';
  readonly day: UndatedDay;
}

export type FigureChart = TimedFigureChart | UntimedFigureChart;

function provider(): AstronomyEngineProvider {
  return new AstronomyEngineProvider({ nodeType: LIBRARY_LENS.nodeType });
}

function parseDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

/**
 * The chart, or the honest absence of one.
 *
 * The zone is resolved through the tz database rather than a fixed offset,
 * which is what gets 19th-century Indian births right: Calcutta kept Howrah
 * Mean Time at +05:53:20 until 1941, and software that assumes +05:30 puts
 * every one of those charts twenty-three minutes out.
 */
export function castFigure(figure: PublicFigure): FigureChart {
  const { year, month, day } = parseDate(figure.birthDate);
  const location = { latitude: figure.latitude, longitude: figure.longitude };
  const engine = provider();

  if (figure.birthTime) {
    const [hour, minute] = figure.birthTime.split(':').map(Number);
    const local: LocalDateTime = {
      year,
      month,
      day,
      hour: hour ?? 0,
      minute: minute ?? 0,
      second: 0,
    };
    const resolved = resolveOffset(local, figure.timezoneId);
    const jdUt = jdFromUnixMs(toUtcMillis(local, resolved.offsetMinutes));
    const chart = computeChart(engine, { jdUt, location });
    const dasha = vimshottari(chart.points.Moon!.longitude, jdUt, { levels: 3 });
    return { kind: 'timed', chart, dasha, jdUt, offsetMinutes: resolved.offsetMinutes };
  }

  // Midnight to midnight *at the birthplace*, which is the window a date
  // without a time actually denotes. Using a UT day instead would shift it by
  // the zone offset and change the answer for anything near a boundary.
  const midnight: LocalDateTime = { year, month, day, hour: 0, minute: 0, second: 0 };
  const startOffset = resolveOffset(midnight, figure.timezoneId);
  const jdStart = jdFromUnixMs(toUtcMillis(midnight, startOffset.offsetMinutes));

  return { kind: 'untimed', day: positionsAcrossDay(engine, jdStart, jdStart + 1, FRAME) };
}

/** The daśā chain running at a moment, for a timed figure. Null for untimed. */
export function chainAt(cast: FigureChart, jdUt: number): readonly DashaPeriod[] | null {
  return cast.kind === 'timed' ? dashaChainAt(cast.dasha, jdUt) : null;
}

/**
 * How the Rodden scale reads in English.
 *
 * Printed beside every chart in the library. The scale is what every serious
 * astrologer already uses to decide how much weight a chart can bear, and
 * naming it is the difference between a library and a pile of guesses.
 */
export const RODDEN: Record<
  string,
  { short: string; meaning: string; trust: 'high' | 'mixed' | 'none' }
> = {
  AA: {
    short: 'AA',
    meaning: 'From a birth certificate or register',
    trust: 'high',
  },
  A: {
    short: 'A',
    meaning: 'From the person, their family, or someone who was there',
    trust: 'high',
  },
  B: { short: 'B', meaning: 'From a biography or memoir', trust: 'mixed' },
  C: { short: 'C', meaning: 'Caution — no source for the time', trust: 'mixed' },
  DD: { short: 'DD', meaning: 'Sources conflict; treat as unreliable', trust: 'mixed' },
  X: { short: 'X', meaning: 'No birth time is recorded', trust: 'none' },
  XX: { short: 'XX', meaning: 'The date itself is uncertain', trust: 'none' },
};
