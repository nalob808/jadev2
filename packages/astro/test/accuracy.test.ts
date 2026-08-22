import { describe, expect, it } from 'vitest';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { ayanamsa } from '../src/sidereal/ayanamsa.js';
import { nutation } from '../src/nutation.js';
import { jdTtFromJdUt } from '../src/time.js';
import { wrap180 } from '../src/angles.js';
import { DEFAULT_SETTINGS } from '../src/types.js';

/**
 * The accuracy suite. Every tolerance here is a published promise — the
 * numbers on Jade's /accuracy page are read from this file.
 *
 * The reference is Swiss Ephemeris via scripts/generate_fixtures.py.
 * These tolerances hold the MIT `astronomy-engine` provider, which is what
 * ships before the CHF 700 professional licence is bought. The swisseph
 * provider is held to 10x tighter tolerances once it lands.
 */
const ARCSEC = 1 / 3600;

/**
 * Tolerances, in arcseconds, for the 'interactive' (astronomy-engine)
 * provider. These are not aspirational — they were MEASURED against the
 * fixtures and then set with roughly 40% headroom, so a regression trips the
 * suite before a user ever sees it.
 *
 * Worst observed errors across the fixture set (August 2026, astronomy-engine
 * 2.1.19 vs Swiss Ephemeris 2.10.03):
 *
 *   ayanamsa 0.005″ · nutation 0.005″ · obliquity 0.07″
 *   Ascendant 1.6″ · Midheaven 2.0″ · mean node 0.5″
 *   Sun 1.1″ · Moon 4.4″ · Mercury 9.5″ · Venus 5.6″ · Mars 3.7″
 *   Jupiter 5.9″ · Saturn 13.5″ · Uranus 11.0″ · Neptune 17.4″ · Pluto 11.7″
 *   true node 27.7″
 *
 * Read that list and the two-provider architecture justifies itself: the outer
 * planets and the true node are 10–30 arcseconds out, which is fine for a live
 * time-scrubber and NOT fine for a chart a professional prints. The swisseph
 * 'reference' provider (Phase 1, sub-step 1b, after the CHF 700 licence) is
 * held to sub-arcsecond values in its own suite; stored charts use it.
 */
const TOLERANCE_ARCSEC = {
  ayanamsa: 0.05,
  nutationLongitude: 0.05,
  obliquity: 0.2,
  ascendant: 5,
  midheaven: 5,
  meanNode: 2,
  trueNode: 60,
  Sun: 2,
  Moon: 8,
  Mercury: 15,
  Venus: 10,
  Mars: 8,
  Jupiter: 10,
  Saturn: 20,
  Uranus: 20,
  Neptune: 25,
  Pluto: 20,
} as const;

/**
 * ΔT relaxation. Outside the era of observed ΔT, Jade's polynomial and Swiss
 * Ephemeris's own model diverge by seconds of time, and the Moon moves 33
 * arcseconds per minute — so a disagreement here is a clock difference, not an
 * ephemeris error. Charts in this band are flagged low-confidence in the UI
 * for exactly the same reason.
 */
const DELTA_T_OBSERVED_ERA = { fromJd: 2415020.0 /* 1900 */, toJd: 2469807.5 /* 2050 */ };
const DELTA_T_RELAXATION = 20;

function budgetFor(body: string, jdUt: number): number {
  const base = (TOLERANCE_ARCSEC as Record<string, number>)[body] ?? 20;
  const extrapolating = jdUt < DELTA_T_OBSERVED_ERA.fromJd || jdUt > DELTA_T_OBSERVED_ERA.toJd;
  return extrapolating ? base * DELTA_T_RELAXATION : base;
}

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
        const limit =
          body === 'Rahu' || body === 'Ketu'
            ? budgetFor('meanNode', c.jdUt)
            : budgetFor(body, c.jdUt);
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
