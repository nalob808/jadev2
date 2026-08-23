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
    <div className="jade-dasha">
      <style>{DASHA_CSS}</style>
      <div className="jade-dasha-head">
        Vimśottarī · {dashas.yearLength} year · balance {dashas.balanceAtBirthYears.toFixed(2)} yrs
      </div>
      <ol className="jade-dasha-list">
        {rows.map((period) => {
          const running = runningIds.has(period.lords.join('-'));
          const isCurrent = running && period.level === chain.length;
          return (
            <li
              key={period.lords.join('-') + period.startJd}
              className={`jade-dasha-row${running ? ' is-running' : ''}${isCurrent ? ' is-current' : ''}`}
              style={{ paddingLeft: `${6 + (period.level - 1) * 14}px` }}
            >
              <span className="jade-dasha-glyph">{GLYPHS[period.lord] ?? ''}</span>
              <span className="jade-dasha-lords">{period.lords.join(' › ')}</span>
              <span className="jade-dasha-dates">
                {formatJd(period.startJd)} – {formatJd(period.endJd)}
                {isCurrent ? <span className="jade-dasha-now"> ◂ now</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Two columns on a wide screen, stacked on a phone. The dates cannot share a
 * line with a five-level daśā chain at 390px — they wrap into the lords and
 * the column becomes unreadable, which is the one thing this view must not be.
 */
const DASHA_CSS = `
  .jade-dasha { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
  .jade-dasha-head { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
                     color: var(--ink-muted, #4A5C6B); margin-bottom: 6px; }
  .jade-dasha-list { list-style: none; margin: 0; padding: 0; }
  .jade-dasha-row { display: grid; grid-template-columns: 1.5em 1fr; gap: 2px 10px;
                    padding: 4px 6px; border-bottom: 1px solid var(--rule, #C8CEC9); }
  .jade-dasha-row.is-running { background: color-mix(in srgb, var(--accent, #33668F) 8%, transparent); }
  .jade-dasha-row.is-current { font-weight: 700; }
  .jade-dasha-glyph { grid-row: span 2; }
  .jade-dasha-lords { min-width: 0; overflow-wrap: anywhere; }
  .jade-dasha-dates { color: var(--ink-muted, #4A5C6B); font-size: 11px; white-space: nowrap; }
  .jade-dasha-now { color: var(--accent, #33668F); }
  @media (min-width: 640px) {
    .jade-dasha-row { grid-template-columns: 1.5em 1fr auto; align-items: baseline; }
    .jade-dasha-glyph { grid-row: auto; }
    .jade-dasha-dates { font-size: 12px; }
  }
`;

function formatJd(jdUt: number): string {
  const { year, month, day } = jdToCivilUtc(jdUt);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
