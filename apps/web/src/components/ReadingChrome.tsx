import Link from 'next/link';
import type { PlainParagraph } from '@jade/interpret';
import { Workings } from './Workings';

/**
 * The furniture of the reading surface.
 *
 * ## The critique this answers
 *
 * The first cut was a single column of paragraphs with disclosure toggles —
 * an article, not an application. Nalu's word for it was "blog", and he was
 * right. The difference between the two is not decoration: an article is read
 * top to bottom once, and an instrument is *scanned*, returned to, and operated.
 *
 * So four things change here. The facts a reader checks constantly — rising
 * sign, Moon, running period — move into a fixed strip instead of being buried
 * in prose. The reading splits into named sections reachable in one tap rather
 * than one scroll. Prose sits inside cards with their data printed compactly
 * beside them, so a glance gets the placement and a read gets the meaning. And
 * the type tightens: 15px at 1.55, not 17 at 1.65, because scanning wants
 * density and reading wants air, and this surface does both.
 */

/** One fact in the snapshot strip. */
export interface SnapshotFact {
  readonly label: string;
  readonly value: string;
  /** The smaller line under the value. */
  readonly detail?: string;
  readonly tone?: 'default' | 'accent' | 'jade' | 'clay';
}

const TONE: Record<string, string> = {
  default: 'text-[var(--ink)]',
  accent: 'text-[var(--accent)]',
  jade: 'text-[var(--jade)]',
  clay: 'text-[var(--clay)]',
};

/**
 * The facts a reader checks over and over, kept where they can be checked.
 *
 * Deliberately a hairline grid rather than a row of rounded cards: these are
 * readings off an instrument, and a card apiece would make five separate
 * objects out of one panel.
 */
export function SnapshotStrip({
  facts,
}: {
  readonly facts: readonly SnapshotFact[];
}): React.ReactElement {
  return (
    <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-[var(--surface)] px-3 py-2.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            {fact.label}
          </p>
          <p className={`mt-0.5 font-display text-xl leading-none ${TONE[fact.tone ?? 'default']}`}>
            {fact.value}
          </p>
          {fact.detail ? (
            <p className="mt-0.5 font-mono text-[10px] leading-tight text-[var(--ink-faint)]">
              {fact.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export interface ReadingView {
  readonly key: string;
  readonly label: string;
  /** Shown beside the label, so a closed section still says what is in it. */
  readonly count?: number;
}

/**
 * The section switcher.
 *
 * Real links rather than client-side tabs, because the view belongs in the URL
 * for the same reasons the wheel's selection does: reload keeps it, back walks
 * it, and a link carries it. It also means no JavaScript is needed to operate
 * the page at all.
 */
export function ViewNav({
  views,
  active,
  hrefFor,
}: {
  readonly views: readonly ReadingView[];
  readonly active: string;
  readonly hrefFor: (key: string) => string;
}): React.ReactElement {
  return (
    <nav
      aria-label="Reading sections"
      className="flex gap-px overflow-x-auto border border-[var(--rule)] bg-[var(--rule)]"
    >
      {views.map((view) => {
        const current = view.key === active;
        return (
          <Link
            key={view.key}
            href={hrefFor(view.key)}
            aria-current={current ? 'page' : undefined}
            className={`flex-1 whitespace-nowrap px-4 py-2.5 text-center transition-colors ${
              current
                ? 'bg-[var(--accent)] text-[var(--paper)]'
                : 'bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--accent)]'
            }`}
          >
            <span className="font-display text-base leading-none">{view.label}</span>
            {view.count !== undefined ? (
              <span
                className={`ml-1.5 font-mono text-[10px] ${
                  current ? 'text-[var(--paper)] opacity-75' : 'text-[var(--ink-faint)]'
                }`}
              >
                {view.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** A compact label/value pair for the data line inside a card. */
export interface CardDatum {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'jade' | 'clay';
}

/**
 * The unit the whole surface is built from.
 *
 * Every card has the same three zones in the same order: what this is, the
 * numbers, then the reading. Consistency is the point — once a reader learns
 * one card they can operate all of them, which is exactly what an article
 * cannot offer.
 */
export function ReadingCard({
  eyebrow,
  title,
  subtitle,
  data = [],
  paragraphs,
  footer,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly data?: readonly CardDatum[];
  readonly paragraphs: readonly PlainParagraph[];
  readonly footer?: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="flex flex-col border border-[var(--rule)] bg-[var(--surface)]">
      <header className="border-b border-[var(--rule)] px-4 py-3">
        {eyebrow ? (
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-0.5 font-display text-2xl leading-tight">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] italic leading-snug text-[var(--ink-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>

      {data.length > 0 ? (
        /* The numbers, printed compactly beside the reading rather than inside
           it. A glance gets the placement; a read gets the meaning. */
        <dl className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--rule)] bg-[var(--surface-alt)] px-4 py-2">
          {data.map((datum) => (
            <div key={datum.label} className="min-w-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {datum.label}
              </dt>
              <dd
                className={`font-mono text-[12px] ${
                  datum.tone === 'jade'
                    ? 'text-[var(--jade)]'
                    : datum.tone === 'clay'
                      ? 'text-[var(--clay)]'
                      : 'text-[var(--ink)]'
                }`}
              >
                {datum.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        {paragraphs.map((paragraph, index) => (
          <div key={`${index}-${paragraph.text.slice(0, 24)}`}>
            <p className="text-[15px] leading-[1.55]">{paragraph.text}</p>
            <Workings workings={paragraph.workings} source={paragraph.source} />
          </div>
        ))}
      </div>

      {footer ? (
        <footer className="border-t border-[var(--rule)] px-4 py-2">{footer}</footer>
      ) : null}
    </article>
  );
}

/**
 * How far through a period you are.
 *
 * A daśā is years long and "you are in a Saturn period" is far less useful than
 * "you are two thirds through it". Rendered as a plain bar with the numbers
 * beside it rather than as a percentage alone, because the dates are the part a
 * practitioner writes down.
 */
export function PeriodBar({
  elapsed,
  from,
  to,
  remaining,
}: {
  readonly elapsed: number;
  readonly from: string;
  readonly to: string;
  readonly remaining: string;
}): React.ReactElement {
  const pct = Math.round(Math.min(Math.max(elapsed, 0), 1) * 100);
  return (
    <div>
      <div
        className="h-1.5 w-full bg-[var(--surface-alt)]"
        role="img"
        aria-label={`${pct}% through this period, ${remaining} remaining`}
      >
        <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 font-mono text-[10px] text-[var(--ink-faint)]">
        <span>{from}</span>
        <span>{remaining} left</span>
        <span>{to}</span>
      </div>
    </div>
  );
}
