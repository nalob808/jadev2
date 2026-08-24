import Link from 'next/link';
import type { ReadingSection } from '@jade/interpret';

/**
 * A composed reading.
 *
 * The factors are the point. Constitution item 5 says an interpretive
 * statement may not appear without the computed factors that produced it —
 * and "shown alongside" is the operative phrase, so they are rendered beside
 * the text rather than tucked behind a disclosure. A reader should be able to
 * check any sentence against the chart without clicking anything.
 *
 * Every statement carries an anchor, so a note can be written against the
 * exact factor being discussed and found later from any other chart that has
 * it. That is what turns a reading into study material.
 */

const KIND_TINT: Record<string, string> = {
  Dignity: 'var(--jade)',
  Condition: 'var(--clay)',
  Cancellation: 'var(--clay)',
  'Formed by': 'var(--accent)',
  Period: 'var(--clay)',
  House: 'var(--accent)',
};

function Factor({ kind, detail }: { kind: string; detail: string }): React.ReactElement {
  const tint = KIND_TINT[kind] ?? 'var(--ink-faint)';
  return (
    <span
      className="inline-flex items-baseline gap-1.5 border-l-2 py-0.5 pl-2 font-mono text-[10px] leading-snug"
      style={{ borderColor: tint }}
    >
      <span className="uppercase tracking-[0.12em]" style={{ color: tint }}>
        {kind}
      </span>
      <span className="text-[var(--ink-muted)]">{detail}</span>
    </span>
  );
}

export function Reading({
  sections,
  subjectId,
}: {
  sections: readonly ReadingSection[];
  subjectId: string;
}): React.ReactElement {
  if (sections.length === 0) {
    return (
      <div className="jade-panel p-5">
        <p className="text-[var(--ink-muted)]">
          Nothing to read yet — this chart has no computed factors to ground a statement in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          className="jade-rise"
          style={{ '--i': sectionIndex } as React.CSSProperties}
        >
          <div className="mb-3 border-b border-[var(--rule)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {section.kicker}
            </p>
            <h3 className="font-display text-2xl font-semibold leading-tight">{section.title}</h3>
            {section.lede ? (
              <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-[var(--ink-faint)]">
                {section.lede}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            {section.statements.map((statement, index) => (
              <article key={`${section.id}-${index}`} className="jade-panel p-4">
                <p className="text-[15.5px] leading-relaxed text-[var(--ink)]">{statement.text}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {statement.factors.map((factor, i) => (
                    <Factor key={`${factor.kind}-${i}`} kind={factor.kind} detail={factor.detail} />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--rule)] pt-2">
                  {statement.source ? (
                    <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {statement.source}
                    </span>
                  ) : null}

                  {statement.anchor ? (
                    <div className="ml-auto flex items-center gap-3">
                      <Link
                        href={`/notes?anchorKind=${statement.anchor.kind}&anchorKey=${encodeURIComponent(statement.anchor.key)}`}
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
                      >
                        Notes on {statement.anchor.label}
                      </Link>
                      <Link
                        href={`/people/${subjectId}#notes`}
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] transition-opacity hover:opacity-70"
                      >
                        Write one →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * All twelve houses for this chart, with what each governs.
 *
 * The teaching surface inside the app: it answers "what is the 6th house
 * again" at the moment the question arises, without leaving the chart.
 */
export function HouseTable({
  rows,
}: {
  rows: ReadonlyArray<{
    house: {
      number: number;
      title: string;
      sanskrit: string;
      keywords: readonly string[];
      karaka: string;
    };
    sign: string;
    lord: string;
    occupants: readonly string[];
  }>;
}): React.ReactElement {
  return (
    <div className="overflow-x-auto border border-[var(--rule)] bg-[var(--surface)]">
      <table
        aria-label="The twelve houses"
        className="w-full min-w-[44rem] border-collapse text-sm"
      >
        <thead>
          <tr className="border-b border-[var(--rule)] text-left">
            {['House', 'Sign', 'Lord', 'In it', 'What it governs'].map((heading) => (
              <th
                key={heading}
                className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-faint)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ house, sign, lord, occupants }) => (
            <tr key={house.number} className="border-t border-[var(--rule)] align-top">
              <td className="whitespace-nowrap px-3 py-2">
                <Link
                  href={`/learn/houses/${house.number}`}
                  className="font-display text-lg transition-colors hover:text-[var(--accent)]"
                >
                  {house.number}
                </Link>
                <span className="ml-2 font-mono text-[10px] text-[var(--ink-faint)]">
                  {house.sanskrit.split(' / ')[0]}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--ink-muted)]">{sign}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-[var(--ink-muted)]">
                {lord}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                {occupants.length ? (
                  occupants.join(', ')
                ) : (
                  <span className="text-[var(--ink-faint)]">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-[13px] leading-snug text-[var(--ink-muted)]">
                {house.keywords.join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
