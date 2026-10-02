import type { ChartSynthesis } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * What the chart is about, before any single placement.
 *
 * ## Why this sits above everything
 *
 * A reading made of nine graha cards is nine true statements and no reading. A
 * practitioner does not start by describing placements; they start by noticing
 * that three of them say the same thing and a fourth argues. This renders that
 * noticing, and the per-graha passages become the detail underneath it rather
 * than the whole of it.
 *
 * ## The two loudest threads are not printed twice
 *
 * `opening` already contains them, so the list below filters on `inOpening`.
 * The flag lives on the thread rather than in a slice here, because a second
 * surface rendering the same synthesis would otherwise have to remember the
 * same arithmetic — and would eventually not.
 */
export function ChartSpine({
  synthesis,
  name,
}: {
  readonly synthesis: ChartSynthesis;
  readonly name: string;
}): React.ReactElement {
  const rest = synthesis.threads.filter((thread) => !thread.inOpening);

  return (
    <section className="border-2 border-[var(--accent)] bg-[var(--surface)] px-5 py-5 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
        The shape of {name}’s chart
      </p>
      <h2 className="mt-1 font-display text-[2.1rem] leading-[1.1]">{synthesis.headline}</h2>

      <div className="mt-3 flex flex-col gap-3">
        {synthesis.opening.map((paragraph, index) => (
          <p key={index} className="max-w-[72ch] text-[16px] leading-[1.6]">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="mt-4 border-l-2 border-[var(--accent)] py-1 pl-3 text-[15px] leading-relaxed">
        {synthesis.question}
      </p>

      {rest.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rest.map((thread) => (
            <article key={thread.kind} className="border border-[var(--rule)] px-4 py-3">
              <h3 className="font-display text-[1.25rem] leading-tight">{thread.title}</h3>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-[var(--ink-muted)]">
                {thread.body}
              </p>
              <Workings workings={thread.workings} />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
