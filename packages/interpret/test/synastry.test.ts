import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ashtakuta,
  compareMangala,
  computeChart,
  AstronomyEngineProvider,
  POINT_DISPLAY_ORDER,
  synastry,
  type ComputedChart,
  type Graha,
} from '@jade/astro';
import { FORBIDDEN_TOPICS, SYNASTRY_PREAMBLE, synastryReadingFor } from '../src/index.js';

/**
 * The compatibility page is the single most likely place for this project to
 * break its own promise, and the promise is public: the landing page and the
 * accuracy page both say Jade returns no compatibility score and no verdict.
 * Most of what follows tests that the prose keeps it.
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
const cast = (c: GoldenCase): ComputedChart =>
  computeChart(provider, { jdUt: c.jdUt, location: c.location });

const chartA = cast(golden.cases.find((c) => c.label === 'v0-reference-chart')!);
// A second, genuinely different chart rather than the same one twice — half
// these assertions would pass trivially against a chart compared with itself.
const chartB = cast(golden.cases.find((c) => c.label !== 'v0-reference-chart')!);

const signMapOf = (chart: ComputedChart): Record<Graha, number> => {
  const out: Record<string, number> = {};
  for (const id of POINT_DISPLAY_ORDER) {
    const p = chart.points[id];
    if (p) out[id] = p.signIndex;
  }
  return out as Record<Graha, number>;
};

const mangalaA = { ascendantSign: chartA.houses.ascendantSign, signOf: signMapOf(chartA) };
const mangalaB = { ascendantSign: chartB.houses.ascendantSign, signOf: signMapOf(chartB) };

const sections = synastryReadingFor({
  chartA,
  chartB,
  nameA: 'Ilona',
  nameB: 'Rafael',
  overlays: synastry(mangalaA, mangalaB),
  kutas: ashtakuta(
    { nakshatra: chartA.points.Moon!.nakshatra.index, pada: chartA.points.Moon!.nakshatra.pada },
    { nakshatra: chartB.points.Moon!.nakshatra.index, pada: chartB.points.Moon!.nakshatra.pada },
  ),
  mangala: compareMangala(mangalaA, mangalaB),
});
const every = sections.flatMap((s) => s.statements);
const prose = every.map((s) => s.text).join(' ');

describe('synastryReadingFor', () => {
  it('composes a substantial reading', () => {
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(every.length).toBeGreaterThan(6);
    // "Way more to read" was the actual request; this is the floor.
    expect(prose.length).toBeGreaterThan(2500);
  });

  it('grounds every statement, with no exceptions', () => {
    for (const statement of every) {
      expect(statement.factors.length, statement.text.slice(0, 60)).toBeGreaterThan(0);
      expect(statement.text).not.toContain('undefined');
      expect(statement.text).not.toContain('NaN');
      expect(statement.text).not.toContain('[object');
      for (const factor of statement.factors) {
        expect(factor.detail).not.toContain('undefined');
        expect(factor.detail).not.toContain('NaN');
      }
    }
  });

  it('returns no verdict and no score of its own', () => {
    // The public promise, asserted. Aṣṭakūṭa's own total may be quoted — it is
    // a named classical technique — but Jade must never produce a rating.
    const lower = prose.toLowerCase();
    for (const phrase of [
      'compatible',
      'incompatible',
      'compatibility score',
      'out of 100',
      '%',
      'excellent match',
      'poor match',
      'good match',
      'bad match',
      'well matched',
      'should not marry',
      'should marry',
      'we recommend',
      'you should',
      'will be happy',
      'will fail',
      'destined',
      'soulmate',
    ]) {
      expect(lower, `the reading said "${phrase}"`).not.toContain(phrase);
    }
  });

  it('never says any of the constitutionally forbidden things', () => {
    const lower = prose.toLowerCase();
    for (const word of FORBIDDEN_TOPICS) {
      expect(lower, `the reading said "${word}"`).not.toContain(word);
    }
  });

  it('frames the aṣṭakūṭa total as a limitation rather than a result', () => {
    const kutaSection = sections.find((s) => s.id === 'synastry-kutas')!;
    const text = kutaSection.statements
      .map((s) => s.text)
      .join(' ')
      .toLowerCase();
    expect(text).toContain('nakṣatra');
    // The specific claim that keeps the number honest.
    expect(text).toMatch(/nothing else|never meant to be the reading|less weight/);
  });

  it('shows every kūṭa component, not just the total', () => {
    const kutaStatement = sections
      .find((s) => s.id === 'synastry-kutas')!
      .statements.find((s) => s.factors.length >= 8)!;
    expect(kutaStatement).toBeTruthy();
    expect(kutaStatement.factors.length).toBe(8);
    for (const factor of kutaStatement.factors) {
      expect(factor.detail).toMatch(/\d+ of \d+/);
    }
  });

  it('reads tārā bala in both directions rather than averaging it', () => {
    const moons = sections.find((s) => s.id === 'synastry-moons')!;
    const directional = moons.statements.find((s) =>
      s.factors.some((f) => f.kind.includes('from')),
    )!;
    expect(directional).toBeTruthy();
    const kinds = directional.factors.map((f) => f.kind);
    expect(kinds).toContain('Ilona from Rafael');
    expect(kinds).toContain('Rafael from Ilona');
  });

  it('names both people, so it could only be this pair', () => {
    expect(prose).toContain('Ilona');
    expect(prose).toContain('Rafael');
    expect(prose).toMatch(/\d+°\d{2}′/);
  });

  it('opens by saying what it is not', () => {
    expect(SYNASTRY_PREAMBLE.toLowerCase()).toContain('no compatibility score');
    expect(SYNASTRY_PREAMBLE.toLowerCase()).toContain('no verdict');
  });

  it('is a pure function of its arguments', () => {
    const input = {
      chartA,
      chartB,
      nameA: 'Ilona',
      nameB: 'Rafael',
      overlays: synastry(mangalaA, mangalaB),
      kutas: ashtakuta(
        {
          nakshatra: chartA.points.Moon!.nakshatra.index,
          pada: chartA.points.Moon!.nakshatra.pada,
        },
        {
          nakshatra: chartB.points.Moon!.nakshatra.index,
          pada: chartB.points.Moon!.nakshatra.pada,
        },
      ),
      mangala: compareMangala(mangalaA, mangalaB),
    };
    expect(JSON.stringify(synastryReadingFor(input))).toBe(JSON.stringify(sections));
  });

  it('reads the same pair the other way round without crashing or repeating', () => {
    const swapped = synastryReadingFor({
      chartA: chartB,
      chartB: chartA,
      nameA: 'Rafael',
      nameB: 'Ilona',
      overlays: synastry(mangalaB, mangalaA),
      kutas: ashtakuta(
        {
          nakshatra: chartB.points.Moon!.nakshatra.index,
          pada: chartB.points.Moon!.nakshatra.pada,
        },
        {
          nakshatra: chartA.points.Moon!.nakshatra.index,
          pada: chartA.points.Moon!.nakshatra.pada,
        },
      ),
      mangala: compareMangala(mangalaB, mangalaA),
    });
    const swappedProse = swapped.flatMap((s) => s.statements.map((st) => st.text)).join(' ');
    expect(swappedProse.length).toBeGreaterThan(2000);
    // Directional techniques must actually change when the direction does.
    expect(swappedProse).not.toBe(prose);
  });
});
