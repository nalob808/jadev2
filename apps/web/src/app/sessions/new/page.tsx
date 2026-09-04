import { redirect } from 'next/navigation';
import { listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { addSession } from '@/app/actions';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

const FIELD = 'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-base';

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; subjectId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  await requireCapability(session.workspaceId, 'sessions');

  const { error, subjectId } = await searchParams;
  const clock = await getClock(session.workspaceId);
  const people = await listSubjects(getDatabase(), session.workspaceId);
  if (people.length === 0) redirect('/people/new');

  return (
    <Shell email={session.email}>
      <div className="mb-6">
        <Kicker>New</Kicker>
        <h1 className="font-display text-4xl">Book a session</h1>
      </div>

      <Panel className="max-w-xl">
        <form action={addSession} className="flex flex-col gap-5">
          {error ? (
            <p className="border-l-2 border-[var(--clay)] bg-[var(--paper)] px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="subjectId">
              Who
            </label>
            <select
              id="subjectId"
              name="subjectId"
              required
              defaultValue={subjectId ?? ''}
              className={FIELD}
            >
              <option value="" disabled>
                Choose a person
              </option>
              {people.map(({ subject }) => (
                <option key={subject.id} value={subject.id}>
                  {subject.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="date">
                Date
              </label>
              <input id="date" name="date" type="date" required className={FIELD} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="time">
                Time
              </label>
              <input id="time" name="time" type="time" defaultValue="10:00" className={FIELD} />
            </div>
          </div>

          {/* The zone is stated rather than assumed — the same rule the rest of
              the app follows about clocks. */}
          <p className="-mt-2 text-xs text-[var(--ink-muted)]">
            Read in {clock.cityLabel} ({clock.abbreviation}).
            {clock.assumed ? ' Nobody has set a zone, so this is UTC.' : ''}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="durationMinutes">
                Length
              </label>
              <select
                id="durationMinutes"
                name="durationMinutes"
                defaultValue="60"
                className={FIELD}
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">90 minutes</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="kind">
                Kind
              </label>
              <select id="kind" name="kind" defaultValue="follow_up" className={FIELD}>
                <option value="first">First reading</option>
                <option value="follow_up">Follow-up</option>
                <option value="muhurta">Muhūrta</option>
                <option value="other">Something else</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="location">
              Where <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
            </label>
            <input
              id="location"
              name="location"
              placeholder="Video · the studio · phone"
              className={FIELD}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="prepNote">
              Anything to remember{' '}
              <span className="font-normal text-[var(--ink-muted)]">(optional)</span>
            </label>
            <textarea id="prepNote" name="prepNote" rows={3} className={FIELD} />
            <p className="text-xs text-[var(--ink-muted)]">
              Yours alone. The prep sheet assembles the chart side automatically — this is for what
              only you know.
            </p>
          </div>

          {/* A plain submit button. The pending-state wrapper is documented in
              SubmitButton.tsx and has a known stuck-pending failure after a
              server-action redirect; correctness over a spinner. */}
          <button
            type="submit"
            className="bg-[var(--accent)] px-4 py-2.5 font-display text-lg tracking-wide text-white"
          >
            Book it
          </button>
        </form>
      </Panel>
    </Shell>
  );
}
