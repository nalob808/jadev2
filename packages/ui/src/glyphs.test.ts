import { describe, expect, it } from 'vitest';
import { GRAHA_NAMES, GRAHA_NATURE, hasGlyph, SIGN_ELEMENT, SIGN_NAMES } from './glyphs.js';

describe('glyphs', () => {
  it('covers all twelve signs and all nine grahas plus the lagna', () => {
    expect(SIGN_NAMES).toHaveLength(12);
    expect(GRAHA_NAMES).toHaveLength(10);
    expect(GRAHA_NAMES).toContain('Rahu');
    expect(GRAHA_NAMES).toContain('Ketu');
  });

  it('assigns every sign an element, in the classical repeating order', () => {
    expect(SIGN_ELEMENT).toHaveLength(12);
    expect(SIGN_ELEMENT.slice(0, 4)).toEqual(['fire', 'earth', 'air', 'water']);
  });

  it('assigns every graha a nature', () => {
    for (const name of GRAHA_NAMES) {
      expect(GRAHA_NATURE[name], name).toBeDefined();
    }
  });

  /**
   * The reason this whole file exists rather than a string of Unicode
   * characters: iOS gives several zodiac code points emoji presentations, so
   * a chart renders half its signs as colour emoji at the wrong size. If a
   * Unicode zodiac character ever reappears in here, that regression is back.
   */
  it('contains no Unicode zodiac or planet characters', () => {
    const source = JSON.stringify({ SIGN_NAMES, GRAHA_NAMES, GRAHA_NATURE });
    expect(source).not.toMatch(/[♈-♓☉☽-♇]/u);
  });
});

/**
 * The regression that motivated `hasGlyph`.
 *
 * `Uranus`, `Neptune`, `Pluto` and `Midheaven` are valid chart points that
 * Jyotiṣa does not read. When the glyph set was only signs and grahas, the
 * wheel cast its point ids with `as never` to get past the compiler, and a
 * chart containing an outer crashed the page at the lookup. Both halves of
 * that are pinned here: the vocabulary covers every point, and an unknown
 * name is answered rather than thrown at.
 */
describe('coverage of every chart point', () => {
  it('has a glyph for the outers and the Midheaven', () => {
    for (const name of ['Uranus', 'Neptune', 'Pluto', 'Midheaven']) {
      expect(hasGlyph(name), name).toBe(true);
    }
  });

  it('reports an unknown name rather than assuming one', () => {
    expect(hasGlyph('Vulcan')).toBe(false);
    expect(hasGlyph('')).toBe(false);
  });

  it('recognises every sign and graha it names', () => {
    for (const name of [...SIGN_NAMES, ...GRAHA_NAMES]) {
      expect(hasGlyph(name), name).toBe(true);
    }
  });
});
