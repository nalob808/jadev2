import {
  SIGNS,
  dashaChainAt,
  nakshatraOf,
  type ComputedChart,
  type DashaPeriod,
  type VimshottariResult,
  type YogaHit,
} from '@jade/astro';
import type { Note } from '@jade/db';

/**
 * Everything Jade knows about one graha, gathered into one object.
 *
 * The data here is not new. All of it is already computed and already on the
 * person page — but spread across six sections that do not know about each
 * other: the positions table has the degree, the varga grid has the divisional
 * placements, the aṣṭakavarga panel has the bindus, the yoga list has the
 * combinations, the daśā panel has the periods, and the notes are at the
 * bottom. A practitioner asking "what about Saturn?" currently answers it by
 * scrolling and remembering.
 *
 * Built server-side, once per chart, rather than assembled in the browser on
 * each click. Selecting a graha should be instant and should not depend on
 * shipping the yoga engine to the phone.
 */

export interface FocusFacts {
  readonly id: string;
  readonly sign: string;
  readonly degreesInSign: number;
  readonly house: number | null;
  readonly retrograde: boolean;
  readonly nakshatra: string;
  readonly pada: number;
  readonly nakshatraLord: string;
  readonly dignity: string | null;
  /**
   * Combustion, said in words rather than passed through as a struct.
   * Cazimi is called out separately because the tradition treats it as a
   * strengthening, not a burning — collapsing the two would invert the
   * reading of a graha within a degree of the Sun.
   */
  readonly combustion: string | null;
  /** Bindus this graha's own aṣṭakavarga gives the sign it occupies. */
  readonly bindusInOwnSign: number | null;
  /** Sarva bindus for the sign it occupies — how supported that ground is. */
  readonly sarvaOfSign: number | null;
  /** Yogas this graha takes part in, with their cancellations intact. */
  readonly yogas: readonly YogaHit[];
  /** Daśā periods this graha rules, outermost first. */
  readonly periods: readonly { level: string; lord: string; fromJd: number; toJd: number }[];
  /** Notes anchored to this graha by name. */
  readonly notes: readonly { id: string; body: string }[];
  /** True when this graha is the lord of a currently running period. */
  readonly runningNow: boolean;
}

const LEVELS = ['mahādaśā', 'antardaśā', 'pratyantardaśā'];

function describeCombustion(
  combustion: { combust: boolean; cazimi: boolean; separation: number } | null | undefined,
): string | null {
  if (!combustion || !combustion.combust) return null;
  const separation = `${combustion.separation.toFixed(1)}° from the Sun`;
  return combustion.cazimi ? `cazimi — ${separation}` : `combust — ${separation}`;
}

/**
 * Which grahas a yoga names.
 *
 * Matched against the yoga's own `factors` — the placements that fired the
 * rule — rather than against its prose summary. The summary is written for a
 * reader and mentions grahas it is only contrasting with; the factors are the
 * actual computed reasons, so matching them is the difference between "Saturn
 * is involved" and "Saturn is mentioned".
 */
function yogaNames(yoga: YogaHit, graha: string): boolean {
  return yoga.factors.some((factor) => factor.includes(graha));
}

export function buildFocusIndex(
  chart: ComputedChart,
  options: {
    yogas?: readonly YogaHit[];
    dasha?: VimshottariResult;
    nowJd?: number;
    notes?: readonly Note[];
  } = {},
): Record<string, FocusFacts> {
  const index: Record<string, FocusFacts> = {};
  const yogas = options.yogas ?? [];
  const notes = options.notes ?? [];

  const running: ReadonlySet<string> =
    options.dasha && options.nowJd != null
      ? new Set(dashaChainAt(options.dasha, options.nowJd).map((p) => p.lord))
      : new Set();

  for (const [id, point] of Object.entries(chart.points)) {
    const signIndex = Math.floor((((point.longitude % 360) + 360) % 360) / 30);
    const nak = nakshatraOf(point.longitude);

    // The graha's own bhinnāṣṭakavarga for the sign it stands in. The
    // ascendant has a table too but is not a graha, hence the guard.
    const own = (chart.ashtakavarga.bhinna as Record<string, { bindus: readonly number[] }>)[id];

    index[id] = {
      id,
      sign: SIGNS[signIndex]!,
      degreesInSign: (((point.longitude % 360) + 360) % 360) % 30,
      house: point.house ?? null,
      retrograde: Boolean((point as { retrograde?: boolean }).retrograde),
      nakshatra: nak.name,
      pada: nak.pada,
      nakshatraLord: nak.lord,
      dignity: chart.dignity[id] ?? null,
      combustion: describeCombustion(chart.combustion[id]),
      bindusInOwnSign: own?.bindus[signIndex] ?? null,
      sarvaOfSign: chart.ashtakavarga.sarva[signIndex] ?? null,
      yogas: yogas.filter((yoga) => yogaNames(yoga, id)),
      periods: collectPeriods(options.dasha, id),
      notes: notes
        .filter((note) => note.anchorKind === 'graha' && note.anchorKey === id)
        .map((note) => ({ id: note.id, body: note.body })),
      runningNow: running.has(id),
    };
  }

  return index;
}

/**
 * Every period this graha rules, at any level.
 *
 * Capped at a dozen. A five-level Vimśottarī expansion has thousands of
 * periods and a panel listing them all is not a panel, it is a wall.
 */
function collectPeriods(
  dasha: VimshottariResult | undefined,
  graha: string,
): FocusFacts['periods'] {
  if (!dasha) return [];
  const found: FocusFacts['periods'] = [];
  const walk = (periods: readonly DashaPeriod[], depth: number): void => {
    for (const period of periods) {
      if (period.lord === graha && found.length < 12) {
        (found as { level: string; lord: string; fromJd: number; toJd: number }[]).push({
          level: LEVELS[depth] ?? `level ${depth + 1}`,
          lord: period.lord,
          fromJd: period.startJd,
          toJd: period.endJd,
        });
      }
      const children = (period as { children?: readonly DashaPeriod[] }).children;
      if (children) walk(children, depth + 1);
    }
  };
  walk(dasha.periods, 0);
  return found;
}
