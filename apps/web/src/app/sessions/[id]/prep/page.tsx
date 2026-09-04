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
  getSubject,
  listFollowUps,
  listNotes,
  listSessions,
} from '@jade/db';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { PrepSheet } from '@/components/PrepSheet';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

/**
 * The prep sheet, on its own, ready to print.
 *
 * Separate from the session page rather than a print stylesheet over it,
 * because the two want different content: the session page has forms on it,
 * and a printed page with a "Save" button drawn on it looks like a screenshot
 * of software rather than a document you take into a room.
 *
 * Deliberately has no client name styling, no branding and no letterhead. This
 * is the practitioner's working document, not something handed to the client —
 * `/people/[id]/report` is that. Confusing the two is how private notes end up
 * in somebody else's hands.
 */

const PREP_WINDOW_DAYS = 90;

export default async function SessionPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) redirect('/sign-in');
  await requireCapability(auth.workspaceId, 'sessions');

  const { id } = await params;
  const clock = await getClock(auth.workspaceId);
  const database = getDatabase();

  const record = await getSessionById(database, auth.workspaceId, id);
  if (!record) notFound();
  const { session: consult, subjectName } = record;

  const [profile, person, followUps, notes, allSessions] = await Promise.all([
    getSettingsProfile(database, auth.workspaceId, auth.settingsProfileId),
    getSubject(database, auth.workspaceId, consult.subjectId),
    listFollowUps(database, auth.workspaceId, { subjectId: consult.subjectId }),
    listNotes(database, auth.workspaceId, { subjectId: consult.subjectId, limit: 12 }),
    listSessions(database, auth.workspaceId, { subjectId: consult.subjectId }),
  ]);

  if (!profile || !person?.birthEvent) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[var(--ink-muted)]">
          No birth data for {subjectName}, so there is no chart to prepare from.
        </p>
      </main>
    );
  }

  const scheduledMs = consult.scheduledFor.getTime();
  const sessionJd = jdFromUnixMs(scheduledMs);
  const { chart } = await getOrComputeChart(auth.workspaceId, person.birthEvent, profile);
  const birthMs =
    person.birthEvent.utcDatetime instanceof Date
      ? person.birthEvent.utcDatetime.getTime()
      : new Date(person.birthEvent.utcDatetime).getTime();

  const frame: SiderealFrame = {
    ayanamsa: profile.ayanamsa ?? 'lahiri',
    ...(profile.customAyanamsaAtJ2000 != null
      ? { customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 }
      : {}),
  };
  const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType ?? 'mean' });
  const dashas = vimshottari(chart.points.Moon!.longitude, jdFromUnixMs(birthMs), { levels: 3 });

  const sheet = prepSheetFor(chart, {
    dasha: dashaChainAt(dashas, sessionJd),
    transits: sessionTransits(
      provider,
      chart,
      { fromJd: sessionJd - PREP_WINDOW_DAYS, toJd: sessionJd + PREP_WINDOW_DAYS },
      frame,
      sessionJd,
    ),
    sessionJd,
    previous: allSessions
      .filter((r) => r.session.id !== consult.id && r.session.scheduledFor.getTime() < scheduledMs)
      .map((r) => ({
        jdUt: jdFromUnixMs(r.session.scheduledFor.getTime()),
        summary: r.session.summary,
      })),
    openFollowUps: followUps
      .filter((f) => f.doneAt === null)
      .map((f) => ({ body: f.body, dueOn: f.dueOn })),
    recentNotes: notes.map((n) => ({ body: n.body, anchorLabel: n.anchorLabel })),
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule)] pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Preparation · not for the client
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{subjectName}</h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">
            {clock.format(scheduledMs, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            {clock.abbreviation} · {consult.durationMinutes} minutes
          </p>
        </div>
        <PrintButton label="Print prep sheet" />
      </header>

      {consult.prepNote ? (
        <section className="mb-6 border-l-2 border-[var(--accent)] pl-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Your note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{consult.prepNote}</p>
        </section>
      ) : null}

      <PrepSheet sheet={sheet} clock={clock} />

      <footer className="mt-8 border-t border-[var(--rule)] pt-3">
        <p className="text-[11px] leading-relaxed text-[var(--ink-muted)]">
          Computed with {profile.ayanamsa ?? 'lahiri'} ayanāṁśa, {profile.nodeType ?? 'mean'} nodes.
          Positions and dates only — Jade does not predict death, disease or legal outcomes, and
          nothing here is a forecast.
        </p>
      </footer>
    </main>
  );
}
