import type { AreaReading } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * One area of life, read.
 *
 * ## Why this is not a grid of twelve equal cards
 *
 * Twelve equal cards is a dashboard, and a dashboard invites the reader to
 * compare its cells — which is the one thing this data cannot support, because
 * there is no quantity here that ranks one part of a life against another.
 * Areas are therefore a single column in the order somebody asks about them,
 * and a live one is marked rather than scored.
 *
 * ## The question is above the answer
 *
 * `asks` is the sentence a person actually arrives with. Putting it in the
 * heading position does two things: it tells them whether to read on, and it
 * keeps the reading honest by naming what it is answering before it answers.
 */
export function AreaCard({ area }: { readonly area: AreaReading }): React.ReactElement {
  const live = area.liveNow !== null;

  return (
    <article
      className={`bg-[var(--surface)] px-4 py-4 max-sm:border-l-2 sm:border sm:px-5 ${
        live
          ? 'border-[var(--accent)] sm:border-2'
          : 'border-[var(--rule)] max-sm:border-l-[var(--rule-strong)]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          House {area.place}
        </p>
        {live ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
            live now
          </p>
        ) : null}
      </div>

      {/*
        Hidden on a phone, where the fold's own row has just said both. On a
        desktop there is no fold and this is the card's heading.
      */}
      <div className="hidden sm:block">
        <h3 className="mt-0.5 font-display text-[1.6rem] leading-[1.15]">{area.title}</h3>
        <p className="mt-1 max-w-[62ch] text-[14px] italic leading-snug text-[var(--ink-muted)]">
          {area.asks}
        </p>
      </div>

      {area.liveNow ? (
        <p className="mt-3 border-l-2 border-[var(--accent)] py-1 pl-3 text-[15px] leading-[1.55]">
          {area.liveNow}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2.5">
        {area.body.map((paragraph, index) => (
          <p key={index} className="max-w-[72ch] text-[15.5px] leading-[1.6]">
            {paragraph}
          </p>
        ))}
      </div>

      {/*
        The weather, marked as weather.
        Everything above is true for a lifetime and this is true for months, so
        it is set apart rather than appended — a reader who cannot tell the two
        apart has been misled by the layout rather than by the sentences.
      */}
      {area.crossing ? (
        <div className="mt-3 border-t border-dashed border-[var(--rule)] pt-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            crossing it now
          </p>
          <p className="mt-1 max-w-[72ch] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
            {area.crossing}
          </p>
        </div>
      ) : null}

      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-[var(--ink-faint)]">
        {area.governs}
      </p>
      <Workings workings={area.workings} />
    </article>
  );
}
