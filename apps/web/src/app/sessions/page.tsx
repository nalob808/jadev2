import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listFollowUps, listSessions, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

/**
 * The consultation book.
 *
 * Split at *now* rather than sorted one way, because the two halves answer
 * different questions. Above the line is "what am I walking into this week",
 * which is a list you act on. Below it is "what did I say to this person", a
 * list you search. One reverse-chronological list serves neither.
 */

const KIND_LABELS: Record<string, string> = {
  first: 'First reading',
  follow_up: 'Follow-up',
  muhurta: 'Muhūrta',
  other: 'Consultation',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'scheduled',
  held: 'held',
  cancelled: 'cancelled',
};

export default async function SessionsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  await requireCapability(session.workspaceId, 'sessions');

  const clock = await getClock(session.workspaceId);
  const database = getDatabase();
  const [rows, people, followUps] = await Promise.all([
    listSessions(database, session.workspaceId),
    listSubjects(database, session.workspaceId),
    listFollowUps(database, session.workspaceId, { openOnly: true }),
  ]);

  const now = clock.nowMs;
  const upcoming = rows
    .filter((r) => r.session.scheduledFor.getTime() >= now && r.session.status !== 'cancelled')
    .sort((a, b) => a.session.scheduledFor.getTime() - b.session.scheduledFor.getTime());
  const past = rows.filter(
    (r) => r.session.scheduledFor.getTime() < now || r.session.status === 'cancelled',
  );

  return (
    <Shell email={session.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Sessions</Kicker>
          <h1 className="font-display text-4xl">
            {upcoming.length === 0 ? 'Nothing booked' : `${upcoming.length} coming up`}
          </h1>
        </div>
        {people.length > 0 ? (
          <Link
            href="/sessions/new"
            className="bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white"
          >
            Book a session
          </Link>
        ) : null}
      </div>

      {people.length === 0 ? (
        <Panel>
          <p className="text-[var(--ink-muted)]">
            A session is a consultation with somebody in your book.{' '}
            <Link href="/people/new" className="text-[var(--accent)] underline underline-offset-2">
              Add a person
            </Link>{' '}
            first and they become bookable.
          </p>
        </Panel>
      ) : null}

      {followUps.length > 0 ? (
        <Panel marked className="mb-6">
          <Kicker>Open follow-ups</Kicker>
          <ul className="mt-2 flex flex-col gap-1.5">
            {followUps.slice(0, 8).map((followUp) => (
              <li key={followUp.id} className="flex flex-wrap gap-x-3 text-[13.5px]">
                <span>{followUp.body}</span>
                {followUp.dueOn ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                    by {followUp.dueOn}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mb-8">
          <Kicker>Coming up</Kicker>
          <ul className="mt-2 flex flex-col gap-2">
            {upcoming.map((row) => (
              <SessionRow key={row.session.id} row={row} clock={clock} />
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section>
          <Kicker>Earlier</Kicker>
          <ul className="mt-2 flex flex-col gap-2">
            {past.map((row) => (
              <SessionRow key={row.session.id} row={row} clock={clock} />
            ))}
          </ul>
        </section>
      ) : null}
    </Shell>
  );
}

function SessionRow({
  row,
  clock,
}: {
  row: Awaited<ReturnType<typeof listSessions>>[number];
  clock: Awaited<ReturnType<typeof getClock>>;
}): React.ReactElement {
  const when = row.session.scheduledFor.getTime();
  return (
    <li>
      <Link
        href={`/sessions/${row.session.id}`}
        className="block border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-xl">{row.subjectName}</span>
          <span className="font-mono text-[11px] text-[var(--ink-muted)]">
            {clock.format(when, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-[var(--ink-faint)]">
            {KIND_LABELS[row.session.kind] ?? row.session.kind} ·{' '}
            {STATUS_LABELS[row.session.status] ?? row.session.status}
          </span>
        </div>
        {row.session.location ? (
          <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-faint)]">
            {row.session.location}
          </p>
        ) : null}
      </Link>
    </li>
  );
}
