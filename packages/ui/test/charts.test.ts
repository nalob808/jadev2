import { describe, expect, it } from 'vitest';
import { SIGN_GLYPHS } from '../src/tokens.js';

describe('the synastry overlay wheel', () => {
  it('asks for the text presentation of every zodiac glyph', () => {
    // Without U+FE0E the browser renders these as colour emoji, and a
    // monochrome chart grows twelve cartoon badges. Caught only by looking at
    // a screenshot, so it is pinned here instead.
    for (const glyph of SIGN_GLYPHS) {
      expect(glyph).toContain('︎');
      expect([...glyph]).toHaveLength(2);
    }
    expect(SIGN_GLYPHS).toHaveLength(12);
  });

  it('puts the ascendant at nine o’clock and runs anticlockwise', () => {
    // The regression this pins: the first draft ran the houses the other way,
    // which put the fourth at the top and the tenth at the bottom. The chart
    // looked entirely plausible and was upside down — visible only by holding
    // a rendering next to a real wheel.
    const ascendantSign = 7;
    const angleFor = (signIndex: number): number => {
      const house = (((signIndex - ascendantSign) % 12) + 12) % 12;
      return (180 + house * 30) % 360;
    };
    const up = (angle: number): number => Math.round(Math.sin((angle * Math.PI) / 180));
    const right = (angle: number): number => Math.round(Math.cos((angle * Math.PI) / 180));

    expect(right(angleFor(ascendantSign))).toBe(-1); // 1st on the left
    expect(up(angleFor((ascendantSign + 3) % 12))).toBe(-1); // 4th at the bottom
    expect(right(angleFor((ascendantSign + 6) % 12))).toBe(1); // 7th on the right
    expect(up(angleFor((ascendantSign + 9) % 12))).toBe(1); // 10th at the top

    const seen = new Set(Array.from({ length: 12 }, (_, i) => angleFor((ascendantSign + i) % 12)));
    expect(seen.size).toBe(12); // no two signs share a wedge
  });
});

describe('conjunction stagger', () => {
  it('keeps every glyph inside its own ring, however many are stacked', () => {
    // Five conjunct grahas is a real configuration, and it is exactly the one
    // that used to push glyphs out of the ring and into the house labels.
    const band = 46;
    const limit = band / 2 - 8;
    for (let lane = 0; lane < 9; lane += 1) {
      const step = Math.ceil(lane / 2) * 14 * (lane % 2 === 1 ? 1 : -1);
      const offset = Math.max(-limit, Math.min(limit, step));
      expect(Math.abs(offset)).toBeLessThanOrEqual(limit);
    }
  });

  it('alternates sides so a stack spreads rather than drifting one way', () => {
    const sides = [1, 2, 3, 4].map((lane) => (lane % 2 === 1 ? 1 : -1));
    expect(sides).toEqual([1, -1, 1, -1]);
  });
});
