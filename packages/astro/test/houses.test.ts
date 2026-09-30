import { describe, expect, it } from 'vitest';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart, type ComputedChart } from '../src/chart.js';
import { DEFAULT_SETTINGS, type HouseSystem } from '../src/types.js';
import { wrap180 } from '../src/angles.js';
import {
  HouseSystemUndefinedError,
  equalCusps,
  houseCusps,
  houseOfCusps,
  placidusCusps,
  porphyryCusps,
  sripatiCusps,
  wholeSignCusps,
  type Angles,
} from '../src/houses.js';

/**
 * The quadrant house systems, against Swiss Ephemeris.
 *
 * Placidus and Porphyry are compared to the reference directly. Śrīpati has no
 * reference implementation — Swiss Ephemeris does not offer it — so it is
 * pinned the only honest way: its bhāva madhyas ARE the Porphyry cusps, which
 * the reference does check, and the midpoint step from madhya to sandhi is
 * exact arithmetic with properties a test can state outright.
 *
 * Everything here runs on the *tropical* cusps where it can. Cusps are pure
 * spherical geometry — sidereal time, obliquity, latitude — and comparing them
 * before the ayanāṁśa is applied means a failure here is a failure in the house
 * algorithm rather than in the zodiac.
 */

/** docs/07-accuracy.md publishes 2.0 arcseconds for non-whole-sign cusps. */
const TOLERANCE_ARCSEC = 2.0;

const arcsecondsBetween = (a: number, b: number): number => Math.abs(wrap180(a - b)) * 3600;

/** Angles as `computeAngles` would return them, rebuilt from the fixture. */
const anglesOf = (chart: (typeof golden.cases)[number]): Angles => ({
  ascendantTropical: chart.ascendantTropical,
  midheavenTropical: chart.midheavenTropical,
  ramc: chart.ramc,
  obliquity: chart.trueObliquity,
});

describe('Placidus', () => {
  for (const chart of golden.cases) {
    const expected = chart.placidusCuspsTropical;

    if (!expected) {
      it(`${chart.label}: refuses rather than substituting another system`, () => {
        /*
         * The one fixture above the Arctic Circle. Swiss Ephemeris cannot
         * compute Placidus there either — the fixture records `null` because
         * the reference itself errored — and the interesting behaviour is that
         * Jade says so instead of quietly drawing Porphyry.
         */
        expect(() => placidusCusps(anglesOf(chart), chart.location.latitude)).toThrow(
          HouseSystemUndefinedError,
        );
      });
      continue;
    }

    it(`${chart.label}: matches the reference`, () => {
      const cusps = placidusCusps(anglesOf(chart), chart.location.latitude);
      for (let house = 1; house <= 12; house += 1) {
        expect(
          arcsecondsBetween(cusps[house - 1]!, expected[house - 1]!),
          `house ${house}`,
        ).toBeLessThan(TOLERANCE_ARCSEC);
      }
    });
  }

  it('carries the error the reader needs to act on', () => {
    const arctic = golden.cases.find((chart) => chart.label === 'arctic-tromso')!;
    try {
      placidusCusps(anglesOf(arctic), arctic.location.latitude);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HouseSystemUndefinedError);
      const undefinedHere = error as HouseSystemUndefinedError;
      expect(undefinedHere.system).toBe('placidus');
      expect(undefinedHere.latitude).toBeCloseTo(arctic.location.latitude, 6);
      expect(undefinedHere.message).toContain('never sets');
    }
  });
});

describe('Porphyry', () => {
  for (const chart of golden.cases) {
    it(`${chart.label}: matches the reference`, () => {
      const cusps = porphyryCusps(chart.ascendantTropical, chart.midheavenTropical);
      for (let house = 1; house <= 12; house += 1) {
        expect(
          arcsecondsBetween(cusps[house - 1]!, chart.porphyryCuspsTropical![house - 1]!),
          `house ${house}`,
        ).toBeLessThan(TOLERANCE_ARCSEC);
      }
    });
  }
});

