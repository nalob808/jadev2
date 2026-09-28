import { describe, expect, it } from 'vitest';
import {
  AYANAMSA_LABELS,
  FITTED_AYANAMSAS,
  PLANNED_AYANAMSAS,
  ayanamsa,
  isFittedAyanamsa,
  type AyanamsaMode,
} from '../src/index.js';

/**
 * `FITTED_AYANAMSAS` has to mean what it says.
 *
 * The bug this closes: the settings form offered all eight zodiacs, the column
 * stored whichever was chosen, and `ayanamsa()` threw for six of them — so the
 * failure landed later, on every page that casts a chart, for a workspace whose
 * settings had saved successfully.
 *
 * The guard is only worth having if the list cannot drift from the maths, so
 * this test does not assert a hand-written set of names. It asks each declared
 * mode whether it computes, and requires the list to agree. Fitting Raman makes
 * this test pass with no edit; claiming Raman is fitted without coefficients
 * fails it immediately.
 */

const J2000 = 2451545;
const MODES = Object.keys(AYANAMSA_LABELS) as AyanamsaMode[];

/** Does the core actually produce a number for this mode? */
function computes(mode: AyanamsaMode): boolean {
  try {
    const value = ayanamsa(J2000, { mode, customAtJ2000: mode === 'custom' ? 23.85 : undefined });
    return Number.isFinite(value);
  } catch {
    return false;
  }
}

describe('which ayanāṁśas the core can compute', () => {
  it('lists exactly the modes that compute, and no others', () => {
    const computable = MODES.filter(computes).sort();
    expect([...FITTED_AYANAMSAS].sort()).toEqual(computable);
  });

  it('agrees with its own guard for every declared mode', () => {
    for (const mode of MODES) {
      expect(isFittedAyanamsa(mode), mode).toBe(computes(mode));
    }
  });

  it('accounts for every declared mode exactly once', () => {
    const planned = PLANNED_AYANAMSAS.map((entry) => entry.id);
    expect([...FITTED_AYANAMSAS, ...planned].sort()).toEqual([...MODES].sort());
    expect(new Set(planned).size).toBe(planned.length);
  });

  it('refuses a mode that is not fitted rather than substituting one that is', () => {
    for (const entry of PLANNED_AYANAMSAS) {
      expect(() => ayanamsa(J2000, { mode: entry.id }), entry.id).toThrow(/not yet fitted/);
      expect(entry.note.length).toBeGreaterThan(12);
      expect(entry.label).toBe(AYANAMSA_LABELS[entry.id]);
    }
  });

  it('rejects anything that is not a declared mode', () => {
    for (const value of ['', 'lahiri ', 'LAHIRI', 'sidereal', 'tropical']) {
      expect(isFittedAyanamsa(value), value).toBe(false);
    }
  });

  /*
   * `custom` borrows Lahiri's precession rate, so it cannot be offerable while
   * Lahiri is not. It still needs its offset: a blank field falling back to
   * Lahiri would be the silent default CLAUDE.md #3 forbids, in the one place
   * the user explicitly asked for something else.
   */
  it('keeps custom tied to Lahiri, and still demands its offset', () => {
    expect(isFittedAyanamsa('custom')).toBe(isFittedAyanamsa('lahiri'));
    expect(() => ayanamsa(J2000, { mode: 'custom' })).toThrow(/requires customAtJ2000/);
  });
});
