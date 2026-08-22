import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const people = await listSubjects(getDatabase(), session.workspaceId);

  return (
    <Shell email={session.email}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Kicker>Your people</Kicker>
          <h1 className="font-display text-4xl">
            {people.length === 0
              ? 'Nobody here yet'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'}`}
          </h1>
        </div>
        <Link
          href="/people/new"
          className="bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white"
        >
          Add person
        </Link>
      </div>

      {people.length === 0 ? (
        <Panel>
          <p className="text-[var(--ink-muted)]">
            Add the first person and Jade casts their chart immediately — nine grahas including Rāhu
            and Ketu, all sixteen vargas, nakṣatras and the running Vimśottarī daśā.
          </p>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map(({ subject, birthEvent }) => (
            <li key={subject.id}>
              <Link
                href={`/people/${subject.id}`}
                className="block border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <p className="font-display text-2xl">{subject.displayName}</p>
                <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {birthEvent
                    ? `${birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} · ${birthEvent.placeName}`
                    : 'no birth data'}
                </p>
                {birthEvent?.offsetAmbiguous ? (
                  <p className="mt-2 inline-block border border-[var(--clay,#9E5B3A)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--clay,#9E5B3A)]">
                    check the time
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
