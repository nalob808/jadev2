import Link from 'next/link';
import { PrintButton } from './PrintButton';

/**
 * The chrome around a printable report.
 *
 * Deliberately not the app `Shell`. A report is a document rather than a
 * screen: it has a masthead instead of navigation, it states the frame it was
 * computed in on the page rather than in a settings panel somewhere else, and
 * it carries a footer that survives being printed and handed to someone who
 * has never heard of Jade.
 *
 * There is no server-side PDF renderer behind this, and that is a decision
 * rather than a shortcut. Generating PDFs on the server means running a
 * headless browser, which does not fit in a Vercel function and would mean
 * standing up and paying for the worker before anyone has printed anything.
 * The browser attached to the practitioner already has an excellent PDF
 * writer in it. What was actually missing was a print stylesheet and pages
 * laid out to be printed — which is what this is.
 */

export interface ReportMeta {
  /** "Lahiri ayanāṁśa · mean nodes · whole sign houses" — never hidden. */
  readonly lens: string;
  /** When the report was produced, already formatted in the reader's zone. */
  readonly generated: string;
  /** Where to go back to on screen. Removed from the printed page. */
  readonly backHref: string;
  readonly backLabel: string;
}

export function ReportShell({
  kicker,
  title,
  subtitle,
  meta,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  meta: ReportMeta;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-7 sm:px-8">
      {/* On screen only: how to get back, and how to print. */}
      <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-3">
        <Link
          href={meta.backHref}
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
        >
          ← {meta.backLabel}
        </Link>
        <PrintButton />
      </div>

      <header className="mb-6 border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-xl font-semibold tracking-[0.2em] text-[var(--ink)]">
            JADE
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            {kicker}
          </span>
          <span className="ml-auto font-mono text-[9px] tracking-wide text-[var(--ink-faint)]">
            {meta.generated}
          </span>
        </div>
        <h1 className="mt-2 font-display text-[2.4rem] font-semibold leading-[1.05]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">{subtitle}</p>
        ) : null}
        {/*
          Constitution item 3, on the page rather than behind a settings link.
          A printed chart that does not say which ayanāṁśa produced it cannot
          be checked by the person holding it.
        */}
        <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {meta.lens}
        </p>
      </header>

      {children}

      <footer className="mt-10 border-t border-[var(--rule-strong)] pt-3 font-mono text-[9px] leading-relaxed tracking-wide text-[var(--ink-faint)]">
        Computed by Jade · jadeapp.co · Every interpretive sentence in this report is composed from
        the placements printed beside it. Positions are computed at interactive precision; for a
        date you intend to act on, check it against a reference ephemeris.
      </footer>
    </div>
  );
}

/**
 * A titled block inside a report.
 *
 * `break-inside: avoid` in the print stylesheet applies to `section`, so this
 * being a section is load-bearing rather than semantic tidiness — it is what
 * stops a heading printing at the foot of one page and its table at the top of
 * the next.
 */
export function ReportSection({
  title,
  note,
  breakBefore = false,
  children,
}: {
  title: string;
  note?: string;
  /** Start this section on a fresh sheet. For the big set pieces. */
  breakBefore?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className={`mt-7 ${breakBefore ? 'print-break-before' : ''}`}>
      <div className="mb-3 border-b border-[var(--rule-strong)] pb-1.5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {note ? (
          <p className="mt-0.5 max-w-[74ch] text-[12px] leading-snug text-[var(--ink-muted)]">
            {note}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
