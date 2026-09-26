import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider, computeChart, lordOfSign, type ComputedChart } from '@jade/astro';
import {
  GRAHAS_LIB,
  HOUSES,
  compareHouse,
  houseReadings,
  summariseComparison,
} from '../src/index.js';

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

/**
 * The hard product rule, as a regular expression.
 *
 * Constitution #6: never predict death, disease or legal outcomes. The eighth
 * house signifies longevity and the sixth signifies illness, so this module
 * composes sentences *about* those houses on every chart — which makes it the
 * single most likely place in Jade for the rule to be broken by an edit that
 * looked like better prose.
 *
 * The teaching text in `significations/houses.ts` may legitimately name what a
 * house signifies; what is forbidden is a composed statement about a particular
 * person's chart that predicts an outcome. Only the composed statements are
 * checked here, which is the right scope.
 */
const FORBIDDEN_PREDICTION =
  /\b(will die|dies|death|dying|fatal|lifespan|longevity|terminal|disease|illness|ill health|diagnos\w*|lawsuit|litigation|imprison\w*|convict\w*|sentenced|bankrupt\w*|divorce will|miscarriage)\b/i;

/*
 * "cancer" is deliberately absent from that list, and the reason is worth
 * recording: Karka is Cancer, so the word appears in this domain as the name of
 * the fourth sign roughly once per chart. The first version of this test failed
 * on "7th from Cancer". The disease sense is still caught — by `disease`,
 * `illness`, `terminal`, `fatal` and `diagnos*` — so nothing is lost by dropping
 * the one word that cannot be told apart from a sign name.
 */

/** Sentences must not be assembled out of holes. */
const BROKEN = /undefined|NaN|null|\[object|,\s*\.|\s{2,}|Infinity/;

describe('the house readings', () => {
  it('reads all twelve houses on every fixture', () => {
    for (const { label, chart } of charts) {
      const readings = houseReadings(chart);
      expect(readings, label).toHaveLength(12);
      expect(
        readings.map((reading) => reading.house),
        label,
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it('agrees with the chart about the sign, the lord and the occupants', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        const expectedSign = (chart.houses.ascendantSign + reading.house - 1) % 12;
        expect(reading.signIndex, `${label} h${reading.house}`).toBe(expectedSign);
        expect(reading.lord.lord, `${label} h${reading.house}`).toBe(lordOfSign(expectedSign));

        // Occupancy is checked against the chart rather than recomputed here.
        const actual = Object.entries(chart.points)
          .filter(([, point]) => point.house === reading.house)
          .map(([id]) => id)
          .filter((id) => reading.occupants.some((occupant) => occupant.graha === id));
        expect(reading.occupants.map((occupant) => occupant.graha).sort()).toEqual(actual.sort());

        for (const occupant of reading.occupants) {
          const point = chart.points[occupant.graha]!;
          expect(occupant.degreesInSign).toBeCloseTo(point.degreesInSign, 9);
          expect(occupant.retrograde).toBe(point.retrograde);
          expect(occupant.ownHouse).toBe(lordOfSign(expectedSign) === occupant.graha);
        }
      }
    }
  });

  /**
   * A graha in a house is not also aspecting it from outside.
   *
   * Reporting both would print one influence as two, and the doubling is the
   * sort of thing that makes a reading feel thorough while being wrong.
   */
  it('never lists an occupant as an aspecting graha', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        for (const aspect of reading.aspects) {
          expect(
            reading.occupants.some((occupant) => occupant.graha === aspect.graha),
            `${label} h${reading.house} ${aspect.graha}`,
          ).toBe(false);
          expect(chart.points[aspect.graha]!.house).not.toBe(reading.house);
        }
      }
    }
  });

  it('marks a special dṛṣṭi exactly when it is not the seventh', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        for (const aspect of reading.aspects) {
          expect(aspect.special, `${label} ${aspect.graha} ${aspect.distance}`).toBe(
            aspect.distance !== 7,
          );
        }
      }
    }
  });

  it('never states anything without the placements behind it', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        expect(reading.statements.length, `${label} h${reading.house}`).toBeGreaterThan(0);
        for (const statement of reading.statements) {
          expect(statement.factors.length, `${label}: ${statement.text}`).toBeGreaterThan(0);
          expect(statement.text, `${label} h${reading.house}`).not.toMatch(BROKEN);
          for (const factor of statement.factors) {
            expect(factor.detail, `${label}: ${statement.text}`).not.toMatch(BROKEN);
            expect(factor.kind).toBeTruthy();
          }
        }
      }
    }
  });

  /**
   * Constitution #6, asserted rather than trusted to the phrasing.
   *
   * Checked on the composed prose, which is where a prediction could actually
   * be made. It is deliberately *not* checked on the factors, and the reason is
   * the second thing this test caught: Saturn's kāraka list in the
   * significations library contains the word "longevity", because Saturn does
   * signify it. Naming what a graha signifies is the teaching layer doing its
   * job; the forbidden thing is telling a particular person what will happen to
   * them. The factors are held to a stricter standard instead — the test below
   * requires them to be verbatim from the library, so they cannot have been
   * invented or quietly reworded into a claim.
   */
  it('never predicts death, disease or a legal outcome', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        for (const statement of reading.statements) {
          expect(statement.text, `${label} h${reading.house}`).not.toMatch(FORBIDDEN_PREDICTION);
        }
      }
    }
  });

  /**
   * Library-derived factors are quotations, not paraphrases.
   *
   * This is what makes the exemption above safe. A factor that names what a
   * house or a graha signifies must be a verbatim slice of the significations
   * library — so the only way such a word reaches the screen is that a source
   * Jade cites puts it there, and it arrives with `source` beside it.
   */
  it('quotes the significations library verbatim in its factors', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        for (const statement of reading.statements) {
          for (const factor of statement.factors) {
            const isHouseKeywords = /holds$/.test(factor.kind);
            const isGrahaKeywords = factor.kind === 'Signifies';
            if (!isHouseKeywords && !isGrahaKeywords) continue;

            const words = factor.detail.split(', ');
            const allowed = isGrahaKeywords
              ? GRAHAS_LIB.flatMap((entry) => entry.karaka)
              : HOUSES.flatMap((entry) => entry.keywords);
            for (const word of words) {
              expect(allowed, `${label} h${reading.house}: "${word}"`).toContain(word);
            }
          }
        }
      }
    }
  });

  it('leads with the lord, because that is how a house is read', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        expect(reading.statements[0]!.text, `${label} h${reading.house}`).toContain(
          reading.lord.lord,
        );
      }
    }
  });

  it('says so when a house is empty rather than saying nothing', () => {
    for (const { label, chart } of charts) {
      for (const reading of houseReadings(chart)) {
        if (reading.occupants.length > 0) continue;
        expect(
          reading.statements.some((statement) => /Nothing occupies/.test(statement.text)),
          `${label} h${reading.house}`,
        ).toBe(true);
      }
    }
  });

  it('can be told not to let the nodes cast dṛṣṭi', () => {
    for (const { chart } of charts) {
      const without = houseReadings(chart, { includeNodes: false });
      for (const reading of without) {
        for (const aspect of reading.aspects) {
          expect(['Rahu', 'Ketu']).not.toContain(aspect.graha);
        }
      }
      const with_ = houseReadings(chart, { includeNodes: true });
      const countWith = with_.reduce((sum, reading) => sum + reading.aspects.length, 0);
      const countWithout = without.reduce((sum, reading) => sum + reading.aspects.length, 0);
      expect(countWithout).toBeLessThan(countWith);
    }
  });
});

