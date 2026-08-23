import Link from 'next/link';
import { devSignOut } from '@/app/actions';

const LINKS: Array<{ href: string; label: string }> = [
  { href: '/people', label: 'People' },
  { href: '/relationships', label: 'Relationships' },
  { href: '/people/new', label: 'Add' },
  { href: '/settings', label: 'Settings' },
];

/**
 * The masthead and navigation.
 *
 * Split out of `Shell` so that `loading.tsx` can render exactly the same
 * chrome. Without that, every navigation blanks the header for as long as the
 * server takes, and the page appears to be rebuilding itself from nothing
 * rather than filling in one region.
 */
export function Nav({ email }: { email?: string | undefined }): React.ReactElement {
  return (
    <nav className="mb-8 flex flex-wrap items-baseline gap-4 border-b border-[var(--rule)] pb-4">
      <Link href="/people" className="font-display text-2xl tracking-[0.14em]">
        JADE
      </Link>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        sidereal practice
      </span>
      <div className="ml-auto flex items-center gap-4 text-sm">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
        {email ? (
          <form action={devSignOut}>
            <button
              type="submit"
              className="font-mono text-[11px] text-[var(--ink-muted)] hover:underline"
            >
              {email} · sign out
            </button>
          </form>
        ) : null}
      </div>
    </nav>
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
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <Nav email={email} />
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative border border-[var(--rule)] bg-[var(--surface)] p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
      {children}
    </p>
  );
}
