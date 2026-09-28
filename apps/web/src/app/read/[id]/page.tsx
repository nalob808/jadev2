import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { plainChartReading } from '@jade/interpret';
import { getSettingsProfile, getSubject } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Workings } from '@/components/Workings';

export const dynamic = 'force-dynamic';

/**
 * A chart, explained.
 *
 * ## The register
 *
 * Everything else in Jade is written for somebody who already knows the words.
 * This page is written for somebody who does not, and the difference is not
 * simplification — it is the same facts with the workings moved from beside
 * each sentence to behind it, and permission to join several placements into
 * one observation.
 *
 * ## What that costs, and the guard on it
 *
 * Prose written to be believed is believed, so the one rule that does not
 * relax here is the rule about death, illness and legal outcome. That guard
 * runs against the composed output in `plainReading.test.ts`, at full strength,
 * precisely because this is the surface where a person is least equipped to
 * discount what they read.
 *
 * ## Layout
 *
 * One column, generously set, no chart drawn at the top. The wheel is a
 * professional instrument and putting it here would tell the reader they are in
 * the wrong place before they read a word. A link through to the technical view
 * sits at the bottom of each house for anyone who wants it.
 */

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const database = getDatabase();
  const [record, profile] = await Promise.all([
    getSubject(database, session.workspaceId, id),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
  ]);
  if (!record?.birthEvent || !profile) notFound();

  const { chart } = await getOrComputeChart(session.workspaceId, record.birthEvent, profile);
  const reading = plainChartReading(chart);

  return (
    <main className="mx-auto max-w-[44rem] px-5 py-10">
      <header className="border-b-2 border-[var(--ink)] pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
          Your chart, explained
        </p>
        <h1 className="mt-1 font-display text-4xl leading-none">{record.subject.displayName}</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
          Twelve houses, each one a part of life. Nothing here is a prediction — it is a description
          of what your chart contains and what the tradition says those things mean. Every paragraph
          will show you the placements behind it if you ask.
        </p>
      </header>

      {/* ------------------------------------------------------ the whole chart */}
      {reading.overall.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl leading-tight">First, the shape of it</h2>
          <div className="mt-3 flex flex-col gap-4">
            {reading.overall.map((paragraph) => (
              <div key={paragraph.text.slice(0, 40)}>
                <p className="text-[17px] leading-[1.65]">{paragraph.text}</p>
                <Workings workings={paragraph.workings} source={paragraph.source} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- the houses */}
      {reading.houses.map((house) => (
        <section key={house.house} className="mt-10 border-t border-[var(--rule)] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            House {house.house}
          </p>
          <h2 className="mt-1 font-display text-3xl leading-tight">{house.title}</h2>
          {/* The question somebody actually arrives with, in their words. */}
          <p className="mt-1 text-[15px] italic leading-relaxed text-[var(--ink-muted)]">
            {house.asks}
          </p>

          <div className="mt-4 flex flex-col gap-4">
            {house.paragraphs.map((paragraph, index) => (
              <div key={`${house.house}-${index}`}>
                <p className="text-[17px] leading-[1.65]">{paragraph.text}</p>
                <Workings workings={paragraph.workings} source={paragraph.source} />
              </div>
            ))}
          </div>

          <Link
            href={`/people/${id}/houses?h=${house.house}`}
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            the technical reading of this house →
          </Link>
        </section>
      ))}

      <footer className="mt-12 border-t border-[var(--rule)] pt-4">
        <p className="text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          This reading is assembled from your chart and a written library of what each house, planet
          and connection means — not generated fresh each time, and not copied from any book. Where
          a statement rests on a classical rule, the source is named beside it.
        </p>
        <Link
          href={`/people/${id}`}
          className="mt-3 inline-block font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
        >
          ← the full chart
        </Link>
      </footer>
    </main>
  );
}
