import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  dashaChainAt,
  skyNow,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import { dayFocus, liveArea, mentionsForbiddenTopic, ordinalNumber } from '../src/index.js';

/**
 * The focus section says "today is about this part of your life", which is the
 * single most overclaimable sentence in the app. These tests hold the claim to
 * what it actually rests on: the Moon is in that house, or a slow graha is, or
 * the running daśā lord rules it. Nothing about outcomes, and no agreement
 * asserted that two independent positions do not produce.
 */

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('../../astro/test/fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri' } as const;

/* Several charts and several days, because a focus layer that happens to be
   right about one instant is not tested at all. */
const SAMPLES = golden.cases.flatMap((one) => {
  const chart: ComputedChart = computeChart(provider, { jdUt: one.jdUt, location: one.location });
  const dasha = vimshottari(chart.points.Moon!.longitude, one.jdUt, { levels: 3 });
  /* Spread across a decade so the Moon lands in different houses and the
     daśā lord changes at least once. */
  return [0, 97, 400, 1500, 3650].map((days) => {
    const when = one.jdUt + 365.25 * 20 + days;
    return {
      label: `${one.label}+${days}d`,
      chart,
      sky: skyNow(provider, when, frame),
      chain: dashaChainAt(dasha, when),
    };
  });
});

describe('dayFocus', () => {
  it('always names today, because the Moon is always somewhere', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      const focus = dayFocus(chart, sky, chain);
      const today = focus.focuses.filter((one) => one.scale === 'today');
      expect(today.length, label).toBe(1);
      expect(today[0]!.place, label).toBeGreaterThanOrEqual(1);
      expect(today[0]!.place, label).toBeLessThanOrEqual(12);
    }
  });

  it('is deterministic', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      expect(JSON.stringify(dayFocus(chart, sky, chain)), label).toBe(
        JSON.stringify(dayFocus(chart, sky, chain)),
      );
    }
  });

  it('grounds every statement', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      for (const statement of dayFocus(chart, sky, chain).statements) {
        expect(statement.factors.length, label).toBeGreaterThan(0);
        expect(statement.text, label).not.toContain('undefined');
        expect(statement.text, label).not.toContain('NaN');
        for (const factor of statement.factors) {
          expect(factor.detail, label).not.toContain('undefined');
        }
      }
    }
  });

  it('never predicts an outcome', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      for (const statement of dayFocus(chart, sky, chain).statements) {
        expect(mentionsForbiddenTopic(statement.text), label).toBe(false);
        expect(statement.text, label).not.toMatch(
          /\b(?:you will|expect to|guaranteed|destined|fated|is going to happen)\b/i,
        );
      }
    }
  });

  /* The whole point of the agreement claim is that it is rare. A layer that
     announces agreement every day has not noticed anything. */
  it('claims agreement only when two scales really coincide', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      const focus = dayFocus(chart, sky, chain);
      if (focus.agreement === null) continue;
      const { place, scales } = focus.agreement;
      expect(scales.length, label).toBeGreaterThan(1);
      const actual = new Set(
        focus.focuses.filter((one) => one.place === place).map((one) => one.scale),
      );
      for (const scale of scales) expect(actual.has(scale), `${label}/${scale}`).toBe(true);
      expect(actual.size, label).toBe(scales.length);
    }
  });

  it('does not find agreement most days', () => {
    const agreeing = SAMPLES.filter(
      ({ chart, sky, chain }) => dayFocus(chart, sky, chain).agreement !== null,
    ).length;
    expect(agreeing).toBeLessThan(SAMPLES.length);
  });

  /* ...and does find it sometimes, or the branch is dead code. */
  it('finds agreement sometimes', () => {
    const agreeing = SAMPLES.filter(
      ({ chart, sky, chain }) => dayFocus(chart, sky, chain).agreement !== null,
    ).length;
    expect(agreeing).toBeGreaterThan(0);
  });

  it('separates the clocks it is quoting', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      const focus = dayFocus(chart, sky, chain);
      for (const one of focus.focuses) {
        if (one.scale === 'today') expect(one.by, label).toBe('Moon');
        if (one.scale === 'season') expect(['Saturn', 'Jupiter'], label).toContain(one.by);
        if (one.scale === 'period') expect(one.by, label).toBe(chain[chain.length - 1]!.lord);
      }
    }
  });

  it('points at a real house or at nothing', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      const live = liveArea(dayFocus(chart, sky, chain));
      if (live === null) continue;
      expect(live, label).toBeGreaterThanOrEqual(1);
      expect(live, label).toBeLessThanOrEqual(12);
    }
  });

  it('works with no daśā at all', () => {
    for (const { label, chart, sky } of SAMPLES.slice(0, 3)) {
      const focus = dayFocus(chart, sky);
      expect(
        focus.focuses.some((one) => one.scale === 'period'),
        label,
      ).toBe(false);
      expect(focus.statements.length, label).toBeGreaterThan(0);
    }
  });
});

describe('ordinals', () => {
  /* Three labels shipped reading "1th house" before anybody read one out loud. */
  it('are spelled the way they are said', () => {
    const cases: Array<[number, string]> = [
      [1, '1st'],
      [2, '2nd'],
      [3, '3rd'],
      [4, '4th'],
      [9, '9th'],
      [11, '11th'],
      [12, '12th'],
      [13, '13th'],
      [21, '21st'],
      [22, '22nd'],
      [23, '23rd'],
      [101, '101st'],
      [111, '111th'],
    ];
    for (const [input, expected] of cases) expect(ordinalNumber(input)).toBe(expected);
  });

  it('never labels a house wrongly', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      for (const statement of dayFocus(chart, sky, chain).statements) {
        expect(statement.anchor?.label ?? '', label).not.toMatch(/\b(?:1th|2th|3th|21th)\b/);
      }
    }
  });

  /* A factor's label already names the graha; the detail repeating it read
     "MOON the Moon is crossing the first" on the page. */
  it('does not repeat the graha inside its own factor', () => {
    for (const { label, chart, sky, chain } of SAMPLES) {
      for (const statement of dayFocus(chart, sky, chain).statements) {
        for (const factor of statement.factors) {
          expect(factor.detail.toLowerCase(), `${label}: ${factor.kind}`).not.toContain(
            factor.kind.toLowerCase(),
          );
        }
      }
    }
  });
});
