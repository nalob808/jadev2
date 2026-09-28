import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { ACCOUNT, SECTIONS, UNLINKED, subjectLenses } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';
import { Kicker, PageHead, Panel, Shell } from '@/components/Shell';

export const metadata = { title: 'Everything in Jade' };
export const dynamic = 'force-dynamic';

/**
 * Every surface in Jade on one page.
 *
 * Not a substitute for navigation — if this page is how anyone finds anything,
 * the menu has failed. It exists for the two things a menu is bad at: telling
 * you what a screen answers before you open it, and admitting what Jade does
 * not have a screen for yet.
 *
 * It is generated from `lib/nav.ts`, so it cannot describe a menu that is no
 * longer there.
 */
function Entry({ item, example }: { item: NavItem; example?: string }): React.ReactElement {
  const href = example ? item.href.replace(':id', example) : item.href;
  return (
    <li className="border-t border-[var(--rule)] py-2.5 first:border-t-0">
      <Link href={href} className="group flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-[1.05rem] text-[var(--ink)] group-hover:text-[var(--accent)]">
          {item.label}
        </span>
        <code className="font-mono text-[10px] text-[var(--ink-faint)]">{item.href}</code>
        {item.leavesApp ? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)]">
            public page
          </span>
        ) : null}
      </Link>
      <p className="mt-0.5 max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
        {item.blurb}
      </p>
    </li>
  );
}

export default async function MapPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  /*
   * One real person, so the lens list is clickable rather than theoretical.
   * A map you cannot travel from is a poster.
   */
  const subjects = await listSubjects(getDatabase(), session.workspaceId);
  const example = subjects.find((record) => record.birthEvent)?.subject;

  return (
    <Shell email={session.email}>
      <PageHead
        kicker="The map"
        title="Everything in Jade"
        lede="Five places, seven ways of looking at one chart, and what each one answers. If something here surprises you, that is the point of the page."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Panel key={section.id}>
            <Kicker>{section.label}</Kicker>
            <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
              {section.blurb}
            </p>
            <ul className="mt-3">
              {(section.items.length > 0
                ? section.items
                : [{ href: section.href, label: section.label, blurb: section.blurb }]
              ).map((item) => (
                <Entry key={item.href} item={item} />
              ))}
            </ul>
          </Panel>
        ))}

        <Panel marked>
          <Kicker>One chart, seven ways</Kicker>
          <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
            These are not menu items, because none of them means anything until a person is chosen.
            They appear beside the name of whoever you are looking at.
            {example ? ` The links below open ${example.displayName}.` : ''}
          </p>
          <ul className="mt-3">
            {subjectLenses(example?.id ?? ':id').map((item) => (
              <Entry key={item.label} item={item} />
            ))}
          </ul>
          {!example ? (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
              <Link href="/people/new" className="text-[var(--accent)]">
                Add someone with a birth time →
              </Link>
            </p>
          ) : null}
        </Panel>

        <Panel>
          <Kicker>{ACCOUNT.label}</Kicker>
          <p className="mt-1 max-w-[52ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
            {ACCOUNT.blurb}
          </p>
          <ul className="mt-3">
            {ACCOUNT.items.map((item) => (
              <Entry key={item.href} item={item} />
            ))}
          </ul>
        </Panel>
      </div>

      {/*
        The honest half of a site map.

        Every one of these is a real screen with no home in the menu, and each
        has a reason. Printing the reasons is what stops the list growing: a
        route added without a home has to be argued for in `lib/nav.ts`, where
        the reachability test reads it.
      */}
      <section className="mt-10 border-t border-[var(--rule)] pt-5">
        <Kicker>Deliberately not in the menu</Kicker>
        <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {UNLINKED.map((entry) => (
            <li key={entry.route} className="text-[13px] leading-relaxed">
              <code className="font-mono text-[11px] text-[var(--ink)]">{entry.route}</code>
              <span className="text-[var(--ink-muted)]"> — {entry.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
