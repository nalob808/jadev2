import { describe, expect, it } from 'vitest';
import {
  isInsidePolygon,
  northIndianLines,
  northIndianRegions,
  SOUTH_INDIAN_CELLS,
} from '../src/charts/geometry.js';

/**
 * Geometry regressions are invisible to typecheck and only show up as a chart
 * that looks subtly wrong. These assert the things a reader would notice.
 */
describe('North Indian layout', () => {
  const regions = northIndianRegions();

  it('has twelve houses, numbered 1 to 12 exactly once', () => {
    expect(regions).toHaveLength(12);
    expect(regions.map((r) => r.house).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('puts every label and graha anchor inside its own house', () => {
    // The bug this catches: a centroid-derived anchor in a corner triangle
    // sits near the outer edge, and the sign number lands on top of the
    // grahas — or outside the region altogether.
    for (const region of regions) {
      expect(isInsidePolygon(region.label, region.polygon), `house ${region.house} label`).toBe(
        true,
      );
      expect(isInsidePolygon(region.centre, region.polygon), `house ${region.house} glyphs`).toBe(
        true,
      );
    }
  });

  it('keeps the label clear of the graha stack', () => {
    for (const region of regions) {
      const distance = Math.hypot(
        region.label.x - region.centre.x,
        region.label.y - region.centre.y,
      );
      expect(distance, `house ${region.house} label/glyph gap`).toBeGreaterThan(10);
    }
  });

  it('house 1 is the top-centre rhombus, which is the whole convention', () => {
    const house1 = regions.find((r) => r.house === 1)!;
    expect(house1.polygon).toHaveLength(4);
    expect(house1.centre.x).toBe(50);
    expect(house1.centre.y).toBeLessThan(50);
  });

  it('numbers houses anticlockwise: 4 is on the left, 10 on the right', () => {
    const at = (house: number) => regions.find((r) => r.house === house)!.centre;
    expect(at(4).x).toBeLessThan(at(1).x);
    expect(at(10).x).toBeGreaterThan(at(1).x);
    expect(at(7).y).toBeGreaterThan(at(1).y);
  });

  it('draws six frame lines: two diagonals and the inner diamond', () => {
    expect(northIndianLines()).toHaveLength(6);
  });
});

describe('South Indian layout', () => {
  it('places twelve signs on the perimeter of a 4x4, leaving the middle empty', () => {
    expect(SOUTH_INDIAN_CELLS).toHaveLength(12);
    expect(new Set(SOUTH_INDIAN_CELLS.map((c) => c.signIndex)).size).toBe(12);
    for (const cell of SOUTH_INDIAN_CELLS) {
      const isPerimeter =
        cell.row === 0 || cell.row === 3 || cell.column === 0 || cell.column === 3;
      expect(isPerimeter, `sign ${cell.signIndex} must be on the edge`).toBe(true);
    }
    expect(new Set(SOUTH_INDIAN_CELLS.map((c) => `${c.row},${c.column}`)).size).toBe(12);
  });

  it('fixes Aries top row second column, the convention this style depends on', () => {
    const aries = SOUTH_INDIAN_CELLS.find((c) => c.signIndex === 0)!;
    expect([aries.row, aries.column]).toEqual([0, 1]);
    const pisces = SOUTH_INDIAN_CELLS.find((c) => c.signIndex === 11)!;
    expect([pisces.row, pisces.column]).toEqual([0, 0]);
  });

  it('runs clockwise, so consecutive signs are adjacent cells', () => {
    for (let i = 0; i < 12; i += 1) {
      const a = SOUTH_INDIAN_CELLS.find((c) => c.signIndex === i)!;
      const b = SOUTH_INDIAN_CELLS.find((c) => c.signIndex === (i + 1) % 12)!;
      const step = Math.abs(a.row - b.row) + Math.abs(a.column - b.column);
      expect(step, `sign ${i} to ${i + 1}`).toBe(1);
    }
  });
});
