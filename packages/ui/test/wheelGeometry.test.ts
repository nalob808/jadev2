import { describe, expect, it } from 'vitest';
import {
  angleFor,
  annulusSector,
  degreesLabel,
  polar,
  spread,
} from '../src/charts/wheelGeometry.js';

describe('angleFor', () => {
  it('puts the ascendant at zero', () => {
    expect(angleFor(217.4, 217.4)).toBe(0);
  });

  it('is always inside one turn, whatever the inputs', () => {
    for (const [lon, asc] of [
      [0, 350],
      [359.9, 0.1],
      [-40, 20],
      [720, 30],
    ]) {
      const angle = angleFor(lon!, asc!);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    }
  });

  // This is the bug that shipped once: houses running clockwise puts the 4th
  // at the top and the 10th at the bottom, which looks perfectly fine and
  // reads inside out.
  it('increases counterclockwise, so the 7th sits opposite the ascendant', () => {
    const asc = 100;
    expect(angleFor(100 + 180, asc)).toBeCloseTo(180, 6);
  });
});

describe('polar', () => {
  it('places angle 0 at the left horizon', () => {
    const [x, y] = polar(50, 50, 40, 0);
    expect(x).toBeCloseTo(10, 6);
    expect(y).toBeCloseTo(50, 6);
  });

  it('places 90° at the bottom, because the wheel runs counterclockwise', () => {
    // Counterclockwise from the left horizon on a screen whose y grows down
    // means a quarter turn lands below centre.
    const [x, y] = polar(50, 50, 40, 90);
    expect(x).toBeCloseTo(50, 6);
    expect(y).toBeCloseTo(90, 6);
  });

  it('places 180° at the right horizon', () => {
    const [x, y] = polar(50, 50, 40, 180);
    expect(x).toBeCloseTo(90, 6);
    expect(y).toBeCloseTo(50, 6);
  });

  it('stays on the circle at every angle', () => {
    for (let a = 0; a < 360; a += 7) {
      const [x, y] = polar(50, 50, 40, a);
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(40, 6);
    }
  });
});

describe('spread', () => {
  it('leaves well-separated glyphs alone', () => {
    expect(spread([0, 40, 80], 7)).toEqual([0, 40, 80]);
  });

  // A stellium is exactly what a practitioner most wants to look at, so
  // rendering it as one smudge fails at the worst moment.
  it('separates a conjunction to at least the minimum gap', () => {
    const out = spread([100, 101, 102.5], 7);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(7 - 1e-9);
    }
  });

  it('preserves the caller’s order, and never mutates the input', () => {
    const input = [50, 12, 51];
    const frozen = [...input];
    const out = spread(input, 7);
    expect(input).toEqual(frozen);
    // Index 1 was the smallest and stays put; the other two get pushed apart.
    expect(out[1]).toBe(12);
    expect(out).toHaveLength(3);
  });

  it('handles an empty list and a single glyph', () => {
    expect(spread([], 7)).toEqual([]);
    expect(spread([42], 7)).toEqual([42]);
  });
});

describe('annulusSector', () => {
  it('closes the path and uses both radii', () => {
    const d = annulusSector(50, 50, 20, 40, 0, 30);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
    expect(d).toContain('A 40 40');
    expect(d).toContain('A 20 20');
  });

  it('sets the large-arc flag only past a half turn', () => {
    expect(annulusSector(50, 50, 20, 40, 0, 30)).toContain('0 0 0');
    expect(annulusSector(50, 50, 20, 40, 0, 200)).toContain('0 1 0');
  });

  it('never emits NaN', () => {
    for (let a = 0; a < 360; a += 30) {
      expect(annulusSector(50, 50, 20, 40, a, a + 30)).not.toContain('NaN');
    }
  });
});

describe('degreesLabel', () => {
  it('reads as degrees and minutes', () => {
    expect(degreesLabel(12.0667)).toBe('12°04′');
    expect(degreesLabel(0)).toBe('0°00′');
  });

  // 29.999° must not render as 29°60′.
  it('carries the minute at the top of a degree', () => {
    expect(degreesLabel(29.99999)).toBe('30°00′');
    expect(degreesLabel(5.9999)).toBe('6°00′');
  });
});
