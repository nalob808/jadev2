import { describe, expect, it } from 'vitest';
import { AYANAMSA_LABELS, isFittedAyanamsa, type AyanamsaMode } from '@jade/astro';
import { AYANAMSA_OPTIONS, UNFITTED_AYANAMSAS } from './ayanamsaOptions';

/**
 * The form and the core have to agree about which zodiacs exist and which of
 * them work.
 *
 * Before this, the form listed all eight from a hand-kept array and the core
 * could compute one. Picking any of the other six saved successfully and then
 * threw on every page that casts a chart. The list is derived now, so this test
 * is about the derivation holding.
 */
describe('the ayanāṁśa options', () => {
  it('offers every zodiac the core declares, exactly once', () => {
    const declared = Object.keys(AYANAMSA_LABELS).sort();
    expect(AYANAMSA_OPTIONS.map((option) => option.id).sort()).toEqual(declared);
  });

  it('marks selectable exactly the ones the core can compute', () => {
    for (const option of AYANAMSA_OPTIONS) {
      expect(option.fitted, option.id).toBe(isFittedAyanamsa(option.id));
    }
    expect(AYANAMSA_OPTIONS.find((option) => option.id === 'lahiri')?.fitted).toBe(true);
  });

  it('explains every one, including the ones that cannot be chosen', () => {
    for (const option of AYANAMSA_OPTIONS) {
      expect(option.note.length, option.id).toBeGreaterThan(10);
      expect(option.name.length, option.id).toBeGreaterThan(2);
    }
  });

  it('leaves at least one choosable, so the form is never a dead end', () => {
    expect(AYANAMSA_OPTIONS.some((option) => option.fitted)).toBe(true);
    expect(UNFITTED_AYANAMSAS.every((option) => !option.fitted)).toBe(true);
  });

  /*
   * A guard against the tempting "fix": dropping the unfitted modes from the
   * list. That would make the form honest and the product silent — a KP
   * astrologer would conclude Jade has never heard of Krishnamurti.
   */
  it('keeps the unfitted zodiacs listed rather than hiding them', () => {
    const shown = AYANAMSA_OPTIONS.map((option) => option.id);
    for (const mode of Object.keys(AYANAMSA_LABELS) as AyanamsaMode[]) {
      expect(shown, mode).toContain(mode);
    }
  });
});
