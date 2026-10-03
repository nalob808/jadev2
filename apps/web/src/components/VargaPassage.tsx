import type { VargaReading } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * One divisional chart, read.
 *
 * Deliberately plain: the division's own name in mono beside a plain-language
 * heading, because a reader who does not know what a Daśāṁśa is needs the
 * second and a practitioner wants the first, and neither should have to look
 * for theirs.
 */
export function VargaPassage({ reading }: { readonly reading: VargaReading }): React.ReactElement {
  return (
    <article className="border border-[var(--rule)] bg-[var(--surface)] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          {reading.vargaId} · {reading.name}
        </p>
      </div>
      <h3 className="mt-0.5 font-display text-[1.5rem] leading-[1.15]">
        {reading.topic.charAt(0).toUpperCase() + reading.topic.slice(1)}
      </h3>
      <p className="mt-1 max-w-[62ch] text-[14px] italic leading-snug text-[var(--ink-muted)]">
        {reading.asks}
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {reading.body.map((paragraph, index) => (
          <p key={index} className="max-w-[72ch] text-[15.5px] leading-[1.6]">
            {paragraph}
          </p>
        ))}
      </div>

      <Workings workings={reading.workings} />
    </article>
  );
}
