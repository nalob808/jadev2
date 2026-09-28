'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavLink } from './NavLink';
import { ACCOUNT, SECTIONS, isCurrent, sectionFor, subjectLenses } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';

/**
 * The three rows of navigation, all reading the same map (`lib/nav.ts`).
 *
 * One client module rather than three, because all three need `usePathname`
 * and splitting them would mean three client boundaries in one header.
 * `Shell` stays a server component and renders these.
 */

/**
 * The five words in the masthead.
 *
 * Which one is lit comes from `sectionFor`, not from a prefix test on the
 * link's own href — that is the whole point of the map. `/houses` lights
 * People; `/upgrade` lights nothing in the five, because it belongs to the
 * account corner.
 */
export function PrimaryLinks(): React.ReactElement {
  const pathname = usePathname();
  const current = sectionFor(pathname);

  return (
    <nav
      aria-label="Main"
      className="ml-auto flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-sm"
    >
      {SECTIONS.map((section) => (
        <NavLink
          key={section.id}
          href={section.href}
          title={section.blurb}
          active={current?.id === section.id}
        >
          {section.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * A row of small links, with the current one marked.
 *
 * Shared by the section row and the lens tabs so the two cannot drift apart in
 * spacing or in what "current" looks like.
 */
function Row({ items, label }: { items: readonly NavItem[]; label: string }): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em]"
    >
      {items.map((item) => {
        const active = isCurrent(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.blurb}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'border-b border-[var(--accent)] pb-0.5 text-[var(--accent)]'
                : 'border-b border-transparent pb-0.5 text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]'
            }
          >
            {item.label}
            {item.leavesApp ? (
              <span aria-hidden="true" className="ml-0.5 align-super text-[8px]">
                ↗
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The second row: whatever the current section contains.
 *
 * Renders nothing when the section has no parts (Today) or when there is no
 * section at all, rather than an empty bordered strip that makes the header
 * look broken.
 */
export function SectionRow(): React.ReactElement | null {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  if (!section || section.items.length === 0) return null;

  const items = section.id === ACCOUNT.id ? accountItems() : section.items;

  return (
    <div className="mt-2 border-t border-[var(--rule)] pt-2">
      <Row items={items} label={`${section.label} sections`} />
    </div>
  );
}

/**
 * The account corner's second row.
 *
 * Labs is appended at render time from a public env var rather than listed in
 * the map, because whether the spike exists is a property of the deployment,
 * not of the app's structure.
 */
function accountItems(): readonly NavItem[] {
  const labs = process.env.NEXT_PUBLIC_JADE_SPIKES === '1';
  return labs
    ? [
        ...ACCOUNT.items,
        {
          href: '/spike/sphere',
          label: 'Labs · sphere',
          blurb: 'The 3D geocentric sphere spike. Unfinished, and not accessible yet.',
        },
      ]
    : ACCOUNT.items;
}

/**
 * The lens tabs for one subject.
 *
 * Separate from the section row because a lens is not a place: it only means
 * anything once a subject is chosen, so it sits beside that subject's name
 * rather than in the masthead.
 */
export function LensTabs({ id }: { id: string }): React.ReactElement {
  return <Row items={subjectLenses(id)} label="Views of this chart" />;
}
