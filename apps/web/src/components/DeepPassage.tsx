import Link from 'next/link';
import type { DeepNatalReading, DeepTransitReading } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * One deep reading — a graha, read in five voices.
 *
 * ## The layout is the argument
 *
 * The configuration appears once, in the heading, and never again. Everything
 * below it is interpretation. That is enforced in the composer and in
 * `traditions.test.ts`, and it is the reason this component can afford to put
 * five traditions on one screen: five columns that each began by restating the
 * placement would be four-fifths padding.
 *
 * The interpretation comes first inside each voice and the doctrine second, in
 * smaller type. Somebody reading top to bottom gets five interpretations in a
 * row; somebody who wants to know *why* a tradition says that reads the line
 * underneath. The old arrangement — doctrine first, meaning last — made every
 * column open with a paragraph about ancient temperament theory before saying
 * anything about the person.
 *
 * The chart rows sit behind a disclosure at the bottom (`Workings`), which is
 * how CLAUDE.md #5 is satisfied without a paragraph being interrupted by
 * `12°34′ Virgo` every second sentence.
 */
export function DeepPassage({
  reading,
  hrefForTradition,
}: {
  readonly reading: DeepNatalReading | DeepTransitReading;
  /**
   * Where to send somebody who wants to know who these people were.
   *
   * Passed in rather than built here because the reading answers on two hosts
   * and `/learn/...` means different things on each — on `read.jadeapp.co` the
   * middleware rewrites anything outside `/read` into the reading group, so a
   * bare link would 404. The page knows its own host; this component does not
   * and should not.
   */
  readonly hrefForTradition?: ((id: string) => string) | undefined;
}): React.ReactElement {
  const question = 'question' in reading ? reading.question : null;

  return (
    <article className="border border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          {reading.graha}
        </p>
        <h2 className="mt-0.5 font-display text-[1.7rem] leading-tight">{reading.heading}</h2>
        {/* The question somebody actually arrives with. Not a restatement — the
            heading says where, this says why anyone cares where. */}
        <p className="mt-1 text-[13.5px] italic leading-relaxed text-[var(--ink-muted)]">
          {reading.asks}
        </p>
      </header>

      <div className="mt-3 flex flex-col gap-2.5">
        {reading.body.map((paragraph, index) => (
          <p key={index} className="text-[15.5px] leading-[1.6]">
            {paragraph}
          </p>
        ))}
      </div>

      {question ? (
        <p className="mt-3.5 border-l-2 border-[var(--accent)] py-1 pl-3 text-[15px] leading-relaxed">
          {question}
        </p>
      ) : null}

      {reading.voices.length > 0 ? (
        <section className="mt-4">
          <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            {reading.voices.length} traditions
          </h3>
          {/*
            Bordered cells rather than a one-pixel grid gap over a ruled
            background. Five voices in a three-column grid leave one cell empty,
            and with the gap technique that empty cell renders as a grey block —
            a sixth tradition that is not there.
          */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {reading.voices.map((voice) => (
              <div
                key={voice.tradition.id}
                className="border border-[var(--rule)] bg-[var(--surface)] px-3.5 py-3"
              >
                {hrefForTradition ? (
                  <Link
                    href={hrefForTradition(voice.tradition.id)}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent)]"
                  >
                    {voice.tradition.name}
                  </Link>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
                    {voice.tradition.name}
                  </p>
                )}
                <p className="mt-1.5 text-[14px] leading-[1.55]">{voice.now}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                  {voice.doctrine}
                </p>
                <p className="mt-1.5 font-mono text-[10px] text-[var(--ink-faint)]">
                  {voice.source}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/*
        Only where they genuinely disagree. `differ` is usually absent, and that
        is deliberate — a "where they differ" box that always has something in
        it is a box that is inventing disagreements.
      */}
      {reading.differ ? (
        <p className="mt-3 border border-dashed border-[var(--rule-strong)] px-3 py-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
            where they part ways —{' '}
          </span>
          {reading.differ}
        </p>
      ) : null}

      <Workings workings={reading.workings} />
    </article>
  );
}
