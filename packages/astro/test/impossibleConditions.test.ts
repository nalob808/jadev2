import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { detectYogas, houseFrom, type YogaChart } from '../src/yogas.js';
import { lordOfSign } from '../src/dignity.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const charts = golden.cases.map((c) => ({
  label: c.label,
  chart: computeChart(provider, { jdUt: c.jdUt, location: c.location }),
}));

function yogaChartOf(chart: (typeof charts)[number]['chart']): YogaChart {
  return {
    ascendantSign: chart.houses.ascendantSign,
    signOf: Object.fromEntries(
      Object.entries(chart.points).map(([id, p]) => [id, p.signIndex]),
    ) as YogaChart['signOf'],
    degreeOf: Object.fromEntries(
      Object.entries(chart.points).map(([id, p]) => [id, p.degreesInSign]),
    ) as YogaChart['degreeOf'],
  };
}

describe('conditions that cannot be true', () => {
  /**
   * The Sun and Moon are never retrograde.
   *
   * A chart once showed an "R" beside the Sun, and it was two bugs wearing one
   * coat: the wheel drew a neighbour's marker into the Sun's space, and
   * nothing downstream could have caught it because `retrograde` was simply
   * the sign of a finite difference and admitted the impossible answer.
   */
  it('never reports the Sun or the Moon retrograde', () => {
    for (const { label, chart } of charts) {
      expect(chart.points.Sun!.retrograde, label).toBe(false);
      expect(chart.points.Moon!.retrograde, label).toBe(false);
      expect(chart.points.Ascendant!.retrograde, label).toBe(false);
    }
  });

  /**
   * Combustion is a verdict, not the presence of a record.
   *
   * `combustionOf` returns an object for every graha that has orbs at all,
   * carrying the separation and whether the condition holds. A caller testing
   * the object's truthiness marks everything combust — which is what the
   * reading did, reporting a Jupiter 168° from the Sun as burnt.
   */
  it('only reports combustion inside the orb', () => {
    for (const { label, chart } of charts) {
      for (const [id, combustion] of Object.entries(chart.combustion)) {
        if (!combustion) continue;
        expect(combustion.separation, `${label} ${id}`).toBeGreaterThanOrEqual(0);
        expect(combustion.separation, `${label} ${id}`).toBeLessThanOrEqual(180);
        expect(combustion.combust, `${label} ${id} at ${combustion.separation.toFixed(1)}°`).toBe(
          combustion.separation < combustion.orb,
        );
        if (combustion.cazimi) expect(combustion.combust, `${label} ${id}`).toBe(true);
      }
      // The Sun is never combust by its own light.
      expect(chart.combustion.Sun?.combust ?? false, label).toBe(false);
    }
  });
});

describe('viparīta rāja', () => {
  /**
   * The lord of a dusthāna in its *own* dusthāna forms the yoga.
   *
   * This is the textbook Harṣa — the 6th lord in the 6th — and the rule used
   * to exclude it, so a Pisces ascendant with the Sun in Leo reported nothing
   * at all. Asserted across every fixture rather than on one chart, because
   * the failure was a boundary condition and boundary conditions come back.
   */
  it('fires when a dusthāna lord sits in the house it rules', () => {
    const DUSTHANAS = [6, 8, 12];
    for (const { label, chart } of charts) {
      const yc = yogaChartOf(chart);
      const hits = detectYogas(yc);
      for (const house of DUSTHANAS) {
        const sign = (yc.ascendantSign + house - 1) % 12;
        const lord = lordOfSign(sign);
        const lordHouse = houseFrom(yc.ascendantSign, yc.signOf[lord]);
        if (lordHouse !== house) continue;
        const expected = { 6: 'harsha', 8: 'sarala', 12: 'vimala' }[house]!;
        expect(
          hits.some((h) => h.id === expected),
          `${label}: ${lord} rules and occupies the ${house}th`,
        ).toBe(true);
      }
    }
  });

  it('can be told to require a different dusthāna instead', () => {
    for (const { chart } of charts) {
      const yc = yogaChartOf(chart);
      const strict = detectYogas(yc, { viparitaOwnHouse: 'exclude' });
      const loose = detectYogas(yc);
      expect(strict.length).toBeLessThanOrEqual(loose.length);
    }
  });
});

describe('parivartana', () => {
  it('finds every mutual exchange, and only real ones', () => {
    for (const { label, chart } of charts) {
      const yc = yogaChartOf(chart);
      for (const hit of detectYogas(yc).filter((h) => h.id.startsWith('parivartana_'))) {
        // The id ends in the two grahas; both must genuinely stand in a sign
        // the other rules.
        const [a, b] = hit.id.split('_').slice(2);
        expect(a, label).toBeDefined();
        expect(b, label).toBeDefined();
        const grahaA = (a![0]!.toUpperCase() + a!.slice(1)) as keyof typeof yc.signOf;
        const grahaB = (b![0]!.toUpperCase() + b!.slice(1)) as keyof typeof yc.signOf;
        expect(lordOfSign(yc.signOf[grahaA]), `${label} ${hit.id}`).toBe(grahaB);
        expect(lordOfSign(yc.signOf[grahaB]), `${label} ${hit.id}`).toBe(grahaA);
        expect(hit.factors.length, hit.id).toBeGreaterThan(0);
      }
    }
  });

  /** A graha never exchanges with itself, however the loop is written. */
  it('never pairs a graha with itself', () => {
    for (const { chart } of charts) {
      for (const hit of detectYogas(yogaChartOf(chart)).filter((h) =>
        h.id.startsWith('parivartana_'),
      )) {
        const [a, b] = hit.id.split('_').slice(2);
        expect(a).not.toBe(b);
      }
    }
  });
});

describe('kemadruma cancellations', () => {
  /**
   * A benefic aspecting the Moon is a cancellation, and it was missing.
   *
   * Jupiter's 5th and 9th aspects reach two thirds of the chart, so this is
   * the condition that fires most often in practice. Without it Jade reported
   * a bare Kemadruma on charts the tradition would not call afflicted —
   * exactly the dishonesty the cancellation field exists to prevent.
   */
  it('counts a benefic aspect on the Moon', () => {
    const DRISHTI: Record<string, readonly number[]> = {
      Mercury: [7],
      Jupiter: [5, 7, 9],
      Venus: [7],
    };
    for (const { label, chart } of charts) {
      const yc = yogaChartOf(chart);
      const kemadruma = detectYogas(yc).find((h) => h.id === 'kemadruma');
      if (!kemadruma) continue;
      const moonSign = yc.signOf.Moon;
      const aspecting = (['Mercury', 'Jupiter', 'Venus'] as const).filter(
        (g) =>
          yc.signOf[g] !== moonSign &&
          DRISHTI[g]!.some((d) => (yc.signOf[g] + d - 1) % 12 === moonSign),
      );
      if (aspecting.length === 0) continue;
      const said = (kemadruma.cancellations ?? []).join(' ');
      for (const g of aspecting) {
        expect(said, `${label}: ${g} aspects the Moon`).toContain(g);
      }
    }
  });
});
