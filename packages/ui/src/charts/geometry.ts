/**
 * Chart geometry.
 *
 * Both Indian layouts are built on a unit square (0–100) so a chart can be
 * drawn at any size by changing one viewBox and nothing else.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface HouseRegion {
  /** 1–12. */
  readonly house: number;
  readonly polygon: readonly Point[];
  /** Where the sign number sits — tucked toward the outer edge. */
  readonly label: Point;
  /** Where the grahas stack — the visual centre of the region. */
  readonly centre: Point;
}

const S = 100;
const M = S / 2;
const Q = S / 4;
const T3 = (3 * S) / 4;

/**
 * The North Indian diamond.
 *
 * A square with both diagonals and the inner diamond joining the side
 * midpoints. That produces four rhombi on the axes (houses 1, 4, 7, 10) and
 * eight corner triangles, numbered ANTICLOCKWISE from the top-centre rhombus —
 * which is house 1 always. The houses are fixed to the paper and the signs
 * rotate through them, the opposite of the South Indian convention.
 */
export function northIndianRegions(): HouseRegion[] {
  const A = { x: 0, y: 0 };
  const B = { x: S, y: 0 };
  const C = { x: S, y: S };
  const D = { x: 0, y: S };
  const top = { x: M, y: 0 };
  const right = { x: S, y: M };
  const bottom = { x: M, y: S };
  const left = { x: 0, y: M };
  const O = { x: M, y: M };
  // Where the diagonals meet the inner diamond.
  const pTL = { x: Q, y: Q };
  const pTR = { x: T3, y: Q };
  const pBR = { x: T3, y: T3 };
  const pBL = { x: Q, y: T3 };

  // Label and glyph anchors are hand-placed rather than derived from the
  // centroid. A triangle's centroid sits close to its outer edge, so the sign
  // number and the grahas landed on top of each other in all eight corners —
  // visible only once a real chart was rendered. Every anchor below is inside
  // its own region; `northIndianAnchorsAreInside` in the tests proves it.
  const regions: HouseRegion[] = [
    { house: 1, polygon: [top, pTR, O, pTL], label: { x: M, y: 7 }, centre: { x: M, y: 30 } },
    { house: 2, polygon: [A, top, pTL], label: { x: 14, y: 5 }, centre: { x: 26, y: 14 } },
    { house: 3, polygon: [A, pTL, left], label: { x: 5, y: 14 }, centre: { x: 14, y: 26 } },
    { house: 4, polygon: [left, pTL, O, pBL], label: { x: 7, y: M }, centre: { x: 28, y: M } },
    { house: 5, polygon: [D, left, pBL], label: { x: 5, y: 86 }, centre: { x: 14, y: 74 } },
    { house: 6, polygon: [D, pBL, bottom], label: { x: 14, y: 95 }, centre: { x: 26, y: 86 } },
    { house: 7, polygon: [bottom, pBL, O, pBR], label: { x: M, y: 93 }, centre: { x: M, y: 70 } },
    { house: 8, polygon: [C, bottom, pBR], label: { x: 86, y: 95 }, centre: { x: 74, y: 86 } },
    { house: 9, polygon: [C, pBR, right], label: { x: 95, y: 86 }, centre: { x: 86, y: 74 } },
    { house: 10, polygon: [right, pBR, O, pTR], label: { x: 93, y: M }, centre: { x: 72, y: M } },
    { house: 11, polygon: [B, right, pTR], label: { x: 95, y: 14 }, centre: { x: 86, y: 26 } },
    { house: 12, polygon: [B, pTR, top], label: { x: 86, y: 5 }, centre: { x: 74, y: 14 } },
  ];

  return regions;
}

/** Ray-casting point-in-polygon. Used by the tests to keep the anchors honest. */
export function isInsidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** The lines to stroke for the North Indian frame. */
export function northIndianLines(): Array<[Point, Point]> {
  return [
    [
      { x: 0, y: 0 },
      { x: S, y: S },
    ],
    [
      { x: S, y: 0 },
      { x: 0, y: S },
    ],
    [
      { x: M, y: 0 },
      { x: S, y: M },
    ],
    [
      { x: S, y: M },
      { x: M, y: S },
    ],
    [
      { x: M, y: S },
      { x: 0, y: M },
    ],
    [
      { x: 0, y: M },
      { x: M, y: 0 },
    ],
  ];
}

/**
 * The South Indian grid.
 *
 * A fixed 4×4 with the middle four cells blank. Signs are nailed to the paper
 * — Aries always top row, second column — and the houses rotate, which is the
 * exact inverse of the North Indian convention. The lagna is marked rather
 * than moved.
 */
export const SOUTH_INDIAN_CELLS: ReadonlyArray<{ signIndex: number; row: number; column: number }> =
  [
    { signIndex: 0, row: 0, column: 1 }, // Aries
    { signIndex: 1, row: 0, column: 2 },
    { signIndex: 2, row: 0, column: 3 },
    { signIndex: 3, row: 1, column: 3 },
    { signIndex: 4, row: 2, column: 3 },
    { signIndex: 5, row: 3, column: 3 },
    { signIndex: 6, row: 3, column: 2 },
    { signIndex: 7, row: 3, column: 1 },
    { signIndex: 8, row: 3, column: 0 },
    { signIndex: 9, row: 2, column: 0 },
    { signIndex: 10, row: 1, column: 0 },
    { signIndex: 11, row: 0, column: 0 }, // Pisces
  ];

export const SOUTH_INDIAN_CELL = S / 4;
