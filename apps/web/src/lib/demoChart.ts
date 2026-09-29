import {
  AstronomyEngineProvider,
  POINT_DISPLAY_ORDER,
  buildVargaChart,
  computeChart,
  dashaChainAt,
  skyNow,
  vimshottari,
  type ComputedChart,
  type VargaChart,
} from '@jade/astro';
import type { InstrumentMark } from '@jade/ui';

/**
 * The chart on the public site.
 *
 * A real one, computed by the real engine at build time — not a picture, not a
 * hand-drawn mock. The visitor Jade is trying to reach can read a chart, and
 * will check it. A plausible-looking fake in the hero would be spotted in
 * about two seconds by exactly the person the page exists to convince.
 *
 * The moment is fixed rather than "now" for two reasons: the page is
 * statically generated, so a clock reading would freeze at build time and
 * silently go stale; and a fixed moment makes the hero deterministic, so a
 * visual regression is a real change rather than the sky having moved.
 *
 * 7 November 2001, 10:32, Ann Arbor — the same reference chart the accuracy
 * suite pins against Swiss Ephemeris. What the site shows is what CI checks.
 */

const REFERENCE = {
  jdUt: 2452221.147222221,
  location: { latitude: 42.2808, longitude: -83.743 },
} as const;

let cached: {
  chart: ComputedChart;
  rasi: VargaChart;
  navamsa: VargaChart;
  running: string;
} | null = null;

export function demoChart(): NonNullable<typeof cached> {
  if (cached) return cached;

  const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
  const chart = computeChart(provider, {
    jdUt: REFERENCE.jdUt,
    location: REFERENCE.location,
  });

  const dashas = vimshottari(chart.points.Moon!.longitude, REFERENCE.jdUt, { levels: 2 });
  // Read at a fixed point in the subject's life, for the same reason the chart
  // is: a static page cannot hold a moving "now".
  const chain = dashaChainAt(dashas, REFERENCE.jdUt + 365.25 * 24);

  cached = {
    chart,
    rasi: buildVargaChart(chart, 'D1'),
    navamsa: buildVargaChart(chart, 'D9'),
    running: chain.map((period) => period.lord).join(' → '),
  };
  return cached;
}

/**
 * A fixed transiting moment, for the dial on the landing page.
 *
 * 1 January 2027, 00:00 UT. Fixed for the same reason the chart is: the page is
 * statically generated, so "now" would freeze at build time and go quietly
 * stale. A stated date can be checked against any ephemeris; a stale one
 * pretending to be today cannot.
 */
const TRANSIT_JD = 2461406.5;
const TRANSIT_LABEL = '1 January 2027, 00:00 UT';

/** Lahiri and mean nodes, matching the reference chart above. */
const FRAME = { ayanamsa: 'lahiri' } as const;

export interface DemoRing {
  readonly natal: readonly InstrumentMark[];
  readonly transits: readonly InstrumentMark[];
  readonly natalMoonLongitude: number;
  readonly ayanamsaValue: number;
  readonly frameLabel: string;
  readonly transitLabel: string;
}

let ring: DemoRing | null = null;

/**
 * The nakṣatra dial's data: the reference chart's natal positions, and where
 * the sky is at a stated later moment.
 *
 * Both come from the same engine the app uses, so the dial a visitor drags on
 * the landing page is drawing the same degrees the product would.
 */
export function demoRing(): DemoRing {
  if (ring) return ring;

  const { chart } = demoChart();
  const natal: InstrumentMark[] = POINT_DISPLAY_ORDER.filter((id) => chart.points[id]).map((id) => {
    const point = chart.points[id]!;
    return { id, longitude: point.longitude, retrograde: point.retrograde };
  });

  const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
  const transits: InstrumentMark[] = skyNow(provider, TRANSIT_JD, FRAME).map((position) => ({
    id: position.id,
    longitude: position.longitude,
    retrograde: position.retrograde,
  }));

  ring = {
    natal,
    transits,
    natalMoonLongitude: chart.points.Moon!.longitude,
    ayanamsaValue: chart.meta.ayanamsaValue,
    frameLabel: 'Lahiri · mean nodes',
    transitLabel: TRANSIT_LABEL,
  };
  return ring;
}
