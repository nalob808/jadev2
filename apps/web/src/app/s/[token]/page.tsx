import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deepNatal, readAllAreas, synthesise } from '@jade/interpret';
import {
  AstronomyEngineProvider,
  dashaChainAt,
  jdFromUnixMs,
  skyNow,
  vimshottari,
} from '@jade/astro';
import { getSettingsProfile, getSubject, openShareLink, recordShareLinkView } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { hashShareToken, looksLikeShareToken } from '@/lib/shareToken';
import { getClock } from '@/lib/clock';
import { AreaCard } from '@/components/AreaCard';
import { ChartSpine } from '@/components/ChartSpine';
import { DeepPassage } from '@/components/DeepPassage';

export const dynamic = 'force-dynamic';

/**
 * A shared reading, for somebody with no account.
 *
 * ## What this page is allowed to be
 *
 * It is one person's reading and nothing else. No navigation into the
 * workspace, no sign-in prompt, no sibling clients, no way to walk from here to
 * anything the practitioner did not send. The route lives outside the app's
 * shell for that reason rather than for a visual one: a layout that carried the
 * menu would carry links the visitor must not be offered, and removing them
 * afterwards is the kind of subtraction somebody re-adds by accident.
 *
 * ## How it stays inside row-level security
 *
 * The visitor has no workspace, so under RLS they can see nothing at all. The
 * token buys exactly one fact — which workspace and which subject — through the
 * narrow function in migration 0014, and every query after that runs scoped to
 * that workspace like any other request. The token is not a bypass; it is a
 * capability naming one row.
 *
 * ## What is not said
 *
 * An unknown token, a revoked one and an expired one all produce the same
 * not-found. Distinguishing them would confirm that a link once existed for
 * somebody, which is information about a client that the person holding a dead
 * URL has not earned.
 */
export const metadata: Metadata = {
  title: 'A reading',
  /*
   * Never indexed. A share link is unlisted, not public — the whole design
   * assumes it is known only to whoever was sent it, and a crawler that finds
   * one in a referrer header or a pasted link must not put it in an index.
   */
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedReadingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  /* Shape first, so a scanner walking /s/ costs a regex rather than a query. */
  if (!looksLikeShareToken(token)) notFound();

  const database = getDatabase();
  const hash = hashShareToken(token);
  const opened = await openShareLink(database, hash);
  if (!opened) notFound();

  const [record, profile] = await Promise.all([
    getSubject(database, opened.workspaceId, opened.subjectId),
    /* The practice's own frame, so the client reads the chart the practitioner cast. */
    getSettingsProfile(database, opened.workspaceId, null),
  ]);
  if (!record?.birthEvent || !profile) notFound();

  const { chart } = await getOrComputeChart(opened.workspaceId, record.birthEvent, profile);
  const passages = deepNatal(chart);
  const spine = synthesise(chart);

  /*
   * The same three layers the practitioner sees: what the chart is about, then
   * every area of the life, then each graha in depth. A shared reading that is
   * only the nine graha passages hands a client the detail and withholds the
   * reading, which is the wrong half to send.
   */
  const clock = await getClock(opened.workspaceId);
  const birthMs =
    record.birthEvent.utcDatetime instanceof Date
      ? record.birthEvent.utcDatetime.getTime()
      : new Date(record.birthEvent.utcDatetime).getTime();
  const chain = dashaChainAt(
    vimshottari(chart.points.Moon!.longitude, jdFromUnixMs(birthMs), {
      levels: 3,
      yearLength: 'julian',
    }),
    clock.nowJd,
  );
  const sky = skyNow(
    new AstronomyEngineProvider({ nodeType: profile.nodeType }),
    clock.nowJd,
    {
      ayanamsa: profile.ayanamsa,
      customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
    },
    ['Jupiter', 'Saturn', 'Rahu', 'Ketu'],
    profile.nodeType,
  );
  const areas = readAllAreas(chart, {
    live: { major: chain[0]!.lord, minor: chain[1]?.lord },
    sky,
  });

  /* Best effort. A counter that fails must never cost the visitor the page. */
  void recordShareLinkView(database, hash).catch(() => undefined);

  const birthLine = opened.showsBirthData
    ? `${record.birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} · ${record.birthEvent.placeName}`
    : null;

  return (
    <main className="mx-auto max-w-[62rem] px-4 py-10">
      <header className="border-b border-[var(--rule)] pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          A reading, shared with you
        </p>
        <h1 className="mt-1 font-display text-[2.6rem] leading-[1.05]">
          {record.subject.displayName}
        </h1>
        {birthLine ? (
          <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">{birthLine}</p>
        ) : null}
        <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
          Every graha in this chart, read by five traditions that worked without each other. Each
          passage shows the placements behind it if you want to see the workings — nothing here is a
          prediction, and nothing here is about health, money or the law.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <ChartSpine synthesis={spine} name={record.subject.displayName} />

        <h2 className="mt-4 border-b border-[var(--rule)] pb-1.5 font-display text-[1.7rem]">
          Every area of the life
        </h2>
        {areas.map((area) => (
          <AreaCard key={area.place} area={area} />
        ))}

        <h2 className="mt-4 border-b border-[var(--rule)] pb-1.5 font-display text-[1.7rem]">
          Every graha, read five ways
        </h2>
        {passages.map((passage) => (
          <DeepPassage key={passage.graha} reading={passage} />
        ))}
      </div>

      <footer className="mt-10 border-t border-[var(--rule)] pt-4">
        <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
          Shared from a Jade practice. This page is unlisted — whoever sent it can withdraw it at
          any time, and it may stop working.
        </p>
      </footer>
    </main>
  );
}
