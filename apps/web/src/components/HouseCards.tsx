import Link from 'next/link';
import type { HouseReading } from '@jade/interpret';
import { AutoTerms, Scope, T } from './Glossary';

/**
 * The twelve houses, one card each.
 *
 * ## Written for somebody learning
 *
 * Nalu's request was two things at once: make the houses easier to see, and say
 * what each one means for the person whose chart it is. Those pull in opposite
 * directions — the first wants less on screen and the second wants more — so the
 * card is ordered by how a house is actually read, and the teaching text sits
 * under the reading rather than above it:
 *
 *   1. the sign and its lord, and where that lord went
 *   2. what occupies the house
 *   3. what aspects it
 *   4. the assembled reading, each line carrying its own factors
 *   5. what the house means in general — last, because by the time you reach it
 *      you already know what it means *here*
 *
 * ## Every claim shows its working
 *
 * The factors print beside each statement, not behind a disclosure, and the
 * classical citation prints with them where the statement rests on a rule rather
 * than on arithmetic (CLAUDE.md #5). That is the thing no other program does: a
 * reader can disagree with Jade and see exactly what to disagree with.
 */

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** The chip row: twelve ways in, and a count of what is in each. */
export function HouseChips({
  readings,
  active,
  hrefFor,
}: {
  readonly readings: readonly HouseReading[];
  readonly active: number | null;
  readonly hrefFor: (house: number | null) => string;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href={hrefFor(null)}
        aria-current={active === null ? 'true' : undefined}
        className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
          active === null
            ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]'
            : 'border-[var(--rule)] text-[var(--ink-muted)] hover:border-[var(--accent)]'
        }`}
      >
        All twelve
      </Link>
      {readings.map((reading) => (
        <Link
          key={reading.house}
          href={hrefFor(reading.house)}
          aria-current={active === reading.house ? 'true' : undefined}
          title={`${ORDINALS[reading.house - 1]} — ${reading.signification.title}`}
          className={`flex min-w-[2.6rem] flex-col items-center border px-1.5 py-1 ${
            active === reading.house
              ? 'border-[var(--accent)] bg-[var(--accent-wash)]'
              : 'border-[var(--rule)] hover:border-[var(--accent)]'
          }`}
        >
          <span className="font-display text-base leading-none">{reading.house}</span>
          {/* Counts on everything: a closed thing that does not say what is
              inside gets opened repeatedly or never. */}
          <span className="font-mono text-[9px] leading-tight text-[var(--ink-faint)]">
            {reading.occupants.length > 0 ? `${reading.occupants.length}◆` : '—'}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function HouseCard({
  reading,
  compareHref,
}: {
  readonly reading: HouseReading;
  /** Where to compare this house across the book, when there is anyone to compare with. */
  readonly compareHref?: string;
}): React.ReactElement {
  const sig = reading.signification;
  const ordinal = ORDINALS[reading.house - 1]!;

  return (
    /* Scoped to this house, so a term hovered inside the card answers about
       this house rather than about the chart as a whole. */
    <Scope of={`house:${reading.house}`}>
      <article className="border border-[var(--rule)] bg-[var(--surface)]">
        {/* ------------------------------------------------------------ head */}
        <header className="border-b border-[var(--rule)] p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-4xl leading-none text-[var(--accent)]">
              {reading.house}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl leading-tight">
                <T id={`house-${reading.house}`} plainTrigger>
                  {sig.title}
                </T>
              </h3>
              <p className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                {sig.sanskrit} · {ordinal} <T id="bhava">bhāva</T>
              </p>
            </div>
            {compareHref ? (
              <Link
                href={compareHref}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
              >
                compare →
              </Link>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {reading.labels.map((label) => (
              <span
                key={label}
                className="border border-[var(--rule)] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--ink-muted)]"
              >
                <AutoTerms>{label}</AutoTerms>
              </span>
            ))}
          </div>
        </header>

        {/* -------------------------------------------------- sign and lord */}
        <div className="grid gap-px bg-[var(--rule)] sm:grid-cols-3">
          <div className="bg-[var(--surface)] p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Sign on the house
            </p>
            <p className="mt-0.5 font-display text-lg leading-none">
              <T id={`sign-${reading.sign.toLowerCase()}`} plainTrigger>
                {reading.sign}
              </T>
            </p>
          </div>
          <div className="bg-[var(--surface)] p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Its lord
            </p>
            <p className="mt-0.5 font-display text-lg leading-none">
              <T id={`graha-${reading.lord.lord.toLowerCase()}`} plainTrigger>
                {reading.lord.lord}
              </T>
              {reading.lord.retrograde ? (
                <T id="retrograde" plainTrigger>
                  <span className="text-[var(--clay)]"> ℞</span>
                </T>
              ) : null}
            </p>
          </div>
          <div className="bg-[var(--surface)] p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Which went to the
            </p>
            <p
              className={`mt-0.5 font-display text-lg leading-none ${
                reading.lord.ownHouse ? 'text-[var(--jade)]' : ''
              }`}
            >
              {ORDINALS[reading.lord.inHouse - 1]}
              {reading.lord.ownHouse ? ' · its own' : ''}
            </p>
            <p className="font-mono text-[10px] text-[var(--ink-faint)]">
              {degrees(reading.lord.degreesInSign)} {reading.lord.inSign}
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------- contents */}
        <div className="grid gap-px border-t border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              In the house ({reading.occupants.length})
            </p>
            {reading.occupants.length === 0 ? (
              /* An empty state that says what it means, not just that it is
                 empty — eight of twelve houses usually are. */
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                Empty. Read it through its lord, above.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {reading.occupants.map((occupant) => (
                  <li key={occupant.graha} className="text-[13.5px] leading-snug">
                    <T id={`graha-${occupant.graha.toLowerCase()}`} plainTrigger>
                      {occupant.graha}
                    </T>{' '}
                    <span className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                      {degrees(occupant.degreesInSign)}
                    </span>
                    {occupant.dignity ? (
                      <T id="dignity" plainTrigger>
                        <span
                          className={`ml-1.5 font-mono text-[10px] uppercase tracking-wider ${
                            occupant.dignity === 'exalted' ||
                            occupant.dignity === 'own' ||
                            occupant.dignity === 'moolatrikona'
                              ? 'text-[var(--jade)]'
                              : occupant.dignity === 'debilitated'
                                ? 'text-[var(--clay)]'
                                : 'text-[var(--ink-faint)]'
                          }`}
                        >
                          {occupant.dignity.replace('_', ' ')}
                        </span>
                      </T>
                    ) : null}
                    {occupant.retrograde ? <span className="text-[var(--clay)]"> ℞</span> : null}
                    {occupant.ownHouse ? (
                      <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[var(--jade)]">
                        own house
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-[var(--surface)] p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              <T id="drishti">Aspecting</T> it ({reading.aspects.length})
            </p>
            {reading.aspects.length === 0 ? (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                Nothing aspects it.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {reading.aspects.map((aspect) => (
                  <li
                    key={`${aspect.graha}-${aspect.distance}`}
                    className="text-[13.5px] leading-snug"
                  >
                    <T id={`graha-${aspect.graha.toLowerCase()}`} plainTrigger>
                      {aspect.graha}
                    </T>
                    <span className="ml-1.5 font-mono text-[10.5px] text-[var(--ink-faint)]">
                      by its {ORDINALS[aspect.distance - 1]}
                      {aspect.special ? ' · special' : ''}
                      {aspect.strength < 1 ? ` · ${aspect.strength} strength` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-[var(--ink-faint)]">
              Kāraka: {reading.karaka.graha}
              {reading.karaka.inHouse ? `, in the ${ORDINALS[reading.karaka.inHouse - 1]}` : ''}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------ the reading */}
        <section className="border-t border-[var(--rule)] p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            What that comes to
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {reading.statements.map((statement, index) => (
              <li
                key={`${index}-${statement.text.slice(0, 24)}`}
                className="border-l-2 border-[var(--accent-soft)] pl-3"
              >
                <p className="text-[14px] leading-relaxed">
                  <AutoTerms>{statement.text}</AutoTerms>
                </p>
                <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
                  {statement.factors.map((factor, i) => (
                    <span key={`${factor.kind}-${i}`}>
                      {i > 0 ? ' · ' : ''}
                      {factor.kind}: {factor.detail}
                    </span>
                  ))}
                </p>
                {/* The citation, so a reader can go and check the rule rather
                    than take Jade's word for it. */}
                {statement.source ? (
                  <p className="mt-0.5 font-mono text-[10px] italic text-[var(--ink-faint)]">
                    {statement.source}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* ----------------------------------------------- what it means at all */}
        <details className="border-t border-[var(--rule)]">
          <summary className="cursor-pointer p-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--accent)]">
            What the {ordinal} means in any chart ({sig.keywords.length} significations)
          </summary>
          <div className="px-4 pb-4">
            <p className="text-[13px] leading-relaxed text-[var(--ink-muted)]">
              {sig.keywords.join(' · ')}
            </p>
            {sig.body.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="mt-2 text-[14px] leading-relaxed">
                <AutoTerms>{paragraph}</AutoTerms>
              </p>
            ))}
            <p className="mt-2 font-mono text-[10px] italic text-[var(--ink-faint)]">
              {sig.source}
            </p>
          </div>
        </details>
      </article>
    </Scope>
  );
}
