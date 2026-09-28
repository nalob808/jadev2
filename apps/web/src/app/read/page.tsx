import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { workbenchHref } from '@/lib/nav';

export const dynamic = 'force-dynamic';

/**
 * The front door of the reading surface.
 *
 * `read.jadeapp.co/` rewrites here, and `jadeapp.co/read` reaches it directly —
 * which is what lets the feature ship before any DNS record exists.
 *
 * Deliberately not the app shell. The main navigation is ten items of
 * practitioner vocabulary, and dropping somebody who came here to understand
 * their chart into it would undo the whole point. One question, one list, one
 * way back.
 */
export default async function ReadIndexPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const people = (await listSubjects(getDatabase(), session.workspaceId)).filter(
    (record) => record.birthEvent,
  );

  return (
    <main className="mx-auto max-w-[44rem] px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        Jade · reading
      </p>
      <h1 className="mt-1 font-display text-4xl leading-none">Whose chart shall we read?</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
        Plain English, house by house — what each part of the chart is, what is sitting in it, and
        what the tradition says that means. No jargon you have to look up, and every paragraph will
        show you the placements behind it if you want them.
      </p>

      {people.length === 0 ? (
        <div className="mt-8 border border-dashed border-[var(--rule-strong)] p-5">
          <p className="text-[15px] leading-relaxed">
            There is nobody to read yet. A reading needs a birth date, time and place.
          </p>
          <Link
            href="/people/new"
            className="mt-3 inline-block border border-[var(--accent)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]"
          >
            Add someone →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {people.map((record) => (
            <li key={record.subject.id}>
              <Link
                href={`/read/${record.subject.id}`}
                className="flex flex-wrap items-baseline gap-x-3 border border-[var(--rule)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]"
              >
                <span className="font-display text-2xl leading-none">
                  {record.subject.displayName}
                </span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                  read →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 border-t border-[var(--rule)] pt-4 text-[13px] leading-relaxed text-[var(--ink-muted)]">
        Looking for the charts, the vargas and the daśās?{' '}
        <Link
          href={workbenchHref('/home', headers().get('host'))}
          className="text-[var(--accent)] underline underline-offset-4"
        >
          The full instrument is here
        </Link>
        .
      </p>
    </main>
  );
}
