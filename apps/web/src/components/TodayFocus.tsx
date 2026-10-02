import Link from 'next/link';
import type { DayFocus, FocusScale } from '@jade/interpret';

/**
 * The answer, above the evidence.
 *
 * ## Why a strip rather than a card
 *
 * Somebody opening the app in the morning wants one sentence, and the daily
 * reading underneath is the working for it. So this is deliberately not a
 * panel with its own weight — it is a line, three clocks, and a way into the
 * area it points at.
 *
 * ## Three clocks, named as clocks
 *
 * Labelling the rows "today / this season / this period" instead of "Moon /
 * Saturn / daśā" is the entire usability difference. The grahas are still
 * named in the row, because the claim has to stay checkable, but the thing a
 * reader needs first is *how long this lasts* — and that is what tells them
 * whether a disagreement between rows is a contradiction (it is not) or two
 * different sizes of statement.
 */
const SCALE_LABEL: Record<FocusScale, string> = {
  today: 'today',
  season: 'this season',
  period: 'this period',
};

const SCALE_ORDER: readonly FocusScale[] = ['today', 'season', 'period'];

export function TodayFocus({
  focus,
  live,
  areasHref,
}: {
  readonly focus: DayFocus;
  readonly live: number | null;
  /** `/read/:id?view=areas`, without the fragment. */
  readonly areasHref: string;
}): React.ReactElement | null {
  if (focus.focuses.length === 0) return null;

  const rows = SCALE_ORDER.flatMap((scale) => {
    const matching = focus.focuses.filter((one) => one.scale === scale);
    return matching.length === 0 ? [] : [{ scale, matching }];
  });

  return (
    <div className="border-2 border-[var(--accent)] bg-[var(--surface)] px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
        {focus.agreement
          ? focus.agreement.scales.length === 3
            ? 'All three clocks agree'
            : 'Two clocks agree'
          : 'Where the sky is pointed'}
      </p>

      {focus.agreement ? (
        <h3 className="mt-1 font-display text-[1.55rem] leading-[1.15] sm:text-[1.9rem] sm:leading-[1.12]">
          {focus.agreement.scales.length === 3 ? 'All three' : 'Two'} timescales land on{' '}
          {focus.agreement.topic}.
        </h3>
      ) : (
        <h3 className="mt-1 font-display text-[1.55rem] leading-[1.15] sm:text-[1.9rem] sm:leading-[1.12]">
          Today sits on {focus.focuses.find((one) => one.scale === 'today')?.topic}.
        </h3>
      )}

      <dl className="mt-3 flex flex-col gap-2.5 sm:gap-1.5">
        {rows.map(({ scale, matching }) => (
          <div key={scale} className="sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-2">
            {/*
              Stacked on a phone, side by side from `sm`.

              Inline, the period row ran to three links with a graha name after
              each, and the label, the links and the attributions all wrapped
              into each other until none of them could be read. A clock label
              on its own line costs one line and makes the row scannable.
            */}
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)] sm:min-w-[6.5rem]">
              {SCALE_LABEL[scale]}
            </dt>
            <dd className="text-[14.5px] leading-relaxed sm:leading-snug">
              {matching.map((one, index) => (
                <span key={`${one.by}-${one.place}`}>
                  {index > 0 ? <span className="text-[var(--ink-faint)]"> · </span> : null}
                  <Link
                    href={`${areasHref}#area-${one.place}`}
                    className="underline decoration-[var(--rule-strong)] decoration-dotted underline-offset-4 hover:decoration-[var(--accent)]"
                  >
                    {one.topic}
                  </Link>
                  <span className="ml-1.5 font-mono text-[10.5px] text-[var(--ink-faint)]">
                    {one.by}
                  </span>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      {live !== null ? (
        <Link
          href={`${areasHref}#area-${live}`}
          className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
        >
          read this area in full →
        </Link>
      ) : null}
    </div>
  );
}
