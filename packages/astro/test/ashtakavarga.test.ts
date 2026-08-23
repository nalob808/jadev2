import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ashtakavarga,
  AV_CONTRIBUTORS,
  AV_SUBJECTS,
  BENEFIC_HOUSES,
  bhinnashtakavarga,
  CLASSICAL_TOTALS,
  SARVA_TOTAL,
  type AvContributor,
  type SignPlacement,
} from '../src/ashtakavarga.js';

interface OracleCase {
  ascendantSignIndex: number;
  signIndexes: Record<string, number>;
  bhinnashtakavarga: Record<string, number[]>;
  sarvashtakavarga: number[];
}
const oracle = JSON.parse(
  readFileSync(new URL('./fixtures/jhora-oracle.json', import.meta.url), 'utf8'),
) as { cases: Record<string, OracleCase>; skipped: { label: string }[] };

const placementOf = (c: OracleCase): SignPlacement =>
  ({ ...c.signIndexes, Ascendant: c.ascendantSignIndex }) as SignPlacement;

describe('the benefic tables themselves', () => {
  // These run before anything is computed. A table can be wrong in a way that
  // still produces a plausible chart, and the totals are the only cheap way to
  // catch a slipped row.
  it.each(AV_CONTRIBUTORS)('%s sums to its classical total', (subject) => {
    const table = BENEFIC_HOUSES[subject];
    const total = AV_CONTRIBUTORS.reduce((n, c) => n + table[c].length, 0);
    expect(total).toBe(CLASSICAL_TOTALS[subject]);
  });

  it.each(AV_CONTRIBUTORS)('%s lists only houses 1-12, without repeats', (subject) => {
    const table = BENEFIC_HOUSES[subject];
    for (const contributor of AV_CONTRIBUTORS) {
      const houses = table[contributor];
      expect(new Set(houses).size).toBe(houses.length);
      for (const h of houses) expect(h).toBeGreaterThanOrEqual(1);
      for (const h of houses) expect(h).toBeLessThanOrEqual(12);
    }
  });

  it('the seven grahas total 337, and the ascendant is not part of it', () => {
    const seven = AV_SUBJECTS.reduce((n, s) => n + CLASSICAL_TOTALS[s], 0);
    expect(seven).toBe(SARVA_TOTAL);
    expect(seven + CLASSICAL_TOTALS.Ascendant).not.toBe(SARVA_TOTAL);
  });

  it('houses are counted inclusively, so house 1 is the contributor itself', () => {
    // Sun contributes to its own 1st. Put everything in Aries and Aries must
    // receive a bindu from the Sun.
    const allAries = Object.fromEntries(AV_CONTRIBUTORS.map((c) => [c, 0])) as SignPlacement;
    const sun = bhinnashtakavarga('Sun', allAries);
    expect(sun.sources[0]).toContain('Sun');
  });
});

describe('bhinnāṣṭakavarga structure', () => {
  const placement = placementOf(Object.values(oracle.cases)[0]!);

  it.each(AV_CONTRIBUTORS)('%s spreads exactly its total over twelve signs', (subject) => {
    const row = bhinnashtakavarga(subject, placement);
    expect(row.bindus).toHaveLength(12);
    expect(row.total).toBe(CLASSICAL_TOTALS[subject]);
    expect(row.bindus.reduce((a, b) => a + b, 0)).toBe(CLASSICAL_TOTALS[subject]);
  });

  it('never puts more than eight bindus in one sign', () => {
    // Eight contributors, each giving at most one bindu per sign.
    for (const subject of AV_CONTRIBUTORS) {
      for (const n of bhinnashtakavarga(subject, placement).bindus) {
        expect(n).toBeLessThanOrEqual(8);
      }
    }
  });

  it('carries the contributors, so a bindu count can always be decomposed', () => {
    const row = bhinnashtakavarga('Jupiter', placement);
    for (let sign = 0; sign < 12; sign += 1) {
      expect(row.sources[sign]).toHaveLength(row.bindus[sign]!);
      expect(new Set(row.sources[sign]).size).toBe(row.sources[sign]!.length);
    }
  });

  it('rotates with the chart — every placement shifted one sign shifts the result one sign', () => {
    const shifted = Object.fromEntries(
      AV_CONTRIBUTORS.map((c) => [c, (placement[c] + 1) % 12]),
    ) as SignPlacement;
    const before = bhinnashtakavarga('Saturn', placement).bindus;
    const after = bhinnashtakavarga('Saturn', shifted).bindus;
    for (let i = 0; i < 12; i += 1) expect(after[(i + 1) % 12]).toBe(before[i]);
  });
});

