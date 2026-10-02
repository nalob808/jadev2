import { notFound, redirect } from 'next/navigation';
import { jdFromUnixMs, vimshottari } from '@jade/astro';
import { buildScopeIndex, glossaryContextFor, houseReadings } from '@jade/interpret';
import { getSettingsProfile, getSubject, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Shell } from '@/components/Shell';
import { GlossaryProvider } from '@/components/Glossary';
import { HouseCard, HouseChips } from '@/components/HouseCards';
import { Fold } from '@/components/Fold';

export const dynamic = 'force-dynamic';

/**
 * One person's twelve houses.
 *
 * ## Why this is its own page
 *
 * The person page is already long, and it answers "what is this chart". This one
 * answers a different question — "what about my seventh?" — and it answers it
 * twelve times. Putting it inline would have made the longest page in Jade
 * roughly twice as long, and the two questions are asked at different moments.
 *
 * ## One house or all twelve
 *
 * `?h=7` narrows to a single house, which is the state you want when you are
 * reading one thing, and the chip row is the only control. Twelve full cards is
 * the default because seeing them together is how the *pattern* becomes visible
 * — which houses are busy, which are empty, where the lords went.
 */

export default async function HousesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ h?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const { h } = await searchParams;

  const database = getDatabase();
  const [clock, record, profile, everyone] = await Promise.all([
    getClock(session.workspaceId),
    getSubject(database, session.workspaceId, id),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
    listSubjects(database, session.workspaceId),
  ]);

  if (!record?.birthEvent || !profile) notFound();

  const { chart } = await getOrComputeChart(session.workspaceId, record.birthEvent, profile);

  const birthMs =
    record.birthEvent.utcDatetime instanceof Date
      ? record.birthEvent.utcDatetime.getTime()
      : new Date(record.birthEvent.utcDatetime).getTime();
  const dashas = vimshottari(chart.points.Moon!.longitude, jdFromUnixMs(birthMs), {
    levels: 3,
    yearLength: 'julian',
  });

  const readings = houseReadings(chart);

  const requested = Number.parseInt(h ?? '', 10);
  const active =
    Number.isInteger(requested) && requested >= 1 && requested <= 12 ? requested : null;
  const shown = active ? readings.filter((reading) => reading.house === active) : readings;

  const glossary = glossaryContextFor({
    chart,
    dasha: dashas,
    nowJd: clock.nowJd,
    subject: record.subject.displayName,
  });
  const scopes = buildScopeIndex(chart, { dasha: dashas, nowJd: clock.nowJd });

  /** Comparison needs somebody to compare with. */
  const others = everyone.filter(
    (candidate) => candidate.birthEvent && candidate.subject.id !== id,
  );

  const hrefFor = (house: number | null): string =>
    house === null ? `/people/${id}/houses` : `/people/${id}/houses?h=${house}`;

  const occupied = readings.filter((reading) => reading.occupants.length > 0).length;

  return (
    <Shell
      email={session.email}
      subject={{
        id: record.subject.id,
        name: record.subject.displayName,
        kicker: 'The twelve houses',
      }}
    >
      <GlossaryProvider lines={glossary.lines} scopes={scopes}>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          Each house with the sign on it, its lord and where that lord went, what sits in it and
          what aspects it — then what those four things come to, with the placements printed beside
          every line so you can check it rather than take it on trust.
        </p>

        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          {occupied} of 12 houses occupied · whole-sign houses, so house and sign are the same thing
        </p>

        <div className="mt-4 border-y border-[var(--rule)] py-3">
          <HouseChips readings={readings} active={active} hrefFor={hrefFor} />
          <p className="mt-1.5 font-mono text-[9.5px] text-[var(--ink-faint)]">
            ◆ is how many grahas sit in that house. Pick one to read it on its own.
          </p>
        </div>

        {/*
          Folded on a phone, open from `sm`.

          All twelve expanded measured 16,500px — twenty screens, which in
          practice means houses eight through twelve were never seen on a
          phone. Closed, each one is a row naming the house and what it is
          for, and the chips above still jump straight to any of them. When a
          single house is picked there is nothing to fold, so it opens.
        */}
        <div className="mt-5 flex flex-col sm:gap-5">
          {shown.map((reading, index) => (
            <Fold
              key={reading.house}
              id={`house-${reading.house}`}
              title={`House ${reading.house} — ${reading.signification.title}`}
              hint={reading.signification.summary}
              open={shown.length === 1 || index === 0}
            >
              <HouseCard
                reading={reading}
                compareHref={
                  others.length > 0 ? `/houses?house=${reading.house}&with=${id}` : undefined
                }
              />
            </Fold>
          ))}
        </div>

        <p className="mt-8 border-t border-[var(--rule)] pt-3 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
          Every sentence above is assembled from this chart plus the significations library, and
          carries the placements it rests on. Nothing here is a stored paragraph about a combination
          — where a statement rests on a classical rule rather than on arithmetic, the citation is
          printed with it. Significations are cited per house; where authorities differ, the
          house&rsquo;s own text says so.
        </p>
      </GlossaryProvider>
    </Shell>
  );
}
