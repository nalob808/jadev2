import Link from 'next/link';

/**
 * The public site's chrome.
 *
 * Separate from `Shell` because the two have opposite jobs. The app's header
 * is a workbench: dense, quiet, gets out of the way. This one has to say what
 * Jade is to somebody who arrived from a search result and will decide in
 * about four seconds.
 */

export const NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/features', label: 'Features' },
  { href: '/learn', label: 'Learn' },
  { href: '/accuracy', label: 'Accuracy' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function SiteHeader(): React.ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[var(--paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-[0.22em] text-[var(--ink)]"
        >
          JADE
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-5 text-sm sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/sign-in"
            className="px-2 py-2 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 font-display text-base tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)] sm:px-4"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="mt-24 border-t border-[var(--rule)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold tracking-[0.22em]">JADE</p>
          <p className="mt-2 max-w-[28ch] text-sm text-[var(--ink-muted)]">
            Sidereal astrology software for people who practise seriously.
          </p>
        </div>

        <nav aria-label="Product">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Product
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Get started">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Get started
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>
              <Link
                href="/sign-in"
                className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
              >
                Create a free account
              </Link>
            </li>
            <li>
              <Link
                href="/sign-in"
                className="text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Method
          </p>
          <p className="text-sm text-[var(--ink-muted)]">
            Lahiri by default, every ayanāṁśa selectable, and the chart always records which one
            produced it.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--rule)]">
        <p className="mx-auto max-w-6xl px-5 py-5 font-mono text-[10px] text-[var(--ink-faint)] sm:px-8">
          Jade does not predict death, disease, or legal outcomes. Astrological analysis is not
          medical, legal, or financial advice.
        </p>
      </div>
    </footer>
  );
}

/** A section heading used across the public pages. */
export function SectionHead({
  kicker,
  title,
  lede,
  center = false,
  as: Heading = 'h2',
}: {
  kicker: string;
  title: string;
  lede?: string;
  center?: boolean;
  /**
   * The heading level. Every page needs exactly one `h1` and it has to be the
   * thing the page is about — a page whose first heading is an `h2` reads to a
   * crawler as a fragment of some other document.
   */
  as?: 'h1' | 'h2';
}): React.ReactElement {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
        {kicker}
      </p>
      <Heading className="mt-2 font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.01em]">
        {title}
      </Heading>
      {lede ? (
        <p
          className={`mt-3 text-[17px] leading-relaxed text-[var(--ink-muted)] ${center ? 'mx-auto' : ''}`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/** The repeated conversion prompt. */
export function CallToAction({
  title = 'Cast your own chart in about a minute',
  body = 'The free tier holds three people, the rāśi and the navāṁśa, and today’s transits. No card, no trial clock.',
}: {
  title?: string;
  body?: string;
}): React.ReactElement {
  return (
    <section className="jade-panel jade-panel--marked mx-auto mt-20 max-w-4xl p-8 text-center sm:p-12">
      <h2 className="font-display text-[clamp(1.7rem,3.5vw,2.4rem)] font-semibold leading-tight">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-[52ch] text-[var(--ink-muted)]">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/sign-in"
          className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
        >
          Start free
        </Link>
        <Link
          href="/pricing"
          className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          See pricing
        </Link>
      </div>
    </section>
  );
}
