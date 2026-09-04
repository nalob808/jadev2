import type { PrepSheet as Sheet } from '@jade/interpret';
import { unixMsFromJd } from '@jade/astro';
import type { Clock } from '@/lib/clock';
import { Kicker, Panel } from './Shell';

/**
 * The prep sheet, rendered.
 *
 * The diary is a table and the sections are prose, and that split is the whole
 * design. Dates are scanned — a practitioner runs an eye down a column looking
 * for the one in the next fortnight — and prose is read once. Rendering the
 * dates as sentences would make the most useful thing on the page the hardest
 * to use.
 *
 * Every statement shows its factors, as everywhere else in Jade. Here it earns
 * its keep twice over: a practitioner about to say something out loud to a
 * paying client can see exactly which placement produced it, and decide
 * whether they agree before they repeat it.
 */
export function PrepSheet({ sheet, clock }: { sheet: Sheet; clock: Clock }): React.ReactElement {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* ------------------------------------------------------- the diary */}
      {sheet.diary.length > 0 ? (
        <Panel marked>
          <Kicker>Dates either side of this consultation</Kicker>
          <table className="mt-3 w-full border-collapse text-[13px]">
            <caption className="sr-only">Dated transit and daśā events around the session</caption>
            <thead>
              <tr className="border-b border-[var(--rule)] text-left">
                <th
                  scope="col"
                  className="pb-1 pr-3 font-mono text-[9.5px] uppercase tracking-[0.14em] font-normal text-[var(--ink-faint)]"
                >
                  When
                </th>
                <th
                  scope="col"
                  className="pb-1 pr-3 font-mono text-[9.5px] uppercase tracking-[0.14em] font-normal text-[var(--ink-faint)]"
                >
                  What
                </th>
                <th
                  scope="col"
                  className="pb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] font-normal text-[var(--ink-faint)]"
                >
                  Where
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.diary.map((entry) => (
                <tr
                  key={`${entry.jdUt}-${entry.headline}`}
                  className="border-b border-[var(--rule)] align-baseline last:border-0"
                >
                  <td className="whitespace-nowrap py-1.5 pr-3 font-mono tabular-nums text-[var(--ink-muted)]">
                    {clock.format(unixMsFromJd(entry.jdUt), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-1.5 pr-3">{entry.headline}</td>
                  <td className="py-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                    {entry.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            Contact dates are computed from the birth moment on record and every pass of a
            retrograde loop is listed separately. They are positions, not events.
          </p>
        </Panel>
      ) : null}

      {/* ----------------------------------------------------- the sections */}
      {sheet.sections.map((section) => (
        <Panel key={section.id}>
          <Kicker>{section.kicker}</Kicker>
          <h2 className="mt-1 font-display text-2xl font-semibold">{section.title}</h2>
          {section.lede ? (
            <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-[var(--ink-muted)]">
              {section.lede}
            </p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-2.5">
            {section.statements.map((statement, index) => (
              <li key={`${section.id}-${index}`} className="border-l-2 border-[var(--rule)] pl-3">
                <p className="text-[14px] leading-relaxed">{statement.text}</p>
                {statement.factors.length > 0 ? (
                  <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-faint)]">
                    {statement.factors.map((f) => `${f.kind}: ${f.detail}`).join(' · ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
