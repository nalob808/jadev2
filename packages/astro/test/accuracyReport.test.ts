import { expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { wrap180 } from '../src/angles.js';
import { DEFAULT_SETTINGS } from '../src/types.js';
import { ayanamsa } from '../src/sidereal/ayanamsa.js';
import { nutation } from '../src/nutation.js';
import { jdTtFromJdUt } from '../src/time.js';
import {
  DELTA_T_OBSERVED_ERA,
  DELTA_T_RELAXATION,
  isDeltaTExtrapolated,
} from '../src/ephemeris/tolerances.js';

type GoldenCase = (typeof golden.cases)[number];

const REPORT_URL = new URL('./accuracy-report.json', import.meta.url);

/**
 * Not an assertion — a measurement. This produces the table that Jade's public
 * /accuracy page renders, so the marketing claim and the test suite can never
 * drift apart.
 *
 *   WRITE_ACCURACY_REPORT=1 pnpm --filter @jade/astro test
 *
 * writes test/accuracy-report.json for the web app to import.
 *
 * ## Why the two ΔT bands are measured separately
 *
 * A single worst case per quantity is honest and useless. Three of the
 * eighteen fixtures sit outside the era of observed ΔT — 1850, 1891 and 2099 —
 * and in that band Jade's ΔT polynomial and Swiss Ephemeris's own model
 * disagree by seconds of time. The Moon moves 33″ a minute, so the headline
 * number for the Moon becomes 69″ and says nothing at all about the ephemeris:
 * it is a clock difference, and both programs are right about the instant they
 * were asked for.
 *
 * Collapsing that into one figure forces a choice between two lies — publish
 * 69″ and imply the Moon is a minute of arc out on a normal birth chart, or
 * publish 4.4″ and quietly drop the fixtures that make the number large. So
 * the report carries both bands, the page prints both, and the relaxation is
 * explained in words next to them.
 */
interface Measured {
  readonly quantity: string;
  readonly error: number;
  readonly chart: string;
}

interface Measurement {
  readonly all: Measured[];
  readonly inDeltaTEra: Measured[];
  readonly extrapolated: Measured[];
  readonly chartsInDeltaTEra: number;
  readonly chartsExtrapolated: number;
}

/**
 * One pass over the fixtures, recording the worst disagreement per quantity in
 * each ΔT band. Pure, so the writer below and the drift gate below that are
 * measuring exactly the same thing rather than two similar things.
 */
function measure(): Measurement {
  const mean = new AstronomyEngineProvider({ nodeType: 'mean' });
  const trueNode = new AstronomyEngineProvider({ nodeType: 'true' });

  /** band → quantity → worst error, and the fixture that produced it. */
  const worst = new Map<string, Map<string, Measured>>();
  const bands = ['all', 'inDeltaTEra', 'extrapolated'] as const;
  for (const band of bands) worst.set(band, new Map());

  let chartsExtrapolated = 0;

  const bump = (band: string, quantity: string, error: number, chart: string): void => {
    const table = worst.get(band)!;
    const held = table.get(quantity);
    if (held === undefined || error > held.error) table.set(quantity, { quantity, error, chart });
  };

  for (const c of golden.cases as GoldenCase[]) {
    const extrapolating = isDeltaTExtrapolated(c.jdUt);
    if (extrapolating) chartsExtrapolated += 1;
    const record = (quantity: string, error: number): void => {
      bump('all', quantity, error, c.label);
      bump(extrapolating ? 'extrapolated' : 'inDeltaTEra', quantity, error, c.label);
    };

    const ch = computeChart(
      mean,
      { jdUt: c.jdUt, location: c.location },
      { ...DEFAULT_SETTINGS, includeOuters: true },
    );
    for (const [b, e] of Object.entries(c.points))
      record(b, Math.abs(wrap180(ch.points[b]!.longitude - e.siderealLongitude)) * 3600);
    record(
      'Ascendant',
      Math.abs(wrap180(ch.points.Ascendant!.longitude - c.ascendantSidereal)) * 3600,
    );
    record(
      'Midheaven',
      Math.abs(wrap180(ch.points.Midheaven!.longitude - c.midheavenSidereal)) * 3600,
    );
    const jdTt = jdTtFromJdUt(c.jdUt);
    record(
      '~ayanamsa',
      Math.abs(ayanamsa(jdTt, { mode: 'lahiri', includeNutation: true }) - c.ayanamsaApplied) *
        3600,
    );
    const n = nutation(jdTt);
    record('~dPsi', Math.abs(n.dPsi - c.nutationLongitude) * 3600);
    record('~obliquity', Math.abs(n.trueObliquity - c.trueObliquity) * 3600);
    const ch2 = computeChart(trueNode, { jdUt: c.jdUt, location: c.location });
    record(
      'TrueNode',
      Math.abs(wrap180(ch2.points.Rahu!.longitude - c.trueNode.siderealLongitude)) * 3600,
    );
  }

  /**
   * Worst first, so the published table opens on the number a sceptic would
   * look for rather than burying it under the ayanāṁśa.
   */
  const sorted = (band: string): Measured[] =>
    [...worst.get(band)!.values()].sort((a, b) => b.error - a.error);

  return {
    all: sorted('all'),
    inDeltaTEra: sorted('inDeltaTEra'),
    extrapolated: sorted('extrapolated'),
    chartsInDeltaTEra: golden.cases.length - chartsExtrapolated,
    chartsExtrapolated,
  };
}

function report(m: Measurement): Record<string, unknown> {
  const rows = (band: Measured[]) =>
    band.map((r) => ({ quantity: r.quantity, error: r.error, chart: r.chart }));
  return {
    generatedAgainst: golden.generator,
    provider: 'astronomy-engine',
    precisionClass: 'interactive',
    unit: 'arcsec',
    charts: golden.cases.length,
    chartsInDeltaTEra: m.chartsInDeltaTEra,
    chartsExtrapolated: m.chartsExtrapolated,
    deltaT: {
      observedEraFromJd: DELTA_T_OBSERVED_ERA.fromJd,
      observedEraToJd: DELTA_T_OBSERVED_ERA.toJd,
      relaxation: DELTA_T_RELAXATION,
    },
    worstCase: rows(m.all),
    worstCaseInDeltaTEra: rows(m.inDeltaTEra),
    worstCaseExtrapolated: rows(m.extrapolated),
  };
}

const serialise = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

it('reports worst-case error against Swiss Ephemeris', () => {
  const m = measure();

  console.error('\n  MAX ERROR vs Swiss Ephemeris (arcsec)\n  ' + '-'.repeat(70));
  console.error(
    '  ' +
      'quantity'.padEnd(12) +
      '1900–2050'.padStart(12) +
      'outside'.padStart(12) +
      '   worst fixture',
  );
  const extrapolated = new Map(m.extrapolated.map((r) => [r.quantity, r]));
  const inEra = new Map(m.inDeltaTEra.map((r) => [r.quantity, r]));
  for (const row of m.all) {
    console.error(
      '  ' +
        row.quantity.padEnd(12) +
        (inEra.get(row.quantity)?.error.toFixed(4) ?? '—').padStart(12) +
        (extrapolated.get(row.quantity)?.error.toFixed(4) ?? '—').padStart(12) +
        '   ' +
        row.chart,
    );
  }

  if (process.env.WRITE_ACCURACY_REPORT) {
    writeFileSync(REPORT_URL, serialise(report(m)));
  }
});

/**
 * The drift gate.
 *
 * The committed JSON is what the public page renders, and a file that is only
 * rewritten when somebody remembers to pass an environment variable is a file
 * that goes stale — which is exactly how /accuracy came to publish numbers no
 * run had produced. So the measurement is compared against the committed copy
 * on every CI run: upgrade `astronomy-engine`, regenerate the fixtures or
 * change the ayanāṁśa and this fails with the command that fixes it, rather
 * than letting the page keep a promise the code no longer keeps.
 *
 * Compared to four decimal places, which is the precision the report stores
 * and prints. Floating-point noise below a ten-thousandth of an arcsecond is
 * not a claim anybody is making.
 */
it('the committed accuracy report matches what this run measured', () => {
  const committed = serialise(JSON.parse(readFileSync(REPORT_URL, 'utf8')));
  const fresh = serialise(JSON.parse(serialise(report(measure()))));

  const round = (text: string): string =>
    text.replace(
      /"error": (-?\d+\.?\d*(?:e[-+]?\d+)?)/g,
      (_, n: string) => `"error": ${Number(n).toFixed(4)}`,
    );

  expect(
    round(fresh),
    'test/accuracy-report.json is stale — the /accuracy page is publishing it. ' +
      'Regenerate with: WRITE_ACCURACY_REPORT=1 pnpm --filter @jade/astro test',
  ).toBe(round(committed));
});
