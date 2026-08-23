import Link from 'next/link';
import { devSignOut } from '@/app/actions';

export function Shell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | undefined;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <nav className="mb-8 flex flex-wrap items-baseline gap-4 border-b border-[var(--rule)] pb-4">
        <Link href="/people" className="font-display text-2xl tracking-[0.14em]">
          JADE
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          sidereal practice
        </span>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/people" className="hover:underline">
            People
          </Link>
          <Link href="/relationships" className="hover:underline">
            Relationships
          </Link>
          <Link href="/people/new" className="hover:underline">
            Add
          </Link>
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
