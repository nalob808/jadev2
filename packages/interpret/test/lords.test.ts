import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider, computeChart, type ComputedChart } from '@jade/astro';
import { lordPatternStatements, lordSurvey } from '../src/index.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('../../astro/test/fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const charts: { label: string; chart: ComputedChart }[] = golden.cases.map((c) => ({
  label: c.label,
  chart: computeChart(provider, { jdUt: c.jdUt, location: c.location }),
}));

describe('the house lords', () => {
  it('surveys all twelve houses, on every fixture', () => {
    for (const { label, chart } of charts) {
      const survey = lordSurvey(chart);
      expect(survey.placements, label).toHaveLength(12);
      expect(
        survey.placements.map((p) => p.house),
        label,
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  /**
   * The count has to close.
   *
   * Five grahas rule two signs each and two rule one, so twelve houses are
   * always covered by exactly seven lords — five of them appearing twice.
   * Any other shape means the sign-lordship table or the house arithmetic is
   * wrong, and that is the sort of error that produces a plausible-looking
   * table nobody checks.
   */
  it('always finds exactly five grahas ruling two houses each', () => {
    for (const { label, chart } of charts) {
      const survey = lordSurvey(chart);
      expect(survey.doubleLords, label).toHaveLength(5);
      for (const double of survey.doubleLords) {
        expect(double.houses, `${label} ${double.graha}`).toHaveLength(2);
      }
      const distinct = new Set(survey.placements.map((p) => p.lord));
      expect(distinct.size, label).toBe(7);
    }
  });

  it('agrees with the chart about where each lord actually sits', () => {
    for (const { label, chart } of charts) {
      for (const row of lordSurvey(chart).placements) {
        const point = chart.points[row.lord]!;
        expect(row.inSign, `${label} ${row.lord}`).toBe(point.sign);
        expect(row.inHouse, `${label} ${row.lord}`).toBe(point.house);
        expect(row.retrograde, `${label} ${row.lord}`).toBe(point.retrograde);
      }
    }
  });

  it('marks a lord in its own house, and only then', () => {
    for (const { label, chart } of charts) {
      for (const row of lordSurvey(chart).placements) {
        expect(row.ownHouse, `${label} ${row.house}`).toBe(row.inHouse === row.house);
      }
    }
  });

  it('counts hubs from the placements rather than inventing them', () => {
    for (const { label, chart } of charts) {
      const survey = lordSurvey(chart);
      for (const hub of survey.hubs) {
        const actual = survey.placements.filter((p) => p.inHouse === hub.house).map((p) => p.house);
        expect(
          [...hub.from].sort((a, b) => a - b),
          `${label} hub ${hub.house}`,
        ).toEqual(actual.sort((a, b) => a - b));
        expect(hub.from.length, `${label} hub ${hub.house}`).toBeGreaterThanOrEqual(2);
      }
      // Hubs are ordered by size, so a reader scanning top-down meets the
      // engine of the chart first.
      for (let i = 1; i < survey.hubs.length; i += 1) {
        expect(survey.hubs[i - 1]!.from.length).toBeGreaterThanOrEqual(survey.hubs[i]!.from.length);
      }
    }
  });

  it('never states a pattern without the placements behind it', () => {
    for (const { label, chart } of charts) {
      for (const statement of lordPatternStatements(lordSurvey(chart))) {
        expect(statement.factors.length, `${label}: ${statement.text}`).toBeGreaterThan(0);
        expect(statement.text, label).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
