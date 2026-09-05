import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import { GLOSSARY, glossaryContextFor } from '../src/index.js';

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

const { lines } = glossaryContextFor({ chart, dasha, nowJd, subject: 'Reference' });

describe('the live half of the glossary', () => {
  /**
   * The failure this exists to catch.
   *
   * The first version of this file read `chart.points['moon']` in lower case.
   * Chart point ids are capitalised, so every lookup returned undefined, every
   * line that depended on a position was silently skipped, and the tooltips
   * fell back to plain definitions — which is exactly what they look like when
   * working correctly, minus the one part that makes them worth building. It
   * took a browser test to notice. A count is what notices now.
   */
  it('produces context for a substantial share of the vocabulary', () => {
    const covered = Object.keys(lines).length;
    expect(covered).toBeGreaterThan(GLOSSARY.length / 2);
  });

  it('never emits an empty line list for a term it claims to cover', () => {
    for (const [id, entries] of Object.entries(lines)) {
      expect(entries.length, id).toBeGreaterThan(0);
      for (const line of entries) expect(line.trim().length, id).toBeGreaterThan(0);
    }
  });

  it('never prints undefined or NaN into a sentence', () => {
    for (const [id, entries] of Object.entries(lines)) {
      for (const line of entries) {
        expect(line, id).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });

  it('only describes terms that exist', () => {
    const ids = new Set(GLOSSARY.map((entry) => entry.id));
    for (const id of Object.keys(lines)) expect(ids.has(id), id).toBe(true);
  });

  it('names this chart’s Moon nakṣatra, its pāda, and its lord', () => {
    expect(lines['nakshatra']?.join(' ')).toMatch(
      new RegExp(`${chart.points.Moon!.nakshatra.name}.*pāda ${chart.points.Moon!.nakshatra.pada}`),
    );
    expect(lines['nakshatra']?.join(' ')).toContain(
      chart.points.Moon!.nakshatra.lord.charAt(0).toUpperCase() +
        chart.points.Moon!.nakshatra.lord.slice(1),
    );
  });

  it('names this chart’s lagna sign and the ayanāṁśa it was cast with', () => {
    expect(lines['lagna']?.join(' ')).toContain(chart.points.Ascendant!.sign);
    expect(lines['ayanamsa']?.join(' ')).toContain(chart.meta.ayanamsaMode);
  });

  it('reports the running daśā rather than only the scheme', () => {
    expect(lines['dasha']?.join(' ')).toMatch(/Running now: \w+/);
  });

  /**
   * The subject's name is used so a practitioner reading a client's chart is
   * not told about "your" Moon. Getting this wrong is not a crash, it is a
   * quiet impersonation of the client to the astrologer.
   */
  it('speaks about the named subject rather than the reader', () => {
    const all = Object.values(lines).flat().join(' ');
    expect(all).toContain('Reference’s');
    expect(all).not.toMatch(/\byour\b/);
  });

  it('falls back to “your” when no subject is named', () => {
    const anonymous = glossaryContextFor({ chart, dasha, nowJd });
    expect(Object.values(anonymous.lines).flat().join(' ')).toMatch(/\byour\b/);
  });

  /** A chart alone, with no daśā and no clock, must still say what it can. */
  it('works from a chart alone', () => {
    const bare = glossaryContextFor({ chart });
    expect(Object.keys(bare.lines).length).toBeGreaterThan(10);
    expect(bare.lines['dasha']).toBeUndefined();
    expect(bare.lines['nakshatra']).toBeDefined();
  });
});
