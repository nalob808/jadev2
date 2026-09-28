import type { Working } from '@jade/interpret';

/**
 * The workings behind a paragraph, available but not in the way.
 *
 * ## Why this component is the whole argument
 *
 * The technical surfaces print their factors inline in mono type beside every
 * claim. That is correct for a practitioner and it is what makes Jade unreadable
 * for everyone else — a paragraph interrupted by `Placed: 12°34′ Virgo, the 5th`
 * stops being prose.
 *
 * So on the reading surface the factors move behind a disclosure. The important
 * thing is that they *move* rather than disappear: the constitution's demand is
 * that a statement can be checked, not that it must be checked constantly. A
 * `<details>` element keeps them one tap away, works without JavaScript, and is
 * reachable by keyboard and screen reader for free.
 *
 * If this ever renders nothing, that is a bug rather than a style — a paragraph
 * with no workings is a free-floating claim, and a test asserts none exist.
 */
export function Workings({
  workings,
  source,
}: {
  readonly workings: readonly Working[];
  readonly source?: string;
}): React.ReactElement | null {
  if (workings.length === 0) return null;

  return (
    <details className="group mt-1.5">
      <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent)]">
        why this — {workings.length} {workings.length === 1 ? 'placement' : 'placements'}
      </summary>
      <div className="mt-1.5 border-l-2 border-[var(--rule)] pl-3">
        <dl className="flex flex-col gap-0.5">
          {workings.map((working, index) => (
            <div key={`${working.label}-${index}`} className="flex flex-wrap gap-x-2">
              <dt className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                {working.label}
              </dt>
              <dd className="font-mono text-[11.5px] text-[var(--ink-muted)]">{working.detail}</dd>
            </div>
          ))}
        </dl>
        {source ? (
          <p className="mt-1 font-mono text-[10px] italic text-[var(--ink-faint)]">{source}</p>
        ) : null}
      </div>
    </details>
  );
}
