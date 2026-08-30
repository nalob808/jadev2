import type { RectificationResult } from '@jade/astro';
import { LIFE_EVENTS } from '@jade/astro';
import { adoptRectifiedTime } from '@/app/actions';

/**
 * The ranked shortlist.
 *
 * Three things here are load-bearing rather than decorative.
 *
 * **The bar is a share of the theoretical maximum, and it is labelled as one.**
 * A percentage with no denominator invites being read as probability, which
 * this is not — it is how much of the available classical support a candidate
 * collected.
 *
 * **Non-discriminating rules are shown, greyed, with their firing rate.** A
 * rule that fired for every candidate in the window contributed to every score
 * equally and therefore ranked nothing. Most rectification software silently
 * includes those and reports a confident-looking spread; showing them is the
 * difference between a tool and a slot machine.
 *
 * **Adopting a time is a separate, labelled act.** It writes `min5` accuracy
 * and a source note saying it was rectified, because a year later nobody
 * remembers whether an ascendant came from a certificate or from a sweep.
 */

const SHOWN = 8;

export function CandidateList({
  result,
  recordedJd,
  subjectId,
  eventCount,
  today,
  localTime,
}: {
  result: RectificationResult;
  recordedJd: number;
  subjectId: string;
  eventCount: number;
  today: string;
  /**
   * The wall clock at the *birthplace*, not in the reader's zone. A rectified
   * time is only meaningful against the clock that was on the wall in the room.
   */
  localTime: (jd: number) => string;
}): React.ReactElement {
  const top = result.candidates.slice(0, SHOWN);
  const best = top[0]?.rawScore ?? 0;
  const discriminating = result.ruleDiscrimination.filter((r) => r.discriminating);
  const inert = result.ruleDiscrimination.filter((r) => !r.discriminating && r.firedFor > 0);

  // Separation is the honest headline. When the evidence cannot tell the
  // window apart, that fact outranks the ranking.
  const weak = result.separation < 0.05;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
        <div className="bg-[var(--surface)] px-4 py-3">
          <span className="block font-mono text-xl font-medium">{result.candidatesConsidered}</span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Times tested
          </span>
        </div>
        <div className="bg-[var(--surface)] px-4 py-3">
          <span className="block font-mono text-xl font-medium">
            {result.ascendantSigns.length}
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Ascendant signs in range
          </span>
        </div>
        <div className="bg-[var(--surface)] px-4 py-3">
          <span
            className="block font-mono text-xl font-medium"
            style={{ color: weak ? 'var(--clay)' : 'var(--jade)' }}
          >
            {Math.round(result.separation * 100)}%
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Best above median
          </span>
        </div>
      </div>

      {weak ? (
        <p className="border-l-2 border-[var(--clay)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed">
          <strong>These events barely separate this window.</strong> The best candidate scores
          almost the same as the middle one, which means the evidence supplied does not distinguish
          these times — not that the top of the list is right by a narrow margin. Add more events,
          or events dated more precisely, before trusting the order.
        </p>
      ) : null}

      <ol className="flex flex-col gap-2">
        {top.map((candidate, index) => {
          const share = best === 0 ? 0 : candidate.rawScore / best;
          const isRecorded = Math.abs(candidate.jdUt - recordedJd) < 1 / 1440;
          return (
            <li
              key={candidate.jdUt}
              data-candidate={index}
              className="jade-panel p-4"
              style={{ '--i': index } as React.CSSProperties}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {localTime(candidate.jdUt)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {candidate.ascendantSign} rising · Moon in {candidate.moonNakshatra}
                </span>
                {isRecorded ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)]">
                    the time on record
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                  {Math.round(candidate.score * 100)}% of maximum
                </span>
              </div>

              {/* The bar is relative to the best candidate, not to the ceiling,
                  because what a reader wants to see is the gap between first
                  and second — that gap is the whole question. */}
              <div className="mt-2 h-1.5 w-full bg-[var(--track,#E6E8E3)]">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${Math.max(2, share * 100)}%` }}
                />
              </div>

              <ul className="mt-3 flex flex-col gap-1.5">
                {candidate.perEvent
                  .filter((event) => event.hits.length > 0)
                  .map((event) => {
                    const definition = LIFE_EVENTS.find((d) => d.kind === event.kind);
                    return (
                      <li key={event.kind}>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
                          {definition?.label ?? event.kind}
                        </p>
                        <ul className="mt-0.5 flex flex-col gap-0.5">
                          {event.hits.map((hit, hitIndex) => (
                            <li
                              key={`${hit.rule}-${hit.house}-${hitIndex}`}
                              className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-[var(--rule)] pl-2 text-[12px] leading-snug"
                            >
                              <span className="text-[var(--ink)]">{hit.label}</span>
                              <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                                {hit.factors.join(' · ')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                {candidate.perEvent.every((event) => event.hits.length === 0) ? (
                  <li className="text-[12px] italic text-[var(--ink-muted)]">
                    No rule fired for this candidate. It is listed because it is inside the window,
                    not because anything supports it.
                  </li>
                ) : null}
              </ul>

              <form action={adoptRectifiedTime} className="mt-3">
                <input type="hidden" name="subjectId" value={subjectId} />
                <input type="hidden" name="localTime" value={localTime(candidate.jdUt)} />
                <input type="hidden" name="eventCount" value={String(eventCount)} />
                <input type="hidden" name="today" value={today} />
                <button
                  type="submit"
                  className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2 hover:opacity-70"
                >
                  Adopt {localTime(candidate.jdUt)} as the birth time →
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      {/* ------------------------------------------------- what actually ranked */}
      <div className="border border-[var(--rule)] bg-[var(--surface)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          What did the ranking
        </p>
        <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          A rule that fires for every candidate in the window contributed equally to every score and
          therefore separated nothing, however classical it is. Those are listed second, in grey, so
          the ranking above can be read for what it is.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--jade)]">
              Discriminated
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {discriminating.length === 0 ? (
                <li className="text-[12px] italic text-[var(--ink-muted)]">
                  Nothing separated these candidates.
                </li>
              ) : (
                discriminating.map((r) => (
                  <li key={r.rule} className="flex justify-between gap-2 text-[12px]">
                    <span>{r.label}</span>
                    <span className="font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                      {Math.round(r.firedFor * 100)}%
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--ink-faint)]">
              Fired for everything — ranked nothing
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {inert.length === 0 ? (
                <li className="text-[12px] italic text-[var(--ink-muted)]">None.</li>
              ) : (
                inert.map((r) => (
                  <li
                    key={r.rule}
                    className="flex justify-between gap-2 text-[12px] text-[var(--ink-faint)]"
                  >
                    <span>{r.label}</span>
                    <span className="font-mono text-[10px] tabular-nums">
                      {Math.round(r.firedFor * 100)}%
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
