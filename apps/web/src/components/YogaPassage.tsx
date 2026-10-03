import type { YogaFamilyReading } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * One family of combinations.
 *
 * The cancellation badge is the point of the component. A yoga shown without
 * the condition the texts give for cancelling it is the difference between a
 * frightening reading and an ordinary chart, and the prose says so — but a
 * reader scanning headings needs it before they read a word, which is what the
 * badge is for.
 */
export function YogaPassage({
  family,
}: {
  readonly family: YogaFamilyReading;
}): React.ReactElement {
  return (
    <article
      className={`bg-[var(--surface)] px-4 py-4 sm:px-5 ${
        family.allCancelled
          ? 'border border-dashed border-[var(--rule-strong)]'
          : 'border border-[var(--rule)]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-[1.45rem] leading-tight">{family.title}</h3>
        {family.allCancelled ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
            formed and cancelled
          </p>
        ) : null}
      </div>

      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
        {family.hits.map((hit) => `${hit.name} (${hit.plain})`).join(' · ')}
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {family.body.map((paragraph, index) => (
          <p key={index} className="max-w-[72ch] text-[15.5px] leading-[1.6]">
            {paragraph}
          </p>
        ))}
      </div>

      <Workings workings={family.workings} />
    </article>
  );
}
