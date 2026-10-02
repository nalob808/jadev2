import Link from 'next/link';
import { headers } from 'next/headers';
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
  deepNatal,
  readAllAreas,
  synthesise,
  deepTransits,
  plainChartReading,
  plainPeriods,
  plainPlanets,
  plainSadeSati,
} from '@jade/interpret';
import { getSettingsProfile, getSubject } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { workbenchHref } from '@/lib/nav';
import {
  PeriodBar,
  ReadingCard,
  SnapshotStrip,
  ViewNav,
  type SnapshotFact,
} from '@/components/ReadingChrome';
import { AreaCard } from '@/components/AreaCard';
import { Fold } from '@/components/Fold';
import { ChartSpine } from '@/components/ChartSpine';
import { DeepPassage } from '@/components/DeepPassage';
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

  /*
   * The host this page is being served from.
   *
   * Needed because the reading mode answers on read.jadeapp.co as well as on
   * /read here, and a link back to the workbench has to leave that host
   * explicitly. See `workbenchHref`.
   */
  const host = headers().get('host');

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
  /*
   * The deep readings, both halves.
   *
   * `deepNatal` is the permanent chart and `deepTransits` is the season, and
   * they are separate composers rather than one with a tense flag because the
   * traditions disagree far more sharply about a nativity than about a passing
   * sky — see `natalReading.ts`.
   */
  const natalDepth = deepNatal(chart);
  const spine = synthesise(chart);
  /*
   * Every area of life, with the running period marked.
   *
   * The daśā chain is passed so an area can say it is the one the current
   * stretch keeps asking about — which is the difference between a reading of
   * a person and a reading of their year.
   */
  const areas = readAllAreas(chart, {
    live: { major: chain[0]!.lord, minor: chain[1]?.lord },
    sky,
  });
  const transits = deepTransits(chart, sky);
  const sadeSati = plainSadeSati(
    chart,
    sky.find((position) => position.id === 'Saturn'),
  );
  const planets = plainPlanets(chart);

  const active = ['overall', 'depth', 'areas', 'houses', 'planets', 'timing'].includes(view ?? '')
    ? view!
    : 'overall';
  const hrefFor = (key: string): string => `/read/${id}?view=${key}`;
  /*
   * The reference pages live on the public site, which on `read.jadeapp.co` is
   * behind the same rewrite as everything else — so the link has to be built
   * against the apex host the way the workbench link is.
   */
  const hrefForTradition = (tradition: string): string =>
    workbenchHref(`/learn/traditions/${tradition}`, host);

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
    <main className="mx-auto max-w-[62rem] px-4 pb-16 pt-5 sm:py-8">
      {/* ------------------------------------------------------------ header */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            Jade · reading
          </p>
          <h1 className="mt-0.5 font-display text-[1.9rem] leading-tight sm:text-4xl sm:leading-none">
            {record.subject.displayName}
          </h1>
        </div>
        <Link
          href={workbenchHref(`/people/${id}`, host)}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
        >
          the technical chart →
        </Link>
      </header>

      <div className="mt-4">
        <SnapshotStrip facts={snapshot} />
      </div>

      {/*
        The view switcher follows you down the page on a phone.

        A reading runs to thousands of pixels and the switcher is how you move
        between its parts; left at the top it is reachable only by scrolling
        back to the beginning, which is how a reader ends up believing the
        page they are on is the whole of it. `-mx-4 px-4` so the sticky strip
        spans the full width rather than leaving two gutters of page showing
        through it.
      */}
      <div className="sticky top-0 z-20 -mx-4 mt-3 bg-[var(--paper)]/92 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <ViewNav
          views={[
            { key: 'overall', label: 'Overall' },
            { key: 'depth', label: 'In depth', count: natalDepth.length },
            { key: 'areas', label: 'Your life', count: areas.length },
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

          {/*
            The deep transit readings, in place of the one-line versions that
            used to sit here. Not additional to them — the short form said the
            same thing less well, and keeping both would be the redundancy this
            whole layer exists to avoid.
          */}
          {transits.map((transit) => (
            <DeepPassage
              key={transit.graha}
              reading={transit}
              hrefForTradition={hrefForTradition}
            />
          ))}

          <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
            Only the slow planets are read here — Jupiter, Saturn, Rāhu and Ketu. Mars crosses a
            degree in days and the Moon in hours, so at this scale they would bury the two that
            matter. The technical surfaces have them.
          </p>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- depth */}
      {active === 'depth' ? (
        <section className="mt-5 flex flex-col gap-4">
          {/*
            The compile, first. Nine graha cards are nine true statements and no
            reading; what a practitioner does before any of them is notice what
            the chart says twice.
          */}
          <ChartSpine synthesis={spine} name={record.subject.displayName} />

          <p className="border-l-2 border-[var(--rule-strong)] py-1 pl-3 text-[14px] leading-relaxed text-[var(--ink-muted)]">
            Below: every graha one at a time, read by five traditions that had to work without each
            other. They agree about what the twelve places are for and disagree about what a planet
            in one of them is like to live with — which is where the reading is.
          </p>
          {natalDepth.map((passage) => (
            <DeepPassage
              key={passage.graha}
              reading={passage}
              hrefForTradition={hrefForTradition}
            />
          ))}
        </section>
      ) : null}

      {/* ------------------------------------------------------------- areas */}
      {active === 'areas' ? (
        <section className="mt-5 flex flex-col sm:gap-4">
          <p className="border-l-2 border-[var(--rule-strong)] py-1 pl-3 text-[14px] leading-relaxed text-[var(--ink-muted)]">
            Twelve areas, in the order people actually ask about them rather than in house order,
            with whatever the running period touches first. Each one is read from five things at
            once: the sign on the house, where its ruler went, who stands in it, who looks at it,
            and how the chart’s own scoring treats transits through it. There is no total and no
            ranking — one part of a life cannot be scored against another, and anything claiming to
            is selling something.
          </p>
          {areas.map((area) => (
            <Fold
              key={area.place}
              id={`area-${area.place}`}
              title={area.title}
              hint={area.asks}
              open={area.liveNow !== null}
            >
              <AreaCard area={area} />
            </Fold>
          ))}
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
                  href={workbenchHref(`/people/${id}/houses?h=${house.house}`, host)}
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
