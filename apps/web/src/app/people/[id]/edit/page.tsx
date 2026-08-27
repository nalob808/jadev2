import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSubject } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { PersonForm, type PersonDefaults } from '@/components/PersonForm';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

/**
 * Correct a person.
 *
 * Every field arrives pre-filled from what is on record, including the
 * birthplace — an edit form that silently empties a field is a form that
 * deletes data when somebody only meant to fix a spelling.
 */
export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const { error } = await searchParams;

  const record = await getSubject(getDatabase(), session.workspaceId, id);
  if (!record?.birthEvent) notFound();

  const { subject, birthEvent } = record;

  const defaults: PersonDefaults = {
    id: subject.id,
    displayName: subject.displayName,
    relationship: subject.relationship,
    localDatetime: birthEvent.localDatetime,
    timeAccuracy: birthEvent.timeAccuracy,
    place: {
      id: birthEvent.placeId ?? 'recorded',
      label: birthEvent.placeName,
      latitude: birthEvent.latitude,
      longitude: birthEvent.longitude,
      timezoneId: birthEvent.timezoneId,
    },
    sourceNote: birthEvent.sourceNote,
  };

  return (
    <Shell email={session.email}>
      <div className="mb-6">
        <Kicker>Editing</Kicker>
        <h1 className="font-display text-4xl">{subject.displayName}</h1>
        <p className="mt-2 max-w-[58ch] text-[var(--ink-muted)]">
          Changing the moment or the place recasts the chart from scratch, including the time zone
          offset — a new city means a new offset, so the two are never patched separately.
        </p>
      </div>

      <Panel className="max-w-xl">
        <PersonForm error={error} person={defaults} />
      </Panel>

      <p className="mt-4">
        <Link
          href={`/people/${subject.id}`}
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
        >
          ← Back without saving
        </Link>
      </p>
    </Shell>
  );
}
