import Link from 'next/link';
import { devSignOut } from '@/app/actions';
import { LensTabs, PrimaryLinks, SectionRow } from './AppNav';
import { AutoTerms } from './Glossary';

/**
 * The masthead and navigation.
 *
 * Split out of `Shell` so `loading.tsx` can render exactly the same chrome.
 * Without that, every navigation blanks the header for as long as the server
 * takes, and the page appears to rebuild itself from nothing rather than
 * filling in one region.
 *
 * What is in the rows, and why they are rows rather than one list, is in
 * `lib/nav.ts`. This component only lays them out: five words and the account
 * corner on the first line, the current section's parts on the second.
 */
export function Nav({ email }: { email?: string | undefined }): React.ReactElement {
  return (
    <header className="mb-7">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-1">
        <Link
          href="/home"
          className="font-display text-2xl font-semibold tracking-[0.22em] text-[var(--ink)]"
        >
          JADE
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          sidereal practice
        </span>

        <PrimaryLinks />

        {/*
          The account corner, outside the five.

          Settings used to be the tenth item in the menu, which spent a tenth of
          the masthead on somewhere you go twice a year. Here it is reachable in
          one click and costs the working words nothing.
        */}
        <div className="flex items-baseline gap-2 border-l border-[var(--rule)] pl-3">
          <Link
            href="/settings"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
          >
            Settings
          </Link>
          {email ? (
            <form action={devSignOut}>
              <button
                type="submit"
                title={email}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <SectionRow />

      {/* The one ambient thing in the app — see .jade-ecliptic in globals.css. */}
      <div className="jade-ecliptic mt-3" aria-hidden="true" />
    </header>
  );
}

/**
 * Who you are looking at, and the ways of looking at them.
 *
 * This is the piece that makes the app feel like one thing. Every surface that
 * is about a single person renders it, so the name, the birth data the chart
 * was cast from, and the seven lenses are in the same place on the sheet, the
 * houses, the instrument, the reading and that person's timing — and moving
 * between them is one click from anywhere rather than a trip back to the
 * person page.
 *
 * The birth line is here rather than on each page for a second reason: a
 * degree is only meaningful given the moment it was cast for, and a screen
 * showing positions with the birth data scrolled off the top invites someone to
 * read the wrong chart.
 */
export function SubjectBar({
  id,
  name,
  kicker,
  line,
  actions,
}: {
  id: string;
  name: string;
  kicker?: string | undefined;
  line?: string | undefined;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="jade-rise mb-6 border-b border-[var(--rule)] pb-3">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div>
          {kicker ? <Kicker>{kicker}</Kicker> : null}
          <h1 className="font-display text-[2.1rem] font-semibold leading-[1.1] tracking-[-0.01em]">
            {name}
          </h1>
          {line ? (
            <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">{line}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      <div className="mt-3">
        <LensTabs id={id} />
      </div>
    </div>
  );
}

/**
 * How wide the page is allowed to get.
 *
 * `reading` is the default and the right answer nearly everywhere: prose and
 * forms stop being readable long before they stop fitting. `wide` is for the
 * wheel, where the chart is the content — a circle in a 64rem column with two
 * rails beside it is a circle the size of a coin.
 */
export type ShellWidth = 'reading' | 'wide';

export function Shell({
  children,
  email,
  subject,
  width = 'reading',
}: {
  children: React.ReactNode;
  email?: string | undefined;
  width?: ShellWidth;
  /**
   * The person this page is about, when it is about one.
   *
   * Passing it here rather than having each page render its own heading is what
   * keeps the lens tabs from being seven different rows in seven files.
   */
  subject?:
    | {
        id: string;
        name: string;
        kicker?: string | undefined;
        line?: string | undefined;
        actions?: React.ReactNode;
      }
    | undefined;
}) {
  return (
    <div
      className={`mx-auto px-5 pb-24 pt-7 sm:px-8 ${
        width === 'wide' ? 'max-w-[100rem]' : 'max-w-5xl'
      }`}
    >
      <Nav email={email} />
      {subject ? <SubjectBar {...subject} /> : null}
      {children}
    </div>
  );
}

/**
 * A blueprint card.
 *
 * `marked` shows the corner brackets permanently — for the one panel on a page
 * that is the subject of it. `interactive` draws them in on hover instead, so
 * the brackets mean "this responds to you" rather than being wallpaper. A page
 * where every panel is marked says nothing at all.
 */
export function Panel({
  children,
  className = '',
  marked = false,
  interactive = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  marked?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={style}
      className={[
        'jade-panel p-5 sm:p-6',
        marked ? 'jade-panel--marked' : '',
        interactive ? 'jade-panel--interactive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

/**
 * The small label above a section.
 *
 * Where the label is plain text, it is scanned for glossary vocabulary and the
 * known words become explainable. This is deliberately done here rather than at
 * every call site: nearly every technical word on a chart page is a section
 * heading — Pañcāṅga, Daśā, Ṣoḍaśavarga, Aṣṭakavarga — and marking them up one
 * by one is the sort of pass that gets 80% done and then rots. Doing it in the
 * one component every section already uses means a heading added next year is
 * covered without anyone remembering to.
 *
 * Non-string children pass through untouched, because those callers have
 * composed their own markup and should not have it rewritten.
 */
export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
      {typeof children === 'string' ? <AutoTerms>{children}</AutoTerms> : children}
    </p>
  );
}

/**
 * A page heading: kicker, title, and an optional lede.
 *
 * Repeated on every screen, so it is one component rather than six copies that
 * drift apart in spacing.
 */
export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="jade-rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Kicker>{kicker}</Kicker>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.01em]">
          {title}
        </h1>
        {lede ? <p className="mt-2 max-w-[58ch] text-[var(--ink-muted)]">{lede}</p> : null}
      </div>
      {actions}
    </div>
  );
}

/** The one primary action on a page. */
export function ActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-all hover:bg-transparent hover:text-[var(--accent)]"
    >
      {children}
    </Link>
  );
}
