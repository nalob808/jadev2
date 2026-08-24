import Link from 'next/link';
import { devSignOut } from '@/app/actions';
import { NavLink } from './NavLink';

const LINKS: Array<{ href: string; label: string }> = [
  { href: '/people', label: 'People' },
  { href: '/relationships', label: 'Relationships' },
  { href: '/notes', label: 'Notes' },
  { href: '/settings', label: 'Settings' },
];

/**
 * The masthead and navigation.
 *
 * Split out of `Shell` so `loading.tsx` can render exactly the same chrome.
 * Without that, every navigation blanks the header for as long as the server
 * takes, and the page appears to rebuild itself from nothing rather than
 * filling in one region.
 */
export function Nav({ email }: { email?: string | undefined }): React.ReactElement {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-3">
        <Link
          href="/people"
          className="font-display text-2xl font-semibold tracking-[0.22em] text-[var(--ink)]"
        >
          JADE
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          sidereal practice
        </span>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* The one ambient thing in the app — see .jade-ecliptic in globals.css. */}
      <div className="jade-ecliptic" aria-hidden="true" />

      {email ? (
        <div className="flex justify-end pt-2">
          <form action={devSignOut}>
            <button
              type="submit"
              className="font-mono text-[10px] tracking-wide text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
            >
              {email} · sign out
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}

export function Shell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | undefined;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-7 sm:px-8">
      <Nav email={email} />
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

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
      {children}
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
