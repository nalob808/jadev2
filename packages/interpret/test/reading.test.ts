import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import {
  FORBIDDEN_TOPICS,
  GRAHAS_LIB,
  HOUSES,
  SIGNS_LIB,
  grahaSignification,
  houseSignification,
  housesForChart,
  readingFor,
  signSignification,
} from '../src/index.js';

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
const sections = readingFor(chart, {
  dasha: dasha.periods,
  nowJd: reference.jdUt + 365.25 * 24,
});
const every = sections.flatMap((section) => section.statements);

describe('the libraries are complete', () => {
  it('has all twelve houses, numbered 1 to 12', () => {
    expect(HOUSES).toHaveLength(12);
    expect(HOUSES.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('has all twelve signs and all nine grahas', () => {
    expect(SIGNS_LIB).toHaveLength(12);
    expect(GRAHAS_LIB).toHaveLength(9);
    expect(GRAHAS_LIB.map((g) => g.id)).toContain('Rahu');
    expect(GRAHAS_LIB.map((g) => g.id)).toContain('Ketu');
  });

  // Teaching text that cites nothing is an opinion. Every entry names a source.
  it('every entry cites a classical source and has real body text', () => {
    for (const entry of [...HOUSES, ...SIGNS_LIB, ...GRAHAS_LIB]) {
      expect(entry.source, JSON.stringify(entry).slice(0, 60)).toMatch(
        /BPHS|Phaladīpikā|Sārāvalī|Jātaka/,
      );
      expect(entry.body.length).toBeGreaterThan(0);
      for (const paragraph of entry.body) {
        expect(paragraph.length).toBeGreaterThan(80);
      }
    }
  });

  it('classifies the houses correctly', () => {
    expect(houseSignification(1)!.classes).toContain('trikona');
    expect(houseSignification(9)!.classes).toContain('trikona');
    expect(houseSignification(6)!.classes).toContain('dusthana');
    expect(houseSignification(6)!.classes).toContain('upachaya');
    expect(houseSignification(11)!.classes).toContain('upachaya');
    expect(houseSignification(4)!.group).toBe('kendra');
    expect(houseSignification(3)!.group).toBe('apoklima');
  });

  it('looks up by name and index', () => {
    expect(signSignification(7)!.name).toBe('Scorpio');
    expect(grahaSignification('Saturn')!.sanskrit).toContain('Śani');
    expect(grahaSignification('Nibiru')).toBeUndefined();
  });
});

describe('a composed reading', () => {
  it('produces sections in reading order', () => {
    const ids = sections.map((s) => s.id);
    expect(ids[0]).toBe('ascendant');
    expect(ids).toContain('moon');
    expect(ids).toContain('placements');
  });

  // This is the constitution's rule #5, as a test.
  it('never returns a statement without the factors that produced it', () => {
    expect(every.length).toBeGreaterThan(8);
    for (const statement of every) {
      expect(statement.factors.length, statement.text).toBeGreaterThan(0);
      for (const factor of statement.factors) {
        expect(factor.kind.trim()).not.toBe('');
        expect(factor.detail.trim()).not.toBe('');
      }
    }
  });

  it('never emits placeholder text', () => {
    for (const statement of every) {
      expect(statement.text).not.toContain('undefined');
      expect(statement.text).not.toContain('NaN');
      expect(statement.text).not.toMatch(/\[object/);
      expect(statement.text.trim().length).toBeGreaterThan(40);
    }
  });

  // Constitution item 6, and the reason the filter lives in the composer
  // rather than in the UI: a caller cannot route around it.
  it('never predicts death, disease, or legal outcomes', () => {
    for (const statement of every) {
      const text = statement.text.toLowerCase();
      for (const word of FORBIDDEN_TOPICS) {
        expect(text, `a reading said "${word}"`).not.toContain(word);
      }
    }
  });

  it('is specific to this chart, not generic', () => {
    // A degree reading only this chart has, and the actual rising sign.
    const text = every.map((s) => s.text).join(' ');
    expect(text).toContain(chart.points.Moon!.sign);
    expect(text).toContain(chart.points.Moon!.nakshatra.name);

    const factors = every.flatMap((s) => s.factors.map((f) => f.detail)).join(' ');
    expect(factors).toMatch(/\d+°\d{2}′/);
  });

  it('degrees never render as 60 minutes', () => {
    const factors = every.flatMap((s) => s.factors.map((f) => f.detail));
    for (const detail of factors) {
      expect(detail).not.toContain('°60′');
    }
  });

  it('offers an anchor so a note can be written against a statement', () => {
    const anchored = every.filter((s) => s.anchor);
    expect(anchored.length).toBeGreaterThan(5);
    for (const statement of anchored) {
      expect(statement.anchor!.key.length).toBeGreaterThan(0);
      expect(statement.anchor!.label.length).toBeGreaterThan(0);
    }
  });

  // Without a daśā, the timing section must be absent rather than guessed.
  it('omits the timing section when no daśā is supplied', () => {
    const withoutTime = readingFor(chart);
    expect(withoutTime.map((s) => s.id)).not.toContain('dasha');
    expect(withoutTime.length).toBeGreaterThan(0);
  });

  it('includes the running period when one is supplied', () => {
    const timing = sections.find((s) => s.id === 'dasha');
    expect(timing).toBeDefined();
    expect(timing!.statements.length).toBeGreaterThan(0);
    expect(timing!.statements[0]!.factors.some((f) => f.kind === 'Period')).toBe(true);
  });

  it('reads a chart with no yogas without breaking', () => {
    const bare = { ...chart, yogas: [] };
    const out = readingFor(bare);
    expect(out.map((s) => s.id)).not.toContain('yogas');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('housesForChart', () => {
  it('seats all twelve houses on this chart’s ascendant', () => {
    const rows = housesForChart(chart);
    expect(rows).toHaveLength(12);
    // House 1 is the rising sign, by definition of whole-sign houses.
    expect(rows[0]!.sign).toBe(chart.points.Ascendant!.sign);
    for (const row of rows) {
      expect(row.lord.length).toBeGreaterThan(0);
      expect(row.house.keywords.length).toBeGreaterThan(0);
    }
  });

  it('puts every graha in exactly one house', () => {
    const rows = housesForChart(chart);
    const placed = rows.flatMap((r) => r.occupants);
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed).toContain('Moon');
  });
});
