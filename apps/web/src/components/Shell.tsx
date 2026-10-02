import Link from 'next/link';
import { devSignOut } from '@/app/actions';
import { LensTabs, MobileTabBar, PrimaryLinks, SectionRow, SectionTitle } from './AppNav';
import { AutoTerms } from './Glossary';
import { ThemeToggle } from './ThemeToggle';

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
export function Nav({
  email,
  subject = false,
}: {
  email?: string | undefined;
  /** True when a `SubjectBar` follows, which changes what the header shows on a phone. */
  subject?: boolean;
}): React.ReactElement {
  return (
    <header className="mb-5 sm:mb-7">
      {/*
        The phone's top bar.

        Sticky, one line, and deliberately almost empty: the wordmark so you
        know what you are in, where you are in one small word, and the two
        controls that have no other home. Everything else moved to the bottom
        bar or into the page. It stays put when the page scrolls because a
        header that scrolls away takes the only fixed landmark with it.
      */}
      <div className="jade-safe-top sticky top-0 z-30 -mx-5 mb-3 flex items-center gap-3 border-b border-[var(--rule)] bg-[var(--paper)]/92 px-5 py-2.5 backdrop-blur-md sm:hidden">
        <Link
          href="/home"
          className="font-display text-xl font-semibold tracking-[0.22em] text-[var(--ink)]"
        >
          JADE
        </Link>
        <SectionTitle />
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle variant="masthead" />
          <Link
            href="/settings"
            aria-label="Settings"
            className="jade-tap font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* The desktop masthead, unchanged. */}
      <div className="hidden flex-wrap items-baseline gap-x-4 gap-y-2 pb-1 sm:flex">
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
          {/*
            The theme belongs here, not four screens away in settings. It is
            the one setting somebody changes because of the room they are in.
          */}
          <ThemeToggle variant="masthead" />
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

      {/*
        On a phone a subject page already carries the lens tabs, and a section
        row above them is two rows of small type saying overlapping things. The
        bottom bar says which section you are in; the lenses say what you are
        looking at. That is enough.
      */}
      <div className={subject ? 'hidden sm:block' : undefined}>
        <SectionRow />
      </div>

      {/* The one ambient thing in the app — see .jade-ecliptic in globals.css. */}
      <div className="jade-ecliptic mt-3 hidden sm:block" aria-hidden="true" />
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
    <div className="jade-rise mb-5 border-b border-[var(--rule)] pb-3 sm:mb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div className="min-w-0">
          {kicker ? <Kicker>{kicker}</Kicker> : null}
          {/*
            The name wraps rather than overflows. A long one at 2.1rem is wider
            than a phone, and `truncate` would hide half of somebody's name to
            protect a layout — which is the wrong thing to protect.
          */}
          <h1 className="font-display text-[1.7rem] font-semibold leading-[1.1] tracking-[-0.01em] sm:text-[2.1rem]">
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

/**
 * The page container's classes, in one place.
 *
 * `LoadingShell` stands in for this while a route is arriving, and the two had
 * already drifted: the skeleton used `pt-6` against the page's `pt-7`, so every
 * route with a loading state moved four pixels the instant it finished loading.
 * One function, called by both, and `skeleton.test.ts` fails if a second copy
 * of these classes appears.
 */
export function shellContainer(width: ShellWidth = 'reading'): string {
  /*
   * `pb-32` on a phone is not padding for its own sake: the bottom tab bar is
   * fixed, so without it the last card of every page sits underneath the tabs
   * and cannot be read or tapped. Above `sm` the bar is gone and the old
   * breathing room is back.
   */
  return `mx-auto px-5 pb-32 sm:px-8 sm:pb-24 sm:pt-7 ${width === 'wide' ? 'max-w-[100rem]' : 'max-w-5xl'}`;
}

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
    <>
      <div className={shellContainer(width)}>
        <Nav email={email} subject={Boolean(subject)} />
        {subject ? <SubjectBar {...subject} /> : null}
        {children}
      </div>
      {/*
        Outside the container on purpose. It is fixed to the viewport, so a
        padded, max-width parent would do nothing but confuse whoever reads
        this next.
      */}
      <MobileTabBar />
    </>
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
    <div className="jade-rise mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div>
        <Kicker>{kicker}</Kicker>
        <h1 className="font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-[2.6rem] sm:leading-[1.06]">
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
