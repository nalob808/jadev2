'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavLink } from './NavLink';
import { ACCOUNT, SECTIONS, isCurrent, sectionFor, subjectLenses } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';

/**
 * Navigation, in two shapes for two devices.
 *
 * All of it reads the same map (`lib/nav.ts`) — the structure of the app is
 * one thing and this file is only its presentation. What differs is where the
 * five sections live:
 *
 * - **Desktop** keeps the masthead it was designed around: five words on the
 *   first line beside the wordmark, the current section's parts on the second.
 * - **Phones** move the five to a bottom tab bar and leave the top for the
 *   wordmark and the account corner. That is not decoration. On a 390×844
 *   screen the old three-row masthead plus the lens tabs spent 420px — half
 *   the visible page — before a single word of content, and the five words it
 *   spent that on were the hardest things on the screen to reach, sitting at
 *   the far end of the thumb's arc. Moving them to the bottom gives the page
 *   back its first screen and puts the app's structure where the hand is.
 *
 * One client module rather than several, because all of these need
 * `usePathname` and splitting them would mean three client boundaries in one
 * header. `Shell` stays a server component and renders these.
 */

/**
 * The five words in the masthead. Desktop only — see `MobileTabBar`.
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
      className="ml-auto hidden flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-sm sm:flex"
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
 * The same five, pinned to the bottom of a phone.
 *
 * `role="navigation"` with a label rather than a list of buttons, because
 * these are links and should behave like links: long-press to copy, open in a
 * new tab, and back works. The active tab carries both a colour and a rule
 * above it — colour alone fails for the ~8% of men who cannot reliably tell
 * these two apart.
 */
export function MobileTabBar(): React.ReactElement {
  const pathname = usePathname();
  const current = sectionFor(pathname);

  return (
    <nav
      aria-label="Sections"
      className="jade-tabbar jade-safe-bottom fixed inset-x-0 bottom-0 z-40 flex pt-0.5 sm:hidden"
    >
      {SECTIONS.map((section) => {
        const active = current?.id === section.id;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[2.9rem] flex-1 flex-col items-center justify-center gap-1 border-t-2 pt-1 font-display text-[13px] leading-none tracking-wide transition-colors ${
              active
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--ink-faint)]'
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * A row of small links, with the current one marked.
 *
 * Shared by the section row and the lens tabs so the two cannot drift apart in
 * spacing or in what "current" looks like.
 *
 * It scrolls sideways on a phone instead of wrapping. A wrapped strip changes
 * height depending on which section you are in — the person page's nine lenses
 * took two lines, People's four took one — so the content below it moved by a
 * line every time you navigated. A strip that always occupies one line is a
 * fixed landmark; one that reflows is a small earthquake.
 */
function Row({ items, label }: { items: readonly NavItem[]; label: string }): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="jade-strip -mx-5 flex flex-nowrap items-center gap-x-4 gap-y-1 px-5 font-mono text-[11px] uppercase tracking-[0.12em] sm:mx-0 sm:flex-wrap sm:gap-x-3 sm:px-0"
    >
      {items.map((item) => {
        const active = isCurrent(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.blurb}
            aria-current={active ? 'page' : undefined}
            className={`jade-tap shrink-0 whitespace-nowrap border-b pb-0.5 ${
              active
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]'
            }`}
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

/**
 * Where you are, said in one word, for the phone's top bar.
 *
 * The desktop masthead shows all five sections at once, so which one is lit
 * answers this for free. The bottom bar does too, but it is 800px away from
 * the top of a scrolled page — so the title echoes it where the eye already
 * is. It is the section, not the page: the page says what it is in its own
 * heading, directly below.
 */
export function SectionTitle(): React.ReactElement | null {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  if (!section) return null;
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
      {section.label}
    </span>
  );
}
