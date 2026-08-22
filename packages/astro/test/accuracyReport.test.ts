import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { wrap180 } from '../src/angles.js';
import { DEFAULT_SETTINGS } from '../src/types.js';
import { ayanamsa } from '../src/sidereal/ayanamsa.js';
import { nutation } from '../src/nutation.js';
import { jdTtFromJdUt } from '../src/time.js';

type GoldenCase = (typeof golden.cases)[number];

/**
 * Not an assertion — a measurement. This produces the table that Jade's public
 * /accuracy page renders, so the marketing claim and the test suite can never
 * drift apart.
 *
 *   WRITE_ACCURACY_REPORT=1 pnpm --filter @jade/astro test
 *
 * writes test/accuracy-report.json for the web app to import.
 */
it('reports worst-case error against Swiss Ephemeris', () => {
  const p = new AstronomyEngineProvider({ nodeType: 'mean' });
  const p2 = new AstronomyEngineProvider({ nodeType: 'true' });
  const worst: Record<string, number> = {};
  const where: Record<string, string> = {};
  const bump = (k: string, v: number, l: string) => {
    if (!(k in worst) || v > worst[k]!) {
      worst[k] = v;
      where[k] = l;
    }
  };
  for (const c of golden.cases as GoldenCase[]) {
    const ch = computeChart(
      p,
      { jdUt: c.jdUt, location: c.location },
      { ...DEFAULT_SETTINGS, includeOuters: true },
    );
    for (const [b, e] of Object.entries(c.points))
      bump(b, Math.abs(wrap180(ch.points[b]!.longitude - e.siderealLongitude)) * 3600, c.label);
    bump(
      'Ascendant',
      Math.abs(wrap180(ch.points.Ascendant!.longitude - c.ascendantSidereal)) * 3600,
      c.label,
    );
    bump(
      'Midheaven',
      Math.abs(wrap180(ch.points.Midheaven!.longitude - c.midheavenSidereal)) * 3600,
      c.label,
    );
    const jdTt = jdTtFromJdUt(c.jdUt);
    bump(
      '~ayanamsa',
      Math.abs(ayanamsa(jdTt, { mode: 'lahiri', includeNutation: true }) - c.ayanamsaApplied) *
        3600,
      c.label,
    );
    const n = nutation(jdTt);
    bump('~dPsi', Math.abs(n.dPsi - c.nutationLongitude) * 3600, c.label);
    bump('~obliquity', Math.abs(n.trueObliquity - c.trueObliquity) * 3600, c.label);
    const ch2 = computeChart(p2, { jdUt: c.jdUt, location: c.location });
    bump(
      'TrueNode',
      Math.abs(wrap180(ch2.points.Rahu!.longitude - c.trueNode.siderealLongitude)) * 3600,
      c.label,
    );
  }
  const rows = Object.keys(worst).sort((a, b) => worst[b]! - worst[a]!);
  console.error('\n  MAX ERROR vs Swiss Ephemeris (arcsec)\n  ' + '-'.repeat(58));
  for (const k of rows) {
    console.error('  ' + k.padEnd(12) + worst[k]!.toFixed(4).padStart(12) + '   ' + where[k]);
  }

  if (process.env.WRITE_ACCURACY_REPORT) {
    writeFileSync(
      new URL('./accuracy-report.json', import.meta.url),
      JSON.stringify(
        {
          generatedAgainst: golden.generator,
          provider: 'astronomy-engine',
          precisionClass: 'interactive',
          unit: 'arcsec',
          charts: golden.cases.length,
          worstCase: rows.map((k) => ({ quantity: k, error: worst[k], chart: where[k] })),
        },
        null,
        2,
      ),
    );
  }
});
