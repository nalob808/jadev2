import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  dashaChainAt,
  panchangaNow,
  skyNow,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import { BAND_CAVEAT, FORBIDDEN_TOPICS, dailyReadingFor, transitHouse } from '../src/index.js';

/**
 * The daily reading is the part of Jade under the most pressure to become a
 * horoscope, so most of what is asserted here is what it must *not* say.
 */

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('../../astro/test/fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const reference = golden.cases.find((c) => c.label === 'v0-reference-chart')!;
const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri' } as const;

const chart: ComputedChart = computeChart(provider, {
  jdUt: reference.jdUt,
  location: reference.location,
});

// A fixed "today", twenty years after the birth. Never a clock.
const TODAY = reference.jdUt + 365.25 * 20;
const sky = skyNow(provider, TODAY, frame);
const panchanga = panchangaNow(provider, TODAY, frame);
const dasha = vimshottari(chart.points.Moon!.longitude, reference.jdUt, { levels: 3 });
const chain = dashaChainAt(dasha, TODAY);

const daily = dailyReadingFor(chart, sky, { dasha: chain, panchanga })!;
const every = daily.sections.flatMap((s) => s.statements);

describe('dailyReadingFor', () => {
  it('composes something to actually read', () => {
    expect(daily.sections.length).toBeGreaterThanOrEqual(3);
    expect(every.length).toBeGreaterThan(6);
  });

  it('grounds every statement, with no exceptions', () => {
    // Constitution item 5, at the composer rather than at the UI.
    for (const statement of every) {
      expect(statement.factors.length, statement.text.slice(0, 60)).toBeGreaterThan(0);
      expect(statement.text.length).toBeGreaterThan(60);
      expect(statement.text).not.toContain('undefined');
      expect(statement.text).not.toContain('NaN');
      expect(statement.text).not.toContain('[object');
      for (const factor of statement.factors) {
        expect(factor.detail).not.toContain('undefined');
        expect(factor.detail).not.toContain('NaN');
      }
    }
  });

  it('anchors every statement so a note can be written against it', () => {
    for (const statement of every) {
      expect(statement.anchor, statement.text.slice(0, 50)).toBeTruthy();
      expect(statement.anchor!.key.length).toBeGreaterThan(0);
    }
  });

  it('never says any of the forbidden things', () => {
    const prose = every
      .map((s) => s.text)
      .join(' ')
      .toLowerCase();
    for (const word of FORBIDDEN_TOPICS) {
      expect(prose, `the reading said "${word}"`).not.toContain(word);
    }
  });

  it('never predicts, promises or advises about outcomes', () => {
    // The specific failure mode for a *daily* reading: prose that slides from
    // describing a position to telling the reader what today holds.
    const prose = every
      .map((s) => s.text)
      .join(' ')
      .toLowerCase();
    for (const phrase of [
      'you will',
      "you'll",
      'today will',
      'expect a',
      'expect to',
      'a good day',
      'a bad day',
      'lucky',
      'unlucky',
      'auspicious for you',
      'avoid ',
      'you should',
      'make sure to',
      'be careful',
    ]) {
      expect(prose, `the reading said "${phrase}"`).not.toContain(phrase);
    }
  });

  it('prints the caveat wherever the band is', () => {
    const moonSection = daily.sections.find((s) => s.id === 'daily-moon')!;
    expect(moonSection.lede).toBe(BAND_CAVEAT);
    expect(BAND_CAVEAT.toLowerCase()).toContain('not what will happen');
  });

  it('quotes the tradition rather than judging, and cites it', () => {
    const moonSection = daily.sections.find((s) => s.id === 'daily-moon')!;
    const cited = moonSection.statements.filter((s) => s.source);
    expect(cited.length).toBeGreaterThan(0);
    // The tārā note must frame favourability as being about undertakings.
    const taraText = moonSection.statements[0]!.text.toLowerCase();
    expect(/tārā|tara/.test(taraText), 'the first Moon statement does not name the tārā').toBe(
      true,
    );
  });

  it('names the actual degrees, so it could only be this chart', () => {
    const prose = every.map((s) => s.text).join(' ');
    expect(prose).toMatch(/\d+°\d{2}′/);
  });

  it('reports the innermost daśā lord, not the outermost', () => {
    const dashaStatement = every.find((s) => s.anchor?.kind === 'dasha')!;
    expect(dashaStatement).toBeTruthy();
    expect(dashaStatement.anchor!.key).toBe(chain[chain.length - 1]!.lord);
  });

  it('returns the same band the astro layer computed', () => {
    expect(['favourable', 'mixed', 'difficult']).toContain(daily.quality.band);
    expect(daily.quality.factors.length).toBe(2);
  });

  it('is a pure function of its arguments', () => {
    const again = dailyReadingFor(chart, sky, { dasha: chain, panchanga })!;
    expect(JSON.stringify(again)).toBe(JSON.stringify(daily));
  });

  it('degrades rather than inventing when the pañcāṅga is absent', () => {
    const bare = dailyReadingFor(chart, sky)!;
    expect(bare.sections.some((s) => s.id === 'daily-moon')).toBe(true);
    // No pañcāṅga and no daśā means that section carries nothing, so it is
    // absent — not present and empty, and certainly not filled with guesses.
    expect(bare.sections.some((s) => s.id === 'daily-panchanga')).toBe(false);
  });

  it('returns null rather than half a reading when the Moon is missing', () => {
    expect(
      dailyReadingFor(
        chart,
        sky.filter((p) => p.id !== 'Moon'),
      ),
    ).toBeNull();
  });
});

describe('transitHouse', () => {
  it('counts whole-sign from the ascendant', () => {
    const asc = chart.houses.ascendantSign;
    expect(transitHouse(chart, asc * 30 + 5)).toBe(1);
    expect(transitHouse(chart, ((asc + 6) % 12) * 30 + 5)).toBe(7);
    expect(transitHouse(chart, ((asc + 11) % 12) * 30 + 5)).toBe(12);
  });

  it('wraps rather than going negative', () => {
    const asc = chart.houses.ascendantSign;
    expect(transitHouse(chart, ((asc + 11) % 12) * 30 - 355)).toBeGreaterThan(0);
    for (let l = 0; l < 360; l += 7) {
      const house = transitHouse(chart, l)!;
      expect(house).toBeGreaterThanOrEqual(1);
      expect(house).toBeLessThanOrEqual(12);
    }
  });

  it('refuses rather than guessing under a house system it cannot count in', () => {
    // Attributing a transit to the wrong house is worse than saying nothing,
    // so this returns null and the caller drops the section.
    const equal = {
      ...chart,
      houses: { ...chart.houses, system: 'equal' },
    } as unknown as ComputedChart;
    expect(transitHouse(equal, 100)).toBeNull();
    expect(dailyReadingFor(equal, sky)!.sections.some((s) => s.id === 'daily-transits')).toBe(
      false,
    );
  });
});
