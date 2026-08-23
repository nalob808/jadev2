import type { PointId } from '@jade/astro';
import { SOUTH_INDIAN_CELL, SOUTH_INDIAN_CELLS } from './geometry.js';
import {
  CHART_CSS,
  SIGN_ABBREVIATIONS,
  describeChart,
  glyphFor,
  layoutGlyphs,
  type ChartProps,
} from './shared.js';

/**
 * South Indian chart.
 *
 * The inverse convention: signs are nailed to the paper — Aries always top
 * row, second column — and the houses rotate. The lagna is marked with a
 * diagonal across its corner rather than moved, which is why this style needs
 * no sign numbers to stay readable.
 */
export function SouthIndianChart({
  varga,
  size = 320,
  highlight = [],
  signLabels = 'short',
  title,
}: ChartProps): React.ReactElement {
  const highlighted = new Set(highlight);
  const retrograde = new Set(varga.placements.filter((p) => p.retrograde).map((p) => p.pointId));
  const cell = SOUTH_INDIAN_CELL;

  return (
    <svg
      className="jade-chart"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={
        title ??
        `${varga.name} chart, South Indian style, ascendant in ${SIGN_ABBREVIATIONS[varga.ascendantSign]}`
      }
    >
      <style>{CHART_CSS}</style>
      <desc>{describeChart(varga)}</desc>

      {SOUTH_INDIAN_CELLS.map(({ signIndex, row, column }) => {
        const x = column * cell;
        const y = row * cell;
        const isLagna = signIndex === varga.ascendantSign;
        const house = ((signIndex - varga.ascendantSign + 12) % 12) + 1;
        const points = varga.bySign[signIndex] ?? [];

        return (
          <g key={signIndex}>
            {isLagna ? (
              <rect className="lagna-fill" x={x} y={y} width={cell} height={cell} />
            ) : null}
            <rect className="frame" x={x} y={y} width={cell} height={cell} />
            {/* The traditional lagna mark: a short diagonal across the corner. */}
            {isLagna ? (
              <line className="lagna-mark" x1={x} y1={y} x2={x + cell * 0.3} y2={y + cell * 0.3} />
            ) : null}
            <text
              className="sign-label"
              x={x + cell - 1.5}
              y={y + 3}
              textAnchor="end"
              dominantBaseline="central"
            >
              {signLabels === 'number' ? signIndex + 1 : SIGN_ABBREVIATIONS[signIndex]}
              <tspan dx="1.5" opacity="0.6">
                {house}
              </tspan>
            </text>
            {layoutGlyphs(points, { x: x + cell / 2, y: y + cell / 2 + 1.5 }, 6).map(
              ({ pointId, x: gx, y: gy }) => (
                <text
                  key={pointId}
                  className={glyphClass(pointId, highlighted, retrograde)}
                  x={gx}
                  y={gy}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {glyphFor(pointId)}
                </text>
              ),
            )}
          </g>
        );
      })}
    </svg>
  );
}

function glyphClass(
  pointId: PointId,
  highlighted: ReadonlySet<PointId>,
  retrograde: ReadonlySet<PointId>,
): string {
  return [
    'graha',
    highlighted.has(pointId) ? 'is-highlighted' : '',
    retrograde.has(pointId) ? 'is-retrograde' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
