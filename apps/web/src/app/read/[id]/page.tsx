import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  dashaChainAt,
  jdFromUnixMs,
  skyNow,
  unixMsFromJd,
  vimshottari,
} from '@jade/astro';
import {
  plainChartReading,
  plainPeriods,
  plainPlanets,
  plainSadeSati,
  plainTransits,
} from '@jade/interpret';
import { getSettingsProfile, getSubject } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import {
  PeriodBar,
  ReadingCard,
  SnapshotStrip,
  ViewNav,
  type SnapshotFact,
} from '@/components/ReadingChrome';
import { Workings } from '@/components/Workings';

export const dynamic = 'force-dynamic';

/**
 * A chart, explained — as an instrument rather than an article.
 *
 * ## Four sections, because they are four questions
 *
 * *Overall* is the shape of the chart. *Houses* answers "what about my
 * seventh". *Planets* answers "what is my Saturn doing", which the house view
 * scatters and gathers nowhere — a planet rules two houses and sits in a third.
 * *Timing* answers "what is going on with me now", which is the question people
 * actually arrive with and the one the first cut could not answer at all.
 *
 * The section lives in the URL for the same reasons the wheel's selection does:
 * reload keeps it, back walks it, a link carries it, and the page needs no
 * JavaScript to operate.
 *
 * ## What is computed here and what is not
 *
 * The chart comes from the cache. The transiting sky is computed live from the
 * reference provider, once, and handed to the composers — they take `nowJd` as
 * an argument and read no clock of their own, so the reading is reproducible
 * and testable.
 */

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

/** The transits worth naming in a reading. The fast ones are noise at this scale. */
const SLOW = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'] as const;

