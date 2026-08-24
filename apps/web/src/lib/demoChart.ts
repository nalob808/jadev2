import {
  AstronomyEngineProvider,
  buildVargaChart,
  computeChart,
  dashaChainAt,
  vimshottari,
  type ComputedChart,
  type VargaChart,
} from '@jade/astro';

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
