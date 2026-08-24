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
 */
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
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
