import { describe, expect, it } from 'vitest';
import oracle from './fixtures/ayanamsa-modes.json' with { type: 'json' };
import { FITTED_AYANAMSAS, ayanamsa } from '../src/sidereal/ayanamsa.js';
import { PLANNED_AYANAMSAS } from '../src/capabilities.js';
import { AYANAMSA_LABELS } from '../src/sidereal/ayanamsa.js';
import { jdTtFromJdUt } from '../src/time.js';

/**
 * Every ayanāṁśa Jade offers, checked against the one that defined it.
 *
 * Jade fits a cubic to each mode rather than calling Swiss Ephemeris, because
 * the shipped provider is MIT-licensed and the fit is four coefficients. That
 * is only defensible while the fit is *verified*, which is what this file is
 * for — and it is why a mode that cannot be fitted to arcsecond accuracy is
 * left throwing instead of shipped approximately.
 *
 * The budget is the published ayanāṁśa tolerance, 0.05″. The fits measure
 * about 0.0002″, so there is two hundred times headroom and a regression trips
 * long before it reaches a chart.
 */
const ARCSEC = 1 / 3600;
const BUDGET_ARCSEC = 0.05;

describe('every fitted mode agrees with Swiss Ephemeris', () => {
  for (const testCase of oracle.cases) {
    const mode = testCase.mode as (typeof FITTED_AYANAMSAS)[number];
    /* A mode in the oracle that Jade has not fitted is not a failure here —
       it is the point of the next test. */
    if (!FITTED_AYANAMSAS.includes(mode)) continue;

    it(`${testCase.mode} across ${oracle.jdUt.length} epochs, 1700–2200`, () => {
      let worst = 0;
      (oracle.jdUt as number[]).forEach((jdUt, index) => {
        const ours = ayanamsa(jdTtFromJdUt(jdUt), { mode, includeNutation: true });
        const theirs = testCase.values[index]!;
        const delta = Math.abs(ours - theirs) / ARCSEC;
        worst = Math.max(worst, delta);
      });
      expect(worst, `${testCase.mode} worst ${worst.toFixed(5)}″`).toBeLessThan(BUDGET_ARCSEC);
    });
  }
});

describe('the modes that are not fitted', () => {
  /*
   * True Citrā is the one in the oracle that Jade refuses. It pins Spica to
   * 180° and so follows that star's proper motion, which no cubic in time
   * represents — the fit measures 20.7″, four times the ascendant's whole
   * budget. Shipping it would be a visibly wrong chart, so it throws.
   */
  it('throw rather than substituting a zodiac nobody asked for', () => {
    for (const mode of PLANNED_AYANAMSAS) {
      expect(() => ayanamsa(2451545, { mode: mode.id, includeNutation: true }), mode.id).toThrow(
        /not yet fitted/i,
      );
    }
  });

  it('are declared, so a practitioner can see Jade knows the name', () => {
    const planned = PLANNED_AYANAMSAS.map((one) => one.id);
    expect(planned).toContain('lahiri_true_chitra');
    for (const mode of planned) {
      expect(FITTED_AYANAMSAS, mode).not.toContain(mode);
    }
  });

  /* Fitted and planned together account for every declared mode, with no
     third state where a mode is neither offered nor explained. */
  it('together with the fitted ones cover every declared mode', () => {
    const declared = new Set(Object.keys(AYANAMSA_LABELS));
    /* `custom` is on the fitted side: it is selectable, and it is a slot for
       a user-supplied value rather than a named zodiac — which is why the
       public count says six and this set holds seven. */
    const covered = new Set<string>([
      ...FITTED_AYANAMSAS,
      ...PLANNED_AYANAMSAS.map((one) => one.id),
    ]);
    expect([...declared].filter((one) => !covered.has(one))).toEqual([]);
  });
});

describe('the fits themselves', () => {
  it('differ from each other by the amounts the traditions differ by', () => {
    const at = (mode: (typeof FITTED_AYANAMSAS)[number]) =>
      ayanamsa(jdTtFromJdUt(2451545), { mode, includeNutation: false });

    /* Raman sits about 1.45° behind Lahiri and Fagan–Bradley about 0.88°
       ahead. A fit that silently fell back to Lahiri would make these zero,
       which is the failure mode the throwing branch exists to prevent. */
    expect(at('lahiri') - at('raman')).toBeCloseTo(1.446, 2);
    expect(at('fagan_bradley') - at('lahiri')).toBeCloseTo(0.883, 2);
    expect(at('krishnamurti') - at('lahiri')).toBeCloseTo(-0.097, 2);
  });

  it('move at nearly the same precession rate, as they must', () => {
    const rateOf = (mode: (typeof FITTED_AYANAMSAS)[number]) => {
      const a = ayanamsa(jdTtFromJdUt(2451545), { mode, includeNutation: false });
      const b = ayanamsa(jdTtFromJdUt(2451545 + 36525), { mode, includeNutation: false });
      return b - a;
    };
    const rates = FITTED_AYANAMSAS.filter((one) => one !== 'custom').map(rateOf);
    /* All within a hundredth of a degree per century of each other: they
       disagree about the origin, not about precession. */
    expect(Math.max(...rates) - Math.min(...rates)).toBeLessThan(0.01);
  });
});
