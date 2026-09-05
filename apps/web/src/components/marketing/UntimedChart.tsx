import Link from 'next/link';
import type { UndatedDay } from '@jade/astro';

const GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
};

/**
 * What a chart says when nobody wrote down the hour.
 *
 * The whole design problem here is to be *useful* while refusing to be
 * confident. Most software resolves that tension by dropping the refusal: it
 * assumes noon, draws an ascendant, and the reader has no way to tell. This
 * does the opposite — it separates what the date settles from what it does not,
 * and it makes the second list as prominent as the first.
 *
 * The table shows both ends of the birthday. A graha in the same sign at
 * midnight and at midnight is in that sign, full stop. One that crosses a
 * boundary gets both answers, because both are true given what is known.
 */
export function UntimedChart({ day, slug }: { day: UndatedDay; slug: string }): React.ReactElement {
  const certain = day.positions.filter((p) => p.signCertain);
  const uncertain = day.positions.filter((p) => !p.signCertain);

  return (
    <div className="flex flex-col gap-5">
      <div className="border-l-2 border-[var(--clay)] bg-[var(--surface)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
          No ascendant is shown, and that is not a limitation of this page
        </p>
        <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          The ascendant travels the entire zodiac in a day, so a date without an hour does not
          determine it — nor any house, since houses are counted from it. Software that shows you
          one here has assumed a time, usually noon, and has not told you. Jade would rather show
          you less and have all of it be true.
        </p>
      </div>

      {/* ------------------------------------------------ what IS settled */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--jade)]">
          Settled by the date alone
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-[13.5px]">
            <caption className="sr-only">Grahas whose sign does not change during the day</caption>
            <tbody>
              {certain.map((position) => (
                <tr key={position.id} className="border-b border-[var(--rule)] last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                    <span aria-hidden="true" className="mr-1.5 text-[var(--ink-muted)]">
                      {GLYPHS[position.id]}
                    </span>
                    {position.id}
                  </th>
                  <td className="py-1.5 pr-3">{position.signStart}</td>
                  <td className="py-1.5 font-mono text-[11px] text-[var(--ink-faint)]">
                    {position.nakshatraCertain
                      ? position.nakshatraStart
                      : `${position.nakshatraStart} or ${position.nakshatraEnd}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------- what is NOT settled */}
      {uncertain.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
            Changed sign during the day — both are possible
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-[13.5px]">
              <caption className="sr-only">Grahas that crossed a sign boundary that day</caption>
              <tbody>
                {uncertain.map((position) => (
                  <tr key={position.id} className="border-b border-[var(--rule)] last:border-0">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                      <span aria-hidden="true" className="mr-1.5 text-[var(--ink-muted)]">
                        {GLYPHS[position.id]}
                      </span>
                      {position.id}
                    </th>
                    <td className="py-1.5 pr-3">
                      {position.signStart} <span className="text-[var(--ink-faint)]">or</span>{' '}
                      {position.signEnd}
                    </td>
                    <td className="py-1.5 font-mono text-[11px] text-[var(--ink-faint)]">
                      moved {Math.abs(position.motion).toFixed(1)}° that day
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------- what to do next */}
      <div className="border-l-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
          A missing time is a question, not a dead end
        </p>
        <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          This is exactly what rectification is for. Add {slug.split('-').slice(-1)[0]} to your own
          workspace with the dated events of their life and Jade will sweep the day, rank the
          candidate times by the classical rules each one satisfies, and tell you which rules
          actually did the ranking and which fired for every candidate and therefore separated
          nothing.{' '}
          <Link href="/features" className="text-[var(--accent)] underline underline-offset-2">
            How rectification works
          </Link>
        </p>
      </div>
    </div>
  );
}
