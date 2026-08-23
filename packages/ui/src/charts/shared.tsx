import type { PointId, VargaChart } from '@jade/astro';
import { GLYPHS } from '../tokens.js';

export const SIGN_ABBREVIATIONS = [
  'Ari',
  'Tau',
  'Gem',
  'Can',
  'Leo',
  'Vir',
  'Lib',
  'Sco',
  'Sag',
  'Cap',
  'Aqu',
  'Pis',
] as const;

export interface ChartProps {
  readonly varga: VargaChart;
  /** Pixel size of the square. Everything scales from this. */
  readonly size?: number;
  /** Points to draw in the accent colour — a transit hit, a daśā lord. */
  readonly highlight?: readonly PointId[];
  /** Show 12/9/6 sign numbers rather than three-letter names. */
  readonly signLabels?: 'number' | 'short';
  readonly title?: string;
}

export function glyphFor(pointId: PointId): string {
  return GLYPHS[pointId as keyof typeof GLYPHS] ?? pointId.slice(0, 2);
}

/**
 * Stack the grahas in a house without letting them overflow it.
 *
 * Up to three per line, because a stacked column of seven runs out of the
 * region — and a chart where Saturn has quietly slid outside its house is
 * worse than one that is slightly crowded.
 */
export function layoutGlyphs(
  points: readonly PointId[],
  centre: { x: number; y: number },
  fontSize: number,
): Array<{ pointId: PointId; x: number; y: number }> {
  const perRow = points.length > 4 ? 3 : 2;
  const rows = Math.ceil(points.length / perRow);
  const rowHeight = fontSize * 1.05;
  const columnWidth = fontSize * 1.15;

  return points.map((pointId, index) => {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const inThisRow = Math.min(perRow, points.length - row * perRow);
    return {
      pointId,
      x: centre.x + (column - (inThisRow - 1) / 2) * columnWidth,
      y: centre.y + (row - (rows - 1) / 2) * rowHeight,
    };
  });
}

export const CHART_CSS = `
  .jade-chart { --chart-ink: var(--ink, #16222E); --chart-rule: var(--rule, #C8CEC9);
                --chart-accent: var(--accent, #33668F); --chart-muted: var(--ink-muted, #4A5C6B); }
  .jade-chart .frame { fill: none; stroke: var(--chart-rule); stroke-width: 0.6; }
  .jade-chart .lagna-fill { fill: var(--chart-accent); opacity: 0.07; }
  .jade-chart .sign-label { fill: var(--chart-muted); font-size: 4.2px; letter-spacing: 0.04em; }
  .jade-chart .graha { fill: var(--chart-ink); font-size: 6px; }
  .jade-chart .graha.is-highlighted { fill: var(--chart-accent); font-weight: 700; }
  .jade-chart .graha.is-retrograde { font-style: italic; }
  .jade-chart .lagna-mark { fill: none; stroke: var(--chart-accent); stroke-width: 1.1; }
`;

/** Screen-reader text. An SVG chart is otherwise silent. */
export function describeChart(varga: {
  name: string;
  ascendantSign: number;
  byHouse: ReadonlyArray<readonly PointId[]>;
}): string {
  const houses = varga.byHouse
    .map((points, index) =>
      points.length
        ? `house ${index + 1} (${SIGN_ABBREVIATIONS[(varga.ascendantSign + index) % 12]}): ${points.join(', ')}`
        : null,
    )
    .filter(Boolean);
  return `${varga.name}. ${houses.join('. ')}.`;
}
