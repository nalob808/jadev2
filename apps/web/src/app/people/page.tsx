import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listSubjects, type SubjectWithPrimaryEvent } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { PeopleControls } from '@/components/PeopleControls';
import { applyView, readViewState, relationshipsPresent } from '@/lib/peopleView';

export const dynamic = 'force-dynamic';

/** "1990-06-15T10:30" → "15 Jun 1990 · 10:30". Never parsed as an instant. */
function born(row: SubjectWithPrimaryEvent): string {
  const event = row.birthEvent;
  if (!event) return 'no birth data';
  const [date, time = ''] = event.localDatetime.split('T');
  const [y, m, d] = (date ?? '').split('-');
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const month = months[Number(m) - 1] ?? m ?? '';
  return `${Number(d)} ${month} ${y} · ${time.slice(0, 5)}`;
}

function AmbiguityFlag(): React.ReactElement {
  return (
    <span className="inline-block border border-[var(--clay,#9E5B3A)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--clay,#9E5B3A)]">
      check the time
    </span>
  );
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const people = await listSubjects(getDatabase(), session.workspaceId);
  const state = readViewState(searchParams);
  const shown = applyView(people, state);

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
        <>
          <PeopleControls
            state={state}
            relationships={relationshipsPresent(people)}
            total={people.length}
            showing={shown.length}
          />

          {shown.length === 0 ? (
            <Panel>
              <p className="text-[var(--ink-muted)]">
                Nobody matches that. Names, birthplaces and tags are all searched.
              </p>
            </Panel>
          ) : state.view === 'table' ? (
            <TableView rows={shown} />
          ) : state.view === 'list' ? (
            <ListView rows={shown} />
          ) : (
            <CardView rows={shown} />
          )}
        </>
      )}
    </Shell>
  );
}

/** Roomy, two across. The default, and the easiest to scan at a glance. */
function CardView({ rows }: { rows: SubjectWithPrimaryEvent[] }): React.ReactElement {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map(({ subject, birthEvent }) => (
        <li key={subject.id}>
          <Link
            href={`/people/${subject.id}`}
            className="block border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
          >
            <p className="font-display text-2xl">{subject.displayName}</p>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              {born({ subject, birthEvent })}
              {birthEvent ? ` · ${birthEvent.placeName}` : ''}
            </p>
            {birthEvent?.offsetAmbiguous ? (
              <p className="mt-2">
                <AmbiguityFlag />
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One per row, full width. More people on screen without losing the place. */
function ListView({ rows }: { rows: SubjectWithPrimaryEvent[] }): React.ReactElement {
  return (
    <ul className="flex flex-col border border-[var(--rule)] bg-[var(--surface)]">
      {rows.map(({ subject, birthEvent }, index) => (
        <li key={subject.id} className={index > 0 ? 'border-t border-[var(--rule)]' : ''}>
          <Link
            href={`/people/${subject.id}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-[var(--paper)]"
          >
            <span className="font-display text-xl">{subject.displayName}</span>
            <span className="font-mono text-[11px] text-[var(--ink-muted)]">
              {born({ subject, birthEvent })}
            </span>
            {birthEvent ? (
              <span className="ml-auto font-mono text-[11px] text-[var(--ink-muted)]">
                {birthEvent.placeName}
              </span>
            ) : null}
            {birthEvent?.offsetAmbiguous ? <AmbiguityFlag /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every field in columns, for comparing people rather than opening one.
 *
 * `tabular-nums` on the date column so the digits line up down the page —
 * without it a column of dates is a ragged edge and the eye cannot scan it.
 */
function TableView({ rows }: { rows: SubjectWithPrimaryEvent[] }): React.ReactElement {
  return (
    <div className="overflow-x-auto border border-[var(--rule)] bg-[var(--surface)]">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--rule)] text-left">
            {['Name', 'Born', 'Place', ''].map((heading) => (
              <th
                key={heading}
                className="px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ink-muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ subject, birthEvent }, index) => (
            <tr key={subject.id} className={index > 0 ? 'border-t border-[var(--rule)]' : ''}>
              <td className="px-4 py-2">
                <Link href={`/people/${subject.id}`} className="hover:underline">
                  {subject.displayName}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                {born({ subject, birthEvent })}
              </td>
              <td className="px-4 py-2 text-[var(--ink-muted)]">{birthEvent?.placeName ?? '—'}</td>
              <td className="px-4 py-2">
                {birthEvent?.offsetAmbiguous ? <AmbiguityFlag /> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
