'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * A navigation link that knows whether it is the current section.
 *
 * The underline is drawn with a pseudo-element that scales from the left
 * rather than with `text-decoration`, so it can animate and so it sits at a
 * consistent distance from the baseline regardless of descenders — an
 * underlined "People" and an underlined "Relationships" otherwise sit at
 * different heights.
 *
 * `startsWith` rather than equality, so `/people/[id]` still marks People as
 * current. The root guard stops `/` matching everything.
 *
 * `active` overrides that test, for the case the prefix rule cannot express: a
 * section word owns routes that do not sit under its own path — `/houses` and
 * `/wheel` belong to People — so the masthead resolves currency through
 * `sectionFor` in `lib/nav.ts` and passes the answer in. Without the override
 * there would be two link components with one set of styles between them,
 * which is how an underline ends up two pixels lower on one row.
 */
export function NavLink({
  href,
  children,
  active: activeOverride,
  title,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean | undefined;
  title?: string | undefined;
}): React.ReactElement {
  const pathname = usePathname();
  const active = activeOverride ?? (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? 'page' : undefined}
      className={`relative px-2 py-1 transition-colors after:absolute after:bottom-0 after:left-2 after:right-2 after:h-px after:origin-left after:bg-[var(--accent)] after:transition-transform after:duration-200 after:content-[''] hover:text-[var(--ink)] ${
        active
          ? 'text-[var(--ink)] after:scale-x-100'
          : 'text-[var(--ink-muted)] after:scale-x-0 hover:after:scale-x-100'
      }`}
    >
      {children}
    </Link>
  );
}
