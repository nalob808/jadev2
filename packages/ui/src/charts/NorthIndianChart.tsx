import type { PointId } from '@jade/astro';
import { northIndianLines, northIndianRegions } from './geometry.js';
import {
  CHART_CSS,
  SIGN_ABBREVIATIONS,
  describeChart,
  glyphFor,
  layoutGlyphs,
  type ChartProps,
} from './shared.js';

/**
 * North Indian (diamond) chart.
 *
 * Houses are fixed to the paper — house 1 is always the top-centre rhombus —
 * and the signs rotate through them. That is why each region carries a sign
 * number: without it the chart is unreadable, because you cannot tell which
 * rāśi you are looking at.
 */
export function NorthIndianChart({
  varga,
  size = 320,
  highlight = [],
  signLabels = 'number',
  title,
}: ChartProps): React.ReactElement {
  const regions = northIndianRegions();
  const highlighted = new Set(highlight);
  const retrograde = new Set(varga.placements.filter((p) => p.retrograde).map((p) => p.pointId));

  return (
    <svg
      className="jade-chart"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={
        title ??
        `${varga.name} chart, North Indian style, ascendant in ${SIGN_ABBREVIATIONS[varga.ascendantSign]}`
      }
    >
      <style>{CHART_CSS}</style>
      <desc>{describeChart(varga)}</desc>

      {/* House 1 tinted, so the lagna is findable at a glance. */}
      <polygon className="lagna-fill" points={toPoints(regions[0]!.polygon)} />

      <rect className="frame" x="0.3" y="0.3" width="99.4" height="99.4" />
      {northIndianLines().map(([from, to], index) => (
        <line key={index} className="frame" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      ))}

      {regions.map((region) => {
        const signIndex = (varga.ascendantSign + region.house - 1) % 12;
        const points = varga.byHouse[region.house - 1] ?? [];
        return (
          <g key={region.house}>
            <text
              className="sign-label"
              x={region.label.x}
              y={region.label.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {signLabels === 'number' ? signIndex + 1 : SIGN_ABBREVIATIONS[signIndex]}
            </text>
            {layoutGlyphs(points, region.centre, 6).map(({ pointId, x, y }) => (
              <text
                key={pointId}
                className={glyphClass(pointId, highlighted, retrograde)}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {glyphFor(pointId)}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function toPoints(polygon: ReadonlyArray<{ x: number; y: number }>): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(' ');
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
