import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  dashaChainAt,
  jdFromUnixMs,
  sessionTransits,
  vimshottari,
  type SiderealFrame,
} from '@jade/astro';
import { prepSheetFor } from '@jade/interpret';
import {
  getSettingsProfile,
  getSessionById,
  listFollowUps,
  listNotes,
  listSessions,
} from '@jade/db';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { editSession, addFollowUp, toggleFollowUp } from '@/app/actions';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { PrepSheet } from '@/components/PrepSheet';

export const dynamic = 'force-dynamic';

/**
 * One consultation.
 *
 * The page is ordered the way the hour actually goes: what you need before you
 * sit down, then somewhere to write while you talk, then what you owe them
 * afterwards. Anything that is not one of those three things does not belong
 * here.
 *
 * The prep sheet is computed on the page rather than stored. A stored prep
 * sheet is a snapshot that silently rots — correct the birth time, change the
 * ayanāṁśa, and the sheet still shows what it said last month. Recomputing is
 * a few hundred milliseconds and it is always true.
 */

/** A season either side. Longer buries the near dates; shorter misses the loop. */
const PREP_WINDOW_DAYS = 90;

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; followUpError?: string }>;
}) {
  const auth = await getSession();
  if (!auth) redirect('/sign-in');
  await requireCapability(auth.workspaceId, 'sessions');

  const { id } = await params;
  const { saved, followUpError } = await searchParams;

  const clock = await getClock(auth.workspaceId);
  const database = getDatabase();

  const record = await getSessionById(database, auth.workspaceId, id);
  if (!record) notFound();
  const { session: consult, subjectName } = record;

  const [profile, followUps, notes, allSessions] = await Promise.all([
    getSettingsProfile(database, auth.workspaceId, auth.settingsProfileId),
    listFollowUps(database, auth.workspaceId, { subjectId: consult.subjectId }),
    listNotes(database, auth.workspaceId, { subjectId: consult.subjectId, limit: 12 }),
    listSessions(database, auth.workspaceId, { subjectId: consult.subjectId }),
  ]);

  const scheduledMs = consult.scheduledFor.getTime();
  const sessionJd = jdFromUnixMs(scheduledMs);

  // ------------------------------------------------------------- the prep
  let sheet: ReturnType<typeof prepSheetFor> | null = null;

  if (profile) {
    const { getSubject } = await import('@jade/db');
    const person = await getSubject(database, auth.workspaceId, consult.subjectId);
    if (person?.birthEvent) {
      const { chart } = await getOrComputeChart(auth.workspaceId, person.birthEvent, profile);
      const birthMs =
        person.birthEvent.utcDatetime instanceof Date
          ? person.birthEvent.utcDatetime.getTime()
          : new Date(person.birthEvent.utcDatetime).getTime();
      const birthJd = jdFromUnixMs(birthMs);

      const frame: SiderealFrame = {
        ayanamsa: profile.ayanamsa ?? 'lahiri',
        ...(profile.customAyanamsaAtJ2000 != null
          ? { customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 }
          : {}),
      };
      const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType ?? 'mean' });

      const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, { levels: 3 });
      const chain = dashaChainAt(dashas, sessionJd);
      const transits = sessionTransits(
        provider,
        chart,
        { fromJd: sessionJd - PREP_WINDOW_DAYS, toJd: sessionJd + PREP_WINDOW_DAYS },
        frame,
        sessionJd,
      );

      const previous = allSessions
        .filter(
          (r) => r.session.id !== consult.id && r.session.scheduledFor.getTime() < scheduledMs,
        )
        .map((r) => ({
          jdUt: jdFromUnixMs(r.session.scheduledFor.getTime()),
          summary: r.session.summary,
        }));

      sheet = prepSheetFor(chart, {
        dasha: chain,
        transits,
        sessionJd,
        previous,
        openFollowUps: followUps
          .filter((f) => f.doneAt === null)
          .map((f) => ({ body: f.body, dueOn: f.dueOn })),
        recentNotes: notes.map((n) => ({ body: n.body, anchorLabel: n.anchorLabel })),
      });
    }
  }

  const openFollowUps = followUps.filter((f) => f.doneAt === null);
  const doneFollowUps = followUps.filter((f) => f.doneAt !== null);

  return (
    <Shell email={auth.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>
            {clock.format(scheduledMs, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Kicker>
          <h1 className="font-display text-4xl">{subjectName}</h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">
            {clock.format(scheduledMs, { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {consult.durationMinutes} minutes · {clock.abbreviation}
            {consult.location ? ` · ${consult.location}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/people/${consult.subjectId}`}
            className="border border-[var(--rule-strong)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            The chart
          </Link>
          <Link
            href={`/sessions/${consult.id}/prep`}
            className="border border-[var(--accent)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]"
          >
            Print prep
          </Link>
        </div>
      </div>

      {saved === '1' ? (
        <p className="mb-4 border border-[var(--jade)] bg-[var(--surface)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--jade)]">
          Saved
        </p>
      ) : null}

      {consult.prepNote ? (
        <Panel marked className="mb-6">
          <Kicker>Your note</Kicker>
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed">
            {consult.prepNote}
          </p>
        </Panel>
      ) : null}

      {/* ------------------------------------------------------------ prep */}
      {sheet ? (
        <PrepSheet sheet={sheet} clock={clock} />
      ) : (
        <Panel className="mb-6">
          <p className="text-[var(--ink-muted)]">
            No prep sheet: this person has no birth data recorded, so there is no chart to prepare
            from. Everything else on this page still works.
          </p>
        </Panel>
      )}

      {/* ------------------------------------------------------ follow-ups */}
      <Panel className="mb-6">
        <Kicker>Follow-ups</Kicker>
        {followUpError ? (
          <p className="mt-2 border-l-2 border-[var(--clay)] px-3 py-1.5 text-sm">
            {followUpError}
          </p>
        ) : null}

        {openFollowUps.length === 0 && doneFollowUps.length === 0 ? (
          <p className="mt-1.5 text-[13.5px] text-[var(--ink-muted)]">
            Nothing yet. These carry forward to the next session with this person, whether or not
            they are attached to this one.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {[...openFollowUps, ...doneFollowUps].map((followUp) => (
              <li key={followUp.id} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
                <form action={toggleFollowUp}>
                  <input type="hidden" name="id" value={followUp.id} />
                  <input type="hidden" name="done" value={followUp.doneAt ? '0' : '1'} />
                  <input type="hidden" name="returnTo" value={`/sessions/${consult.id}`} />
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]"
                  >
                    {followUp.doneAt ? 'reopen' : 'done'}
                  </button>
                </form>
                <span className={followUp.doneAt ? 'text-[var(--ink-faint)] line-through' : ''}>
                  {followUp.body}
                </span>
                {followUp.dueOn ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                    by {followUp.dueOn}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form action={addFollowUp} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="sessionId" value={consult.id} />
          <input type="hidden" name="subjectId" value={consult.subjectId} />
          <input
            name="body"
            placeholder="Revisit the 10th when Saturn stations"
            className="min-w-[16rem] flex-1 border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <input
            name="dueOn"
            type="date"
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border border-[var(--rule-strong)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Add
          </button>
        </form>
      </Panel>

      {/* -------------------------------------------------------- afterward */}
      <Panel>
        <Kicker>Afterwards</Kicker>
        <form action={editSession} className="mt-2 flex flex-col gap-3">
          <input type="hidden" name="id" value={consult.id} />
          <textarea
            name="summary"
            rows={5}
            defaultValue={consult.summary ?? ''}
            placeholder="What you actually covered, in your words."
            className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-[14px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              name="status"
              defaultValue={consult.status}
              className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="scheduled">Scheduled</option>
              <option value="held">Held</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="submit"
              className="bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white"
            >
              Save
            </button>
          </div>
        </form>
      </Panel>
    </Shell>
  );
}
