import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import { GLOSSARY, buildScopeIndex, glossaryScopeForPoint } from '../src/index.js';

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
const chart: ComputedChart = computeChart(provider, {
  jdUt: reference.jdUt,
  location: reference.location,
});
const dasha = vimshottari(chart.points.Moon!.longitude, reference.jdUt, { levels: 3 });
const nowJd = reference.jdUt + 365.25 * 30;
const scopes = buildScopeIndex(chart, { dasha, nowJd });

describe('scoped context', () => {
  /**
   * The point of the whole file.
   *
   * `Nakṣatra` appears as a column header in every graha's row. Answering with
   * the Moon's nakṣatra in Saturn's row is not merely unhelpful — the reader
   * pointed at Saturn and was told about the Moon.
   */
  it('answers about the graha the word is standing next to', () => {
    const saturn = glossaryScopeForPoint(chart, 'Saturn', { dasha, nowJd });
    const mars = glossaryScopeForPoint(chart, 'Mars', { dasha, nowJd });
    expect(saturn['nakshatra']?.join(' ')).toContain(chart.points.Saturn!.nakshatra.name);
    expect(saturn['nakshatra']?.join(' ')).toContain('Saturn');
    expect(mars['nakshatra']?.join(' ')).toContain('Mars');
    expect(saturn['nakshatra']).not.toEqual(mars['nakshatra']);
  });

  it('says where the graha is, in its own sign and house', () => {
    const sun = glossaryScopeForPoint(chart, 'Sun');
    expect(sun['rasi']?.join(' ')).toContain(chart.points.Sun!.sign);
    expect(sun['bhava']?.join(' ')).toMatch(
      new RegExp(`${chart.points.Sun!.house}(st|nd|rd|th) house`),
    );
  });

  /** Dṛṣṭi is named by distance, because that is how a practitioner says it. */
  it('names the special aspects by their distance', () => {
    const jupiter = glossaryScopeForPoint(chart, 'Jupiter');
    const said = jupiter['drishti']?.join(' ') ?? '';
    expect(said).toContain('5th');
    expect(said).toContain('7th');
    expect(said).toContain('9th');
    const saturn = glossaryScopeForPoint(chart, 'Saturn');
    expect(saturn['drishti']?.join(' ')).toContain('10th');
  });

  /**
   * `signsAspectedBy` throws for anything that is not one of the seven. The
   * angles and the outers are real chart points and must not take a tooltip
   * down with them.
   */
  it('survives points that do not aspect', () => {
    for (const id of ['Ascendant', 'Rahu', 'Ketu']) {
      const scope = glossaryScopeForPoint(chart, id);
      expect(scope['rasi'], id).toBeDefined();
      expect(scope['drishti'], id).toBeUndefined();
    }
  });

  it('returns nothing for a point that is not in the chart', () => {
    expect(glossaryScopeForPoint(chart, 'Vulcan')).toEqual({});
  });

  describe('the scope index', () => {
    it('covers every point, all twelve houses, all twelve signs and every varga', () => {
      for (const id of Object.keys(chart.points)) expect(scopes[id], id).toBeDefined();
      for (let house = 1; house <= 12; house += 1) expect(scopes[`house:${house}`]).toBeDefined();
      for (let sign = 0; sign < 12; sign += 1) expect(scopes[`sign:${sign}`]).toBeDefined();
      expect(scopes['varga:D9']?.['navamsa']).toBeDefined();
    });

    it('names the sign and lord of each house from this chart’s lagna', () => {
      const first = scopes['house:1']!;
      expect(first['bhava']?.join(' ')).toContain(chart.points.Ascendant!.sign);
    });

    it('only ever describes terms that exist', () => {
      const ids = new Set(GLOSSARY.map((entry) => entry.id));
      for (const [scope, lines] of Object.entries(scopes)) {
        for (const id of Object.keys(lines)) expect(ids.has(id), `${scope} → ${id}`).toBe(true);
      }
    });

    it('never prints undefined or NaN into a sentence', () => {
      for (const [scope, lines] of Object.entries(scopes)) {
        for (const line of Object.values(lines).flat()) {
          expect(line, scope).not.toMatch(/undefined|NaN|\[object/);
        }
      }
    });
  });
});
