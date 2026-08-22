import type { ComputedChart, VargaId } from '@jade/astro';
import { buildVargaChart, VARGA_IDS, VARGA_NAMES } from '@jade/astro';
import { NorthIndianChart } from './NorthIndianChart.js';
import { SouthIndianChart } from './SouthIndianChart.js';

export type ChartStyle = 'north' | 'south' | 'east';

/**
 * The ṣoḍaśavarga contact sheet — all sixteen divisionals at a glance.
 *
 * Each one is a real chart, re-seated on its own ascendant, not the rāśi
 * redrawn sixteen times. Small deliberately: this is for spotting a pattern
 * across vargas, and you open the one that catches your eye.
 */
export function VargaGrid({
  chart,
  style = 'north',
  only,
  cellSize = 132,
  onSelect,
}: {
  chart: ComputedChart;
  style?: ChartStyle;
  /** Restrict to a subset, in this order. Defaults to all sixteen. */
  only?: readonly VargaId[];
  cellSize?: number;
  onSelect?: (vargaId: VargaId) => void;
}): React.ReactElement {
  const ids = only ?? VARGA_IDS;
  const Chart = style === 'south' ? SouthIndianChart : NorthIndianChart;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`,
        gap: '14px',
      }}
    >
      {ids.map((vargaId) => {
        const varga = buildVargaChart(chart, vargaId);
        const body = (
          <>
            <div
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #4A5C6B)',
                marginBottom: '4px',
              }}
            >
              {vargaId} · {VARGA_NAMES[vargaId]}
            </div>
            <Chart varga={varga} size={cellSize} signLabels="number" />
          </>
        );

        return onSelect ? (
          <button
            key={vargaId}
            type="button"
            onClick={() => onSelect(vargaId)}
            style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
            aria-label={`Open ${VARGA_NAMES[vargaId]}`}
          >
            {body}
          </button>
        ) : (
          <div key={vargaId}>{body}</div>
        );
      })}
    </div>
  );
}
