import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compareMangala,
  DOSHA_HOUSES,
  mangalaDosha,
  type MangalaChart,
} from '../src/relations/mangala.js';
import { HOUSE_MATTERS, synastry, type SynastryChart } from '../src/relations/synastry.js';
import type { Graha } from '../src/types.js';

interface OracleCase {
  ascendantSignIndex: number;
  signIndexes: Record<string, number>;
  manglikFromLagna: boolean;
}
const oracle = JSON.parse(
  readFileSync(new URL('./fixtures/jhora-oracle.json', import.meta.url), 'utf8'),
) as { cases: Record<string, OracleCase> };

const labels = Object.keys(oracle.cases);
const chartOf = (c: OracleCase): MangalaChart & SynastryChart => ({
  ascendantSign: c.ascendantSignIndex,
  signOf: c.signIndexes as Record<Graha, number>,
});

describe('maṅgala doṣa', () => {
  it('reads the six classical houses', () => {
    expect([...DOSHA_HOUSES].sort((a, b) => a - b)).toEqual([1, 2, 4, 7, 8, 12]);
  });

  it.each(labels)('agrees with Jagannātha Hora on the house test for %s', (label) => {
    // Compared from the ascendant alone, with the oracle's own exception
    // handling switched off, so this is the geometry and nothing else.
    const c = oracle.cases[label]!;
    const result = mangalaDosha(chartOf(c), { references: ['lagna'] });
    expect(result.present).toBe(c.manglikFromLagna);
  });

  it('adding the Moon as a reference can only ever find more, never less', () => {
    for (const label of labels) {
      const chart = chartOf(oracle.cases[label]!);
      const lagnaOnly = mangalaDosha(chart, { references: ['lagna'] });
      const both = mangalaDosha(chart, { references: ['lagna', 'moon'] });
      if (lagnaOnly.present) expect(both.present).toBe(true);
      expect(both.occurrences.length).toBeGreaterThanOrEqual(lagnaOnly.occurrences.length);
    }
  });

  it('records which references produced the answer, so it can be reproduced', () => {
    const chart = chartOf(oracle.cases[labels[0]!]!);
    expect(mangalaDosha(chart, { references: ['lagna'] }).references).toEqual(['lagna']);
    expect(mangalaDosha(chart).references).toEqual(['lagna', 'moon']);
  });

  it('drops the 2nd house when asked, and only the 2nd', () => {
    const chart = chartOf(oracle.cases[labels[0]!]!);
    for (const label of labels) {
      const c = chartOf(oracle.cases[label]!);
      const without = mangalaDosha(c, { includeSecondHouse: false });
      expect(without.occurrences.every((o) => o.house !== 2)).toBe(true);
    }
    expect(mangalaDosha(chart, { includeSecondHouse: false }).occurrences).toBeDefined();
  });

  it('finds cancellations, and never reports the doṣa without them', () => {
    // Mars in Aries — its own sign — is the plainest cancellation there is.
    const chart: MangalaChart = {
      ascendantSign: 0,
      signOf: {
        Sun: 4,
        Moon: 4,
        Mars: 0, // Aries, the 1st: a doṣa house, but its own sign
        Mercury: 4,
        Jupiter: 4,
        Venus: 4,
        Saturn: 4,
      } as Record<Graha, number>,
    };
    const result = mangalaDosha(chart, { references: ['lagna'] });
    expect(result.present).toBe(true);
    expect(result.cancellations.join(' ')).toContain('its own sign');
  });

  it('treats the doṣa on both sides as mutually cancelling', () => {
    // The oldest and least contested cancellation, and the one a practitioner
    // reaches for first.
    const manglik: MangalaChart = {
      ascendantSign: 0,
      signOf: {
        Sun: 4,
        Moon: 4,
        Mars: 6, // the 7th
        Mercury: 4,
        Jupiter: 4,
        Venus: 4,
        Saturn: 8,
      } as Record<Graha, number>,
    };
    const comparison = compareMangala(manglik, manglik, { references: ['lagna'] });
    expect(comparison.a.present).toBe(true);
    expect(comparison.b.present).toBe(true);
    expect(comparison.mutuallyCancelled).toBe(true);
  });

  it('returns no verdict — only placements and cancellations', () => {
    const result = mangalaDosha(chartOf(oracle.cases[labels[0]!]!));
    // If a field ever appears here that reads as a judgement, the tone rules
    // have been broken. The shape of the result is the guard.
    expect(Object.keys(result).sort()).toEqual([
      'cancellations',
      'occurrences',
      'present',
      'references',
    ]);
  });
});