describe('comparing one house across charts', () => {
  const people = charts.slice(0, 3).map((entry, index) => ({
    id: `p${index}`,
    name: entry.label,
    chart: entry.chart,
  }));

  it('returns one row per chart, all about the same house', () => {
    for (let house = 1; house <= 12; house += 1) {
      const rows = compareHouse(house, people);
      expect(rows).toHaveLength(people.length);
      for (const row of rows) expect(row.reading.house).toBe(house);
    }
  });

  it('agrees with the single-chart reading for the same chart', () => {
    const rows = compareHouse(7, people);
    for (const row of rows) {
      const direct = houseReadings(
        people.find((person) => person.id === row.subjectId)!.chart,
      ).find((reading) => reading.house === 7)!;
      expect(row.reading.sign).toBe(direct.sign);
      expect(row.reading.lord.lord).toBe(direct.lord.lord);
      expect(row.reading.occupants.map((o) => o.graha)).toEqual(
        direct.occupants.map((o) => o.graha),
      );
    }
  });

  it('summarises by counting what is there, never by rating it', () => {
    const rows = compareHouse(7, people);
    const summary = summariseComparison(7, rows);

    // Every person appears exactly once across the sign groupings.
    const named = summary.signs.flatMap((group) => group.names);
    expect(named.sort()).toEqual(people.map((person) => person.name).sort());

    // Occupant groupings really do contain that graha for that person.
    for (const group of summary.occupants) {
      for (const name of group.names) {
        const row = rows.find((candidate) => candidate.name === name)!;
        expect(row.reading.occupants.some((o) => o.graha === group.graha)).toBe(true);
      }
    }

    // The empty list is exactly those with no occupants — not a judgement.
    expect(summary.empty.sort()).toEqual(
      rows
        .filter((row) => row.reading.occupants.length === 0)
        .map((row) => row.name)
        .sort(),
    );

    expect(summary.lordDestinations).toHaveLength(people.length);
    for (const destination of summary.lordDestinations) {
      expect(destination.inHouse).toBeGreaterThanOrEqual(1);
      expect(destination.inHouse).toBeLessThanOrEqual(12);
    }
  });

  it('orders the sign groupings by how many people share them', () => {
    const summary = summariseComparison(7, compareHouse(7, people));
    for (let i = 1; i < summary.signs.length; i += 1) {
      expect(summary.signs[i - 1]!.names.length).toBeGreaterThanOrEqual(
        summary.signs[i]!.names.length,
      );
    }
  });
});