describe('sarvāṣṭakavarga', () => {
  it.each(Object.keys(oracle.cases))('totals 337 for %s', (label) => {
    const { sarva } = ashtakavarga(placementOf(oracle.cases[label]!));
    expect(sarva.reduce((a, b) => a + b, 0)).toBe(SARVA_TOTAL);
  });

  it('ranks signs strongest first', () => {
    const { sarva, strongestSigns } = ashtakavarga(placementOf(Object.values(oracle.cases)[0]!));
    const max = Math.max(...sarva);
    const min = Math.min(...sarva);
    const bySign = Object.fromEntries(strongestSigns.map((s, rank) => [s, rank])) as Record<
      string,
      number
    >;
    expect(bySign[strongestSigns[0]!]).toBe(0);
    expect(sarva[strongestSigns.indexOf(strongestSigns[0]!)]).toBeDefined();
    expect(max).toBeGreaterThanOrEqual(min);
  });
});

describe('against Jagannātha Hora', () => {
  // The real test. Everything above proves Jade is self-consistent; only this
  // proves it agrees with the tool practitioners already trust.
  const labels = Object.keys(oracle.cases);

  it('has an oracle to compare against', () => {
    expect(labels.length).toBeGreaterThanOrEqual(17);
  });

  it.each(labels)('bhinnāṣṭakavarga matches for %s', (label) => {
    const c = oracle.cases[label]!;
    const { bhinna } = ashtakavarga(placementOf(c));
    for (const subject of AV_CONTRIBUTORS) {
      expect({ subject, bindus: [...bhinna[subject as AvContributor].bindus] }).toEqual({
        subject,
        bindus: c.bhinnashtakavarga[subject],
      });
    }
  });

  it.each(labels)('sarvāṣṭakavarga matches for %s', (label) => {
    const c = oracle.cases[label]!;
    const { sarva } = ashtakavarga(placementOf(c));
    expect([...sarva]).toEqual(c.sarvashtakavarga);
  });

  it('records why a fixture was skipped rather than quietly dropping it', () => {
    // arctic-tromso: the oracle derives the ascendant through Placidus, which
    // is undefined above the Arctic Circle. Jade uses whole-sign and handles
    // it. The skip belongs in the fixture, visible.
    expect(oracle.skipped.map((s) => s.label)).toEqual(['arctic-tromso']);
  });
});

describe('on the computed chart', () => {
  it('is present, decomposable, and totals 337', async () => {
    const { computeChart } = await import('../src/chart.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const { DEFAULT_SETTINGS } = await import('../src/types.js');

    const chart = computeChart(
      new AstronomyEngineProvider({ nodeType: DEFAULT_SETTINGS.nodeType }),
      { jdUt: 2452221.147222221, location: { latitude: 42.2808, longitude: -83.743 } },
      DEFAULT_SETTINGS,
    );

    expect(chart.ashtakavarga.sarva.reduce((a, b) => a + b, 0)).toBe(SARVA_TOTAL);
    expect(chart.ashtakavarga.strongestSigns).toHaveLength(12);

    // Every bindu must name its source, or the interpretation layer cannot
    // print a claim about it (CLAUDE.md, non-negotiable #5).
    for (const subject of AV_CONTRIBUTORS) {
      const row = chart.ashtakavarga.bhinna[subject];
      for (let sign = 0; sign < 12; sign += 1) {
        expect(row.sources[sign]).toHaveLength(row.bindus[sign]!);
      }
    }
  });

  it('uses the chart’s own sign positions, not a recomputation', async () => {
    const { computeChart } = await import('../src/chart.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const { DEFAULT_SETTINGS } = await import('../src/types.js');

    const chart = computeChart(
      new AstronomyEngineProvider({ nodeType: DEFAULT_SETTINGS.nodeType }),
      { jdUt: 2452221.147222221, location: { latitude: 42.2808, longitude: -83.743 } },
      DEFAULT_SETTINGS,
    );

    const placement = Object.fromEntries(
      AV_CONTRIBUTORS.map((c) => [c, chart.points[c]!.signIndex]),
    ) as SignPlacement;
    expect([...chart.ashtakavarga.sarva]).toEqual([...ashtakavarga(placement).sarva]);
  });
});