describe('Śrīpati', () => {
  /*
   * The defining property, stated as a test rather than as a comment: under
   * Śrīpati the ascendant degree lies INSIDE the first bhāva with house still
   * running before it, where whole sign and equal both start the house at or
   * before the lagna and never after it. Every disagreement between Śrīpati and
   * the rāśi chart traces back to this half-house shift.
   *
   * Not "at the centre": Porphyry houses either side of a madhya differ in
   * width away from the equator, so the madhya sits inside its house but not
   * generally in the middle of it.
   */
  it('starts each bhāva before its madhya and ends it after', () => {
    for (const chart of golden.cases) {
      const madhyas = porphyryCusps(chart.ascendantTropical, chart.midheavenTropical);
      const sandhis = sripatiCusps(chart.ascendantTropical, chart.midheavenTropical);

      for (let house = 1; house <= 12; house += 1) {
        expect(houseOfCusps(madhyas[house - 1]!, sandhis), `${chart.label} house ${house}`).toBe(
          house,
        );
      }
    }
  });

  /* The construction itself: a boundary is halfway between the two middles. */
  it('puts every boundary halfway between the madhyas it separates', () => {
    for (const chart of golden.cases) {
      const madhyas = porphyryCusps(chart.ascendantTropical, chart.midheavenTropical);
      const sandhis = sripatiCusps(chart.ascendantTropical, chart.midheavenTropical);

      for (let house = 1; house <= 12; house += 1) {
        const before = madhyas[(house + 10) % 12]!;
        const after = madhyas[house - 1]!;
        const half = ((((after - before) % 360) + 360) % 360) / 2;
        expect(
          arcsecondsBetween(sandhis[house - 1]!, before + half),
          `${chart.label} sandhi ${house}`,
        ).toBeLessThan(1e-6);
      }
    }
  });

  it('covers the circle exactly once', () => {
    for (const chart of golden.cases) {
      const sandhis = sripatiCusps(chart.ascendantTropical, chart.midheavenTropical);
      let total = 0;
      for (let house = 1; house <= 12; house += 1) {
        total += (((sandhis[house % 12]! - sandhis[house - 1]!) % 360) + 360) % 360;
      }
      expect(total, chart.label).toBeCloseTo(360, 6);
    }
  });

  /*
   * Where the quadrants happen to be right angles, Śrīpati has to collapse to
   * equal houses offset by 15° — every madhya 30° apart, so every sandhi is
   * too, and the ascendant sits 15° inside the first. A worked case rather than
   * a property, because this is the one place the arithmetic can be checked by
   * hand.
   */
  it('collapses to equal houses when the quadrants are right angles', () => {
    const sandhis = sripatiCusps(100, 10);
    expect(sandhis[0]).toBeCloseTo(85, 9);
    for (let house = 1; house <= 12; house += 1) {
      expect(sandhis[house - 1]!).toBeCloseTo((85 + (house - 1) * 30) % 360, 9);
    }
  });
});

describe('placing a longitude in a house', () => {
  it('agrees with whole sign, where whole sign is the answer', () => {
    const cusps = wholeSignCusps(215);
    expect(houseOfCusps(215, cusps)).toBe(1);
    expect(houseOfCusps(210, cusps)).toBe(1);
    expect(houseOfCusps(239.99, cusps)).toBe(1);
    expect(houseOfCusps(240, cusps)).toBe(2);
    expect(houseOfCusps(209.99, cusps)).toBe(12);
  });

  it('agrees with equal houses, where those are the answer', () => {
    const cusps = equalCusps(215);
    expect(houseOfCusps(215, cusps)).toBe(1);
    expect(houseOfCusps(244.99, cusps)).toBe(1);
    expect(houseOfCusps(245, cusps)).toBe(2);
    expect(houseOfCusps(214.99, cusps)).toBe(12);
  });

  /*
   * The case the whole feature exists for. In the v0 reference chart the
   * Placidus 1st house runs from 239.80° to 277.23° — more than 37° wide — so a
   * graha at 250° is in the 1st by Placidus and in the 2nd by whole sign.
   */
  it('gives a different answer from whole sign in an unequal house', () => {
    const chart = golden.cases.find((one) => one.label === 'v0-reference-chart')!;
    const placidus = chart.placidusCuspsSidereal!;
    const whole = wholeSignCusps(chart.ascendantSidereal);

    expect(houseOfCusps(250, placidus)).toBe(1);
    expect(houseOfCusps(250, whole)).toBe(2);
  });

  it('places every cusp degree in its own house', () => {
    for (const chart of golden.cases) {
      for (const cusps of [
        wholeSignCusps(chart.ascendantSidereal),
        equalCusps(chart.ascendantSidereal),
        sripatiCusps(chart.ascendantSidereal, chart.midheavenSidereal),
        ...(chart.placidusCuspsSidereal ? [chart.placidusCuspsSidereal] : []),
      ]) {
        for (let house = 1; house <= 12; house += 1) {
          expect(houseOfCusps(cusps[house - 1]!, cusps), `${chart.label} house ${house}`).toBe(
            house,
          );
        }
      }
    }
  });
});