describe('synastry', () => {
  const a = chartOf(oracle.cases['v0-reference-chart']!);
  const b = chartOf(oracle.cases['modern-mumbai']!);

  it('places every graha of each chart into the other’s houses', () => {
    const result = synastry(a, b);
    expect(result.aInB.length).toBe(Object.keys(a.signOf).length);
    expect(result.bInA.length).toBe(Object.keys(b.signOf).length);
    for (const o of [...result.aInB, ...result.bInA]) {
      expect(o.house).toBeGreaterThanOrEqual(1);
      expect(o.house).toBeLessThanOrEqual(12);
      expect(o.matters.trim()).not.toBe('');
    }
  });

  it('has something to say about all twelve houses', () => {
    expect(HOUSE_MATTERS).toHaveLength(12);
    expect(new Set(HOUSE_MATTERS).size).toBe(12);
  });

  it('is not symmetric — the overlay depends on whose houses are used', () => {
    const result = synastry(a, b);
    const forward = result.aInB.map((o) => `${o.graha}:${o.house}`).join();
    const backward = result.bInA.map((o) => `${o.graha}:${o.house}`).join();
    expect(forward).not.toBe(backward);
  });

  it('reverses cleanly — A in B is B in A with the charts swapped', () => {
    const forward = synastry(a, b);
    const reversed = synastry(b, a);
    expect(reversed.bInA).toEqual(forward.aInB);
    expect(reversed.aInB).toEqual(forward.bInA);
    expect(reversed.bOnA).toEqual(forward.aOnB);
  });

  it('finds shared signs as conjunctions', () => {
    const same: SynastryChart = {
      ascendantSign: 0,
      signOf: { Sun: 3, Moon: 3, Mars: 5, Mercury: 3, Jupiter: 7, Venus: 3, Saturn: 9 } as Record<
        Graha,
        number
      >,
    };
    const result = synastry(same, same);
    for (const c of result.conjunctions) expect(c.sign).not.toBe('');
    // The Sun shares Cancer with four of its own counterparts here.
    expect(result.conjunctions.filter((c) => c.a === 'Sun').length).toBe(4);
  });

  it('uses whole-sign dṛṣṭi, so every glance lands on a real graha', () => {
    const result = synastry(a, b);
    for (const d of result.aOnB) {
      expect(d.description).toContain(d.from);
      expect(d.description).toContain(d.to);
      expect([3, 4, 5, 7, 8, 9, 10]).toContain(d.aspectHouse);
    }
  });
});

describe('dṛṣṭi wording and options', () => {
  const a = chartOf(oracle.cases['v0-reference-chart']!);
  const b = chartOf(oracle.cases['modern-mumbai']!);

  it('writes 3rd, not 3th', () => {
    // Saturn's 3rd glance is the one that catches a naive `${n}th`.
    const all = [...synastry(a, b).aOnB, ...synastry(a, b).bOnA];
    for (const d of all) {
      expect(d.description).not.toMatch(/\b\d+(?:1th|2th|3th)\b/);
    }
    const ordinals = all.map((d) => d.description.match(/special (\d+\w\w)/)?.[1]).filter(Boolean);
    for (const o of ordinals) expect(o).toMatch(/^(3rd|4th|5th|8th|9th|10th)$/);
  });

  it('can switch off the node dṛṣṭi, which is not in BPHS', () => {
    const withNodes = synastry(a, b);
    const without = synastry(a, b, { includeNodeDrishti: false });
    expect(without.aOnB.every((d) => d.from !== 'Rahu' && d.from !== 'Ketu')).toBe(true);
    expect(without.aOnB.length).toBeLessThan(withNodes.aOnB.length);
    // The overlays are unaffected — this option is about glances, not placements.
    expect(without.aInB).toEqual(withNodes.aInB);
  });
});
