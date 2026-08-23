import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listRelationships, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { addRelationship } from '@/app/actions';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { SubmitButton } from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

export default async function RelationshipsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const db = getDatabase();
  const [pairs, people] = await Promise.all([
    listRelationships(db, { workspaceId: session.workspaceId }),
    listSubjects(db, session.workspaceId),
  ]);

  const withBirth = people.filter((p) => p.birthEvent !== null);

  return (
    <Shell email={session.email}>
      <Kicker>Relationships</Kicker>
      <h1 className="font-display text-4xl">Two charts, read together</h1>
      <p className="mt-3 max-w-[62ch] text-[var(--ink-muted)]">
        Aṣṭakūṭa with every component shown, maṅgala doṣa with its cancellations, and the house
        overlays both ways round. No compatibility verdict — that is a judgement you make with the
        placements in front of you.
      </p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
        <div>
          {pairs.length === 0 ? (
            <Panel>
              <p className="text-sm text-[var(--ink-muted)]">
                Nothing paired yet. Two people with birth moments recorded is all it takes.
              </p>
            </Panel>
          ) : (
            <ul className="flex flex-col gap-3">
              {pairs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/relationships/${r.id}`}
                    className="block border border-[var(--rule)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--accent)]"
                  >
                    <span className="font-display text-xl">
                      {r.a.displayName} <span className="text-[var(--ink-muted)]">&amp;</span>{' '}
                      {r.b.displayName}
                    </span>
                    <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                      {r.kind}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Panel>
          <p className="font-display text-xl">Pair two people</p>
          {withBirth.length < 2 ? (
            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              You need two people with birth moments recorded.{' '}
              <Link href="/people/new" className="underline">
                Add someone
              </Link>
              .
            </p>
          ) : (
            <form action={addRelationship} className="mt-4 flex flex-col gap-3">
              <label className="text-sm" htmlFor="subjectAId">
                First
              </label>
              <select
                id="subjectAId"
                name="subjectAId"
                required
                className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
              >
                {withBirth.map((p) => (
                  <option key={p.subject.id} value={p.subject.id}>
                    {p.subject.displayName}
                  </option>
                ))}
              </select>

              <label className="text-sm" htmlFor="subjectBId">
                Second
              </label>
              <select
                id="subjectBId"
                name="subjectBId"
                required
                defaultValue={withBirth[1]?.subject.id}
                className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
              >
                {withBirth.map((p) => (
                  <option key={p.subject.id} value={p.subject.id}>
                    {p.subject.displayName}
                  </option>
                ))}
              </select>

              <label className="text-sm" htmlFor="kind">
                Relationship
              </label>
              <select
                id="kind"
                name="kind"
                className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
              >
                <option value="partner">Partner</option>
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="professional">Professional</option>
                <option value="other">Other</option>
              </select>

              <SubmitButton pendingLabel="Pairing…">Pair them</SubmitButton>
            </form>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