describe('houseCusps', () => {
  it('returns the sidereal cusps the reference gives, for every system', () => {
    for (const chart of golden.cases) {
      const input = {
        angles: anglesOf(chart),
        latitude: chart.location.latitude,
        ayanamsa: chart.ayanamsaApplied,
      };

      expect(houseCusps('whole_sign', input)[0]).toBeCloseTo(chart.wholeSignCuspsSidereal[0]!, 6);

      if (chart.placidusCuspsSidereal) {
        const cusps = houseCusps('placidus', input);
        for (let house = 1; house <= 12; house += 1) {
          expect(
            arcsecondsBetween(cusps[house - 1]!, chart.placidusCuspsSidereal[house - 1]!),
            `${chart.label} house ${house}`,
          ).toBeLessThan(TOLERANCE_ARCSEC);
        }
      }
    }
  });
});

describe('a chart drawn in a quadrant system', () => {
  const provider = new AstronomyEngineProvider();
  const chartFor = (label: string, houseSystem: HouseSystem): ComputedChart => {
    const fixture = golden.cases.find((one) => one.label === label)!;
    return computeChart(
      provider,
      { jdUt: fixture.jdUt, location: fixture.location },
      { ...DEFAULT_SETTINGS, houseSystem },
    );
  };

  it('carries the cusps of the system it was asked for', () => {
    const fixture = golden.cases.find((one) => one.label === 'v0-reference-chart')!;
    const chart = chartFor('v0-reference-chart', 'placidus');

    expect(chart.houses.system).toBe('placidus');
    expect(chart.houses.requested).toBe('placidus');
    expect(chart.houses.note).toBeNull();
    for (let house = 1; house <= 12; house += 1) {
      /*
       * Looser than the 2″ the cusps themselves hold to, because this chart is
       * cast with the shipping `astronomy-engine` provider rather than read
       * from the fixture: the ascendant it produces already differs from Swiss
       * Ephemeris by up to ~1.6″, and every cusp inherits that.
       */
      expect(
        arcsecondsBetween(
          chart.houses.cusps[house - 1]!,
          fixture.placidusCuspsSidereal![house - 1]!,
        ),
        `house ${house}`,
      ).toBeLessThan(10);
    }
  });

  it('places the grahas by those cusps, not by sign', () => {
    const placidus = chartFor('v0-reference-chart', 'placidus');
    const whole = chartFor('v0-reference-chart', 'whole_sign');

    for (const [id, point] of Object.entries(placidus.points)) {
      expect(point.house, id).toBe(houseOfCusps(point.longitude, placidus.houses.cusps));
    }

    /*
     * The two systems must actually disagree somewhere, or this test would
     * pass against an implementation that ignored the setting entirely — which
     * is what the old one did.
     */
    const differs = Object.keys(placidus.points).filter(
      (id) => placidus.points[id]!.house !== whole.points[id]!.house,
    );
    expect(differs.length).toBeGreaterThan(0);
  });

  it('says so, in a sentence, when the system has no answer here', () => {
    const chart = chartFor('arctic-tromso', 'placidus');

    expect(chart.houses.requested).toBe('placidus');
    expect(chart.houses.system).toBe('whole_sign');
    expect(chart.houses.note).toContain('never sets');
    expect(chart.houses.note).toContain('whole sign');

    /* And the chart is still a chart — that is the point of not throwing. */
    expect(chart.points.Sun!.house).toBeGreaterThanOrEqual(1);
    expect(chart.houses.cusps).toHaveLength(12);
  });

  it('draws Śrīpati where Placidus cannot be drawn at all', () => {
    const chart = chartFor('arctic-tromso', 'sripati');

    expect(chart.houses.system).toBe('sripati');
    expect(chart.houses.note).toBeNull();
  });
});
