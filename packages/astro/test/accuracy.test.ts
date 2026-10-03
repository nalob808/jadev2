import { describe, expect, it } from 'vitest';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { ayanamsa } from '../src/sidereal/ayanamsa.js';
import { nutation } from '../src/nutation.js';
import { jdTtFromJdUt } from '../src/time.js';
import { wrap180 } from '../src/angles.js';
import { DEFAULT_SETTINGS } from '../src/types.js';
import {
  INTERACTIVE_TOLERANCE_ARCSEC as TOLERANCE_ARCSEC,
  toleranceArcsecFor as budgetFor,
} from '../src/ephemeris/tolerances.js';

/**
 * The accuracy suite. Every tolerance here is a published promise — and the
 * numbers on Jade's /accuracy page are the same objects this file asserts
 * against, imported from `src/ephemeris/tolerances.ts`.
 *
 * That import is the point. The table used to be a local const here, and the
 * page quoted numbers somebody had typed by hand: the page promised the Sun
 * within 1.0″ while this suite enforced 2.0″ and the shipped provider measured
 * 3.8″. Nothing could catch that, because there was nothing shared to catch it
 * with. Now there is one table and two readers, so the published promise and
 * the enforced promise are the same sentence.
 *
 * The reference is Swiss Ephemeris via scripts/generate_fixtures.py. These
 * tolerances hold the MIT `astronomy-engine` provider, which is what ships
 * before the CHF 700 professional licence is bought. The swisseph provider is
 * held to 10x tighter tolerances once it lands.
 *
 * `budgetFor` applies the ΔT relaxation outside 1900–2050 — see the module for
 * why a 69″ Moon there is a clock disagreement rather than a wrong position.
 */
const ARCSEC = 1 / 3600;

type Case = (typeof golden.cases)[number];

function arcsecBetween(a: number, b: number): number {
  return Math.abs(wrap180(a - b)) / ARCSEC;
}

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });

describe('ayanamsa, nutation and obliquity vs Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(`${c.label}`, () => {
      const jdTt = jdTtFromJdUt(c.jdUt);
      const ours = ayanamsa(jdTt, { mode: 'lahiri', includeNutation: true });
      expect(arcsecBetween(ours, c.ayanamsaApplied)).toBeLessThan(TOLERANCE_ARCSEC.ayanamsa);

      const n = nutation(jdTt);
      expect(Math.abs(n.dPsi - c.nutationLongitude) / ARCSEC).toBeLessThan(
        TOLERANCE_ARCSEC.nutationLongitude,
      );
      expect(Math.abs(n.trueObliquity - c.trueObliquity) / ARCSEC).toBeLessThan(
        TOLERANCE_ARCSEC.obliquity,
      );
    });
  }
});

describe('sidereal longitudes vs Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(`${c.label}`, () => {
      const chart = computeChart(
        provider,
        { jdUt: c.jdUt, location: c.location },
        { ...DEFAULT_SETTINGS, includeOuters: true },
      );

      for (const [body, expected] of Object.entries(c.points)) {
        const actual = chart.points[body];
        expect(actual, `missing ${body}`).toBeDefined();
        const delta = arcsecBetween(actual!.longitude, expected.siderealLongitude);
        // Rāhu and Ketu resolve to the mean-node budget inside `budgetFor` —
        // the alias table lives with the budget, not with each caller.
        const limit = budgetFor(body, c.jdUt);
        expect(delta, `${body} off by ${delta.toFixed(3)}″ (limit ${limit}″)`).toBeLessThan(limit);
      }
    });
  }
});

describe('retrograde flags agree with Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(`${c.label}`, () => {
      const chart = computeChart(
        provider,
        { jdUt: c.jdUt, location: c.location },
        { ...DEFAULT_SETTINGS, includeOuters: true },
      );
      for (const [body, expected] of Object.entries(c.points)) {
        // Skip bodies within 0.001°/day of stationary — the sign of a speed
        // that small is not a meaningful disagreement.
        if (Math.abs(expected.speed) < 0.001) continue;
        expect(chart.points[body]!.retrograde, `${body} retrograde flag`).toBe(expected.speed < 0);
      }
    });
  }
});

describe('angles vs Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(`${c.label}`, () => {
      const chart = computeChart(provider, { jdUt: c.jdUt, location: c.location });
      expect(arcsecBetween(chart.points.Ascendant!.longitude, c.ascendantSidereal)).toBeLessThan(
        budgetFor('ascendant', c.jdUt),
      );
      expect(arcsecBetween(chart.points.Midheaven!.longitude, c.midheavenSidereal)).toBeLessThan(
        budgetFor('midheaven', c.jdUt),
      );
    });
  }
});

describe('whole-sign houses agree with Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(`${c.label}`, () => {
      const chart = computeChart(provider, { jdUt: c.jdUt, location: c.location });
      expect(chart.houses.cusps[0]).toBeCloseTo(c.wholeSignCuspsSidereal[0]!, 6);
      for (const [body, expected] of Object.entries(c.points)) {
        if (body === 'Uranus' || body === 'Neptune' || body === 'Pluto') continue;
        const expectedSign = Math.floor((((expected.siderealLongitude % 360) + 360) % 360) / 30);
        expect(chart.points[body]!.signIndex, `${body} sign`).toBe(expectedSign);
      }
    });
  }
});
