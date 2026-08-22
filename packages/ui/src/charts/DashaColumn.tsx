import type { DashaPeriod, VimshottariResult } from '@jade/astro';
import { dashaChainAt, jdToCivilUtc } from '@jade/astro';
import { GLYPHS } from '../tokens.js';

/**
 * The Vimśottarī column.
 *
 * Always scrolled to now, because that is the only period anyone opens a
 * chart to look at. Three levels: mahā, antara, pratyantara — deeper than
 * that is a research view, not a reading view.
 */
export function DashaColumn({
  dashas,
  atJdUt,
  levels = 3,
}: {
  dashas: VimshottariResult;
  /** The instant "now" refers to. Passed in, never read from a clock. */
  atJdUt: number;
  levels?: 1 | 2 | 3;
}): React.ReactElement {
  const chain = dashaChainAt(dashas, atJdUt);
  const runningIds = new Set(chain.map((period) => period.lords.join('-')));

  const rows: DashaPeriod[] = [];
  const walk = (periods: readonly DashaPeriod[], depth: number): void => {
    for (const period of periods) {
      rows.push(period);
      const isOnChain = runningIds.has(period.lords.join('-'));
      if (isOnChain && depth < levels && period.children) walk(period.children, depth + 1);
    }
  };
  walk(dashas.periods, 1);

  return (
    <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '12px' }}>
      <div
        style={{
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #4A5C6B)',
          marginBottom: '6px',
        }}
      >
        Vimśottarī · {dashas.yearLength} year · balance {dashas.balanceAtBirthYears.toFixed(2)} yrs
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((period) => {
          const running = runningIds.has(period.lords.join('-'));
          return (
            <li
              key={period.lords.join('-') + period.startJd}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'baseline',
                padding: '3px 6px',
                paddingLeft: `${6 + (period.level - 1) * 14}px`,
                borderBottom: '1px solid var(--rule, #C8CEC9)',
                background: running
                  ? 'color-mix(in srgb, var(--accent, #33668F) 8%, transparent)'
                  : 'transparent',
                fontWeight: running && period.level === chain.length ? 700 : 400,
              }}
            >
              <span style={{ minWidth: '1.4em' }}>{GLYPHS[period.lord] ?? ''}</span>
              <span style={{ flex: 1 }}>{period.lords.join(' › ')}</span>
              <span style={{ color: 'var(--ink-muted, #4A5C6B)', whiteSpace: 'nowrap' }}>
                {formatJd(period.startJd)} – {formatJd(period.endJd)}
              </span>
              {running && period.level === chain.length ? (
                <span style={{ color: 'var(--accent, #33668F)' }}>◂ now</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatJd(jdUt: number): string {
  const { year, month, day } = jdToCivilUtc(jdUt);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
