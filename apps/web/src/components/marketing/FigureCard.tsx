import Link from 'next/link';
import type { PublicFigure } from '@jade/db';
import { RODDEN } from '@/lib/publicChart';

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

export function bornLabel(figure: PublicFigure): string {
  const [year, month, day] = figure.birthDate.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

/**
 * One figure in a list.
 *
 * The rating sits on the card rather than only on the chart page, because the
 * question a reader is really asking while scanning a library is "which of
 * these can I actually learn an ascendant from" — and answering it one click
 * later means they have already formed an impression from a chart that cannot
 * carry it.
 */
export function FigureCard({ figure }: { figure: PublicFigure }): React.ReactElement {
  const rating = RODDEN[figure.rodden];
  return (
    <li>
      <Link
        href={`/charts/${figure.slug}`}
        className="group flex h-full flex-col gap-2 border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {bornLabel(figure)}
        </p>
        <p className="font-display text-2xl leading-tight text-[var(--ink)] group-hover:text-[var(--accent)]">
          {figure.displayName}
        </p>
        <p className="line-clamp-3 grow text-[13px] leading-relaxed text-[var(--ink-muted)]">
          {figure.summary}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
          <span
            className="border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
            style={{
              borderColor:
                rating?.trust === 'high'
                  ? 'var(--jade)'
                  : rating?.trust === 'none'
                    ? 'var(--rule-strong)'
                    : 'var(--clay)',
              color:
                rating?.trust === 'high'
                  ? 'var(--jade)'
                  : rating?.trust === 'none'
                    ? 'var(--ink-faint)'
                    : 'var(--clay)',
            }}
          >
            {figure.rodden}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--ink-faint)]">
            {figure.birthTime ? 'timed' : 'no birth time'}
          </span>
        </p>
      </Link>
    </li>
  );
}