export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const { view } = await searchParams;

  const database = getDatabase();
  const [clock, record, profile] = await Promise.all([
    getClock(session.workspaceId),
    getSubject(database, session.workspaceId, id),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
  ]);
  if (!record?.birthEvent || !profile) notFound();

  const { chart } = await getOrComputeChart(session.workspaceId, record.birthEvent, profile);

  const birthMs =
    record.birthEvent.utcDatetime instanceof Date
      ? record.birthEvent.utcDatetime.getTime()
      : new Date(record.birthEvent.utcDatetime).getTime();
  const birthJd = jdFromUnixMs(birthMs);
  const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, {
    levels: 3,
    yearLength: 'julian',
  });
  const chain = dashaChainAt(dashas, clock.nowJd);

  /* The sky once, from the reference provider, with the profile's node type. */
  const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType });
  const frame = {
    ayanamsa: profile.ayanamsa,
    customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
  };
  const sky = skyNow(provider, clock.nowJd, frame, [...SLOW], profile.nodeType);

  const reading = plainChartReading(chart);
  const periods = plainPeriods(chart, chain, clock.nowJd);
  const transits = plainTransits(chart, sky);
  const sadeSati = plainSadeSati(
    chart,
    sky.find((position) => position.id === 'Saturn'),
  );
  const planets = plainPlanets(chart);

  const active = ['overall', 'houses', 'planets', 'timing'].includes(view ?? '')
    ? view!
    : 'overall';
  const hrefFor = (key: string): string => `/read/${id}?view=${key}`;

  const day = (jd: number): string =>
    clock.format(unixMsFromJd(jd), { month: 'short', year: 'numeric' });

  const moon = chart.points.Moon!;
  const lagna = chart.points.Ascendant!;
  const running = periods[0];
  const sub = periods[1];

  const snapshot: SnapshotFact[] = [
    {
      label: 'Rising sign',
      value: lagna.sign,
      detail: `${lagna.degreesInSign.toFixed(1)}° — how you meet the world`,
      tone: 'accent',
    },
    {
      label: 'Moon',
      value: moon.sign,
      detail: `${moon.nakshatra.name} — your mind day to day`,
    },
    {
      label: 'Main period',
      value: running ? running.lord : '—',
      detail: running ? `until ${day(running.endJd)}` : undefined,
      tone: 'jade',
    },
    {
      label: 'Sub-period',
      value: sub ? sub.lord : '—',
      detail: sub ? `until ${day(sub.endJd)}` : undefined,
    },
  ];

  return (
    <main className="mx-auto max-w-[62rem] px-4 py-8">
      {/* ------------------------------------------------------------ header */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Jade · reading
          </p>
          <h1 className="mt-0.5 font-display text-4xl leading-none">
            {record.subject.displayName}
          </h1>
        </div>
        <Link
          href={`/people/${id}`}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
        >
          the technical chart →
        </Link>
      </header>

      <div className="mt-4">
        <SnapshotStrip facts={snapshot} />
      </div>

      <div className="mt-3">
        <ViewNav
          views={[
            { key: 'overall', label: 'Overall' },
            { key: 'timing', label: 'Right now', count: transits.length + periods.length },
            { key: 'houses', label: 'Houses', count: reading.houses.length },
            { key: 'planets', label: 'Planets', count: planets.length },
          ]}
          active={active}
          hrefFor={hrefFor}
        />
      </div>

      {/* ----------------------------------------------------------- overall */}
      {active === 'overall' ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {reading.overall.map((paragraph, index) => (
            <article
              key={index}
              className="border border-[var(--rule)] bg-[var(--surface)] px-4 py-3.5"
            >
              <p className="text-[15px] leading-[1.55]">{paragraph.text}</p>
              <Workings workings={paragraph.workings} source={paragraph.source} />
            </article>
          ))}
          <article className="border border-dashed border-[var(--rule-strong)] px-4 py-3.5 md:col-span-2">
            <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">
              Nothing here is a prediction. It is a description of what your chart contains and what
              the tradition says those things mean — every paragraph will show you the placements
              behind it. Where a statement rests on a classical rule, the source is named.
            </p>
          </article>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ timing */}
      {active === 'timing' ? (
        <section className="mt-5 flex flex-col gap-4">
          {periods.map((period) => (
            <ReadingCard
              key={`${period.level}-${period.lord}`}
              eyebrow={
                period.level === 1
                  ? 'Main period'
                  : period.level === 2
                    ? 'Sub-period'
                    : 'Sub-sub-period'
              }
              title={`${period.lord}`}
              data={[
                { label: 'Runs', value: `${day(period.startJd)} — ${day(period.endJd)}` },
                { label: 'Remaining', value: `${(period.remainingDays / 365.25).toFixed(1)} yrs` },
              ]}
              paragraphs={period.paragraphs}
              footer={
                <PeriodBar
                  elapsed={period.elapsed}
                  from={day(period.startJd)}
                  to={day(period.endJd)}
                  remaining={
                    period.remainingDays > 365
                      ? `${(period.remainingDays / 365.25).toFixed(1)} yrs`
                      : `${Math.round(period.remainingDays / 30.44)} mths`
                  }
                />
              }
            />
          ))}

          {sadeSati ? (
            <ReadingCard eyebrow="Saturn and your Moon" title="Sade sati" paragraphs={[sadeSati]} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {transits.map((paragraph, index) => (
              <article
                key={index}
                className="border border-[var(--rule)] bg-[var(--surface)] px-4 py-3.5"
              >
                <p className="text-[15px] leading-[1.55]">{paragraph.text}</p>
                <Workings workings={paragraph.workings} source={paragraph.source} />
              </article>
            ))}
          </div>

          <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
            Only the slow planets are read here — Jupiter, Saturn, Rāhu and Ketu. Mars crosses a
            degree in days and the Moon in hours, so at this scale they would bury the two that
            matter. The technical surfaces have them.
          </p>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ houses */}
      {active === 'houses' ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {reading.houses.map((house) => (
            <ReadingCard
              key={house.house}
              eyebrow={`House ${house.house}`}
              title={house.title}
              subtitle={house.asks}
              data={[
                { label: 'Sign', value: house.technical.sign },
                {
                  label: 'Ruler',
                  value: `${house.technical.lord.lord} → ${ORDINALS[house.technical.lord.inHouse - 1]}`,
                  tone: house.technical.lord.ownHouse ? 'jade' : 'default',
                },
                {
                  label: 'In it',
                  value:
                    house.technical.occupants.length === 0
                      ? 'empty'
                      : house.technical.occupants.map((o) => o.graha).join(', '),
                },
              ]}
              paragraphs={house.paragraphs}
              footer={
                <Link
                  href={`/people/${id}/houses?h=${house.house}`}
                  className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
                >
                  technical reading →
                </Link>
              }
            />
          ))}
        </section>
      ) : null}

      {/* ----------------------------------------------------------- planets */}
      {active === 'planets' ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {planets.map((planet) => (
            <ReadingCard
              key={planet.id}
              eyebrow={
                planet.rules.length > 0
                  ? `Rules your ${planet.rules.map((house) => ORDINALS[house - 1]).join(' & ')}`
                  : 'No house ruled'
              }
              title={planet.title}
              data={[
                { label: 'Sign', value: planet.sign },
                { label: 'House', value: ORDINALS[planet.house - 1] ?? `${planet.house}` },
                ...(planet.dignity
                  ? [
                      {
                        label: 'Condition',
                        value: planet.dignity.replace('_', ' '),
                        tone:
                          planet.dignity === 'exalted' ||
                          planet.dignity === 'own' ||
                          planet.dignity === 'moolatrikona'
                            ? ('jade' as const)
                            : planet.dignity === 'debilitated'
                              ? ('clay' as const)
                              : ('default' as const),
                      },
                    ]
                  : []),
                ...(planet.retrograde
                  ? [{ label: 'Motion', value: 'retrograde', tone: 'clay' as const }]
                  : []),
              ]}
              paragraphs={planet.paragraphs}
            />
          ))}
        </section>
      ) : null}

      <footer className="mt-10 border-t border-[var(--rule)] pt-4">
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          Assembled from your chart and a written library of what each house, planet, period and
          transit means — not generated fresh each time, and not copied from any book. Positions
          computed with {profile.ayanamsa} ayanāṁśa and {profile.nodeType} nodes.
        </p>
      </footer>
    </main>
  );
}
