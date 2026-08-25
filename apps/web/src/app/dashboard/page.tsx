import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  dashaChainAt,
  jdFromUnixMs,
  panchangaNow,
  skyNow,
  skyOutlook,
  vimshottari,
  type SiderealFrame,
} from '@jade/astro';
import { grahaSignification, houseSignification } from '@jade/interpret';
import { getSettingsProfile, listNotes, listSubjects, listUpcomingHits } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart, toChartSettings } from '@/lib/chart';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

/**
 * The first screen after signing in.
 *
 * Two halves, deliberately separated. **Yours** is about one person — the
 * subject marked `self` — and answers "what is running for me". **The sky** is
 * about nobody, and answers "what is the day doing". Mixing them is how a
 * dashboard becomes a horoscope: a general transit reads as a personal
 * prediction the moment it sits under someone's name.
 *
 * Everything time-dependent takes `now` as an explicit argument into the pure
 * core. This page reads the clock exactly once, at the top, and passes that
 * number down — which is what keeps `packages/astro` free of `Date.now()` and
 * makes every panel below reproducible for a given instant.
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

const GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
};

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** Julian Day back to a calendar date, for labelling a row. */
function dateFromJd(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function dayLabel(jd: number, offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return dateFromJd(jd).toLocaleDateString(undefined, { weekday: 'long' });
}

function Stat({ n, label, href }: { n: string | number; label: string; href?: string }) {
  const inner = (
    <>
      <span className="block font-mono text-2xl font-medium text-[var(--ink)]">{n}</span>
      <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
        {label}
      </span>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[var(--surface-alt)]"
    >
      {inner}
    </Link>
  ) : (
    <div className="bg-[var(--surface)] px-4 py-4">{inner}</div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  // The clock is read once, here, and passed down as a number.
  const nowMs = Date.now();
  const nowJd = jdFromUnixMs(nowMs);

  const database = getDatabase();
  const [people, profile, notes, hits] = await Promise.all([
    listSubjects(database, session.workspaceId),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
    listNotes(database, session.workspaceId, { limit: 4 }),
    listUpcomingHits(database, {
      workspaceId: session.workspaceId,
      fromDate: new Date(nowMs),
      limit: 8,
    }),
  ]);

  // The lens is never defaulted silently — constitution item 3. Without a
  // profile the sky panels are still correct because they state their frame.
  const frame: SiderealFrame = {
    ayanamsa: profile?.ayanamsa ?? 'lahiri',
    ...(profile?.customAyanamsaAtJ2000 != null
      ? { customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 }
      : {}),
  };

  const provider = new AstronomyEngineProvider({ nodeType: profile?.nodeType ?? 'mean' });
  const panchanga = panchangaNow(provider, nowJd, frame);
  const sky = skyNow(provider, nowJd, frame);
  const outlook = skyOutlook(provider, Math.floor(nowJd - 0.5) + 0.5, frame, { days: 7 });

  // "Me" is the subject marked self; failing that, the most recently touched.
  const self = people.find((p) => p.subject.relationship === 'self') ?? people[0] ?? null;

  let personal: {
    name: string;
    id: string;
    chain: string;
    lord: string;
    lordHouse: number | null;
  } | null = null;

  if (self?.birthEvent && profile) {
    const { chart } = await getOrComputeChart(session.workspaceId, self.birthEvent, profile);
    const birthJd = jdFromUnixMs(
      self.birthEvent.utcDatetime instanceof Date
        ? self.birthEvent.utcDatetime.getTime()
        : new Date(self.birthEvent.utcDatetime).getTime(),
    );
    const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, { levels: 3 });
    const chain = dashaChainAt(dashas, nowJd);
    const lord = chain[0]?.lord ?? '';
    personal = {
      name: self.subject.displayName,
      id: self.subject.id,
      chain: chain.map((p) => p.lord).join(' → '),
      lord,
      lordHouse: chart.points[lord]?.house ?? null,
    };
  }

  const lens = toChartSettings(profile ?? ({ ayanamsa: 'lahiri' } as never));

  return (
    <Shell email={session.email}>
      <div className="jade-rise mb-6">
        <Kicker>
          {new Date(nowMs).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Kicker>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.06]">
          {panchanga.tithi.name} · {panchanga.nakshatra.name}
        </h1>
        <p className="mt-1 max-w-[62ch] text-[var(--ink-muted)]">
          {panchanga.tithi.paksha === 'shukla' ? 'Waxing' : 'Waning'} fortnight,{' '}
          {panchanga.yoga.name} yoga, {panchanga.karana.name} karaṇa. Moon{' '}
          {degrees(panchanga.nakshatra.degreesInto)} into {panchanga.nakshatra.name}, pāda{' '}
          {panchanga.nakshatra.pada}.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {lens.ayanamsa} ayanāṁśa · {lens.nodeType} nodes · {lens.houseSystem.replace('_', ' ')}{' '}
          houses
        </p>
      </div>

      {/* ------------------------------------------------------------ practice */}
      <div className="mb-8 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-4">
        <Stat n={people.length} label="People" href="/people" />
        <Stat n={notes.length >= 4 ? '4+' : notes.length} label="Recent notes" href="/notes" />
        <Stat n={hits.length} label="Upcoming alerts" />
        <Stat n={outlook.ingresses.length + outlook.stations.length} label="Sky events this week" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- yours */}
        <section>
          <div className="mb-3 border-b border-[var(--rule)] pb-2">
            <Kicker>Yours</Kicker>
            <h2 className="font-display text-2xl font-semibold">
              {personal ? personal.name : 'Nobody marked as you yet'}
            </h2>
          </div>

          {personal ? (
            <div className="flex flex-col gap-3">
              <Panel marked>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  Running daśā
                </p>
                <p className="mt-1 font-display text-2xl">{personal.chain}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-muted)]">
                  {grahaSignification(personal.lord)?.summary ?? ''}
                  {personal.lordHouse
                    ? ` In this chart ${personal.lord} sits in the ${ORDINALS[personal.lordHouse - 1]} house — ${houseSignification(personal.lordHouse)?.keywords.slice(0, 3).join(', ')}.`
                    : ''}
                </p>
                <Link
                  href={`/people/${personal.id}`}
                  className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] transition-opacity hover:opacity-70"
                >
                  Open the chart →
                </Link>
              </Panel>

              <Panel>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                  Watches
                </p>
                {hits.length === 0 ? (
                  <p className="mt-2 text-[14px] text-[var(--ink-muted)]">
                    No alerts queued. A watch fires when a transiting graha reaches a natal point,
                    changes sign, or turns.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {hits.slice(0, 5).map((hit) => (
                      <li key={hit.id} className="border-l-2 border-[var(--clay)] pl-3">
                        <p className="text-[14px] text-[var(--ink)]">{hit.title}</p>
                        <p className="font-mono text-[10px] text-[var(--ink-faint)]">
                          {hit.subject.displayName} ·{' '}
                          {new Date(hit.occursAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {notes.length > 0 ? (
                <Panel>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                    Last written
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {notes.slice(0, 3).map((note) => (
                      <li key={note.id} className="border-l-2 border-[var(--rule)] pl-3">
                        <p className="line-clamp-2 text-[14px] leading-snug text-[var(--ink-muted)]">
                          {note.body}
                        </p>
                        {note.anchorLabel ? (
                          <p className="font-mono text-[10px] text-[var(--accent)]">
                            {note.anchorLabel}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/notes"
                    className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  >
                    All notes →
                  </Link>
                </Panel>
              ) : null}
            </div>
          ) : (
            <Panel>
              <p className="text-[var(--ink-muted)]">
                Add yourself as a person and set the relationship to <em>Me</em>, and this side
                fills with your running daśā, your alerts and your notes.
              </p>
              <Link
                href="/people/new"
                className="mt-4 inline-block border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
              >
                Add a person
              </Link>
            </Panel>
          )}
        </section>

        {/* ------------------------------------------------------- the sky */}
        <section>
          <div className="mb-3 border-b border-[var(--rule)] pb-2">
            <Kicker>The sky</Kicker>
            <h2 className="font-display text-2xl font-semibold">Where everything is</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
              True of everyone. Nothing here is about you.
            </p>
          </div>

          <div className="overflow-x-auto border border-[var(--rule)] bg-[var(--surface)]">
            <table aria-label="Current positions" className="w-full text-sm">
              <tbody>
                {sky.map((point) => (
                  <tr key={point.id} className="border-b border-[var(--rule)] last:border-b-0">
                    <td className="w-8 py-1.5 pl-3 text-[var(--accent)]">
                      {GLYPHS[point.id]}
                      {'︎'}
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--ink)]">{point.id}</td>
                    <td className="py-1.5 pr-3 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {degrees(point.degreesInSign)} {point.sign}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-[var(--ink-faint)]">
                      {point.nakshatra}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-[10px] text-[var(--clay)]">
                      {point.retrograde ? 'R' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {outlook.ingresses.length || outlook.stations.length ? (
            <Panel className="mt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                Exact events this week
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {[
                  ...outlook.ingresses.map((i) => ({
                    jd: i.jdUt,
                    // `retrograde` here means it backed into the sign it just
                    // left, which reads very differently from a clean entry.
                    text: `${i.body} ${i.retrograde ? 're-enters' : 'enters'} ${i.sign}`,
                  })),
                  ...outlook.stations.map((s) => ({
                    jd: s.jdUt,
                    text: `${s.body} turns ${s.direction}`,
                  })),
                ]
                  .sort((a, b) => a.jd - b.jd)
                  .map((event) => (
                    <li
                      key={`${event.text}-${event.jd}`}
                      className="flex items-baseline justify-between gap-3 border-l-2 border-[var(--accent)] pl-3"
                    >
                      <span className="text-[14px] text-[var(--ink)]">{event.text}</span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--ink-faint)]">
                        {dateFromJd(event.jd).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            </Panel>
          ) : null}
        </section>
      </div>

      {/* ----------------------------------------------------------- the week */}
      <section className="mt-10">
        <div className="mb-3 border-b border-[var(--rule)] pb-2">
          <Kicker>The week</Kicker>
          <h2 className="font-display text-2xl font-semibold">Seven days of Moon</h2>
          <p className="mt-1 max-w-[68ch] text-[13px] text-[var(--ink-faint)]">
            Sampled once per day at midnight UT. A row says where the Moon is at that moment — it is
            not an exact instant the way the events above are.
          </p>
        </div>

        <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-4 lg:grid-cols-7">
          {outlook.days.map((day, index) => (
            <div
              key={day.jdUt}
              className="jade-rise flex flex-col gap-1 bg-[var(--surface)] px-3 py-3"
              style={{ '--i': index } as React.CSSProperties}
            >
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {dayLabel(day.jdUt, day.offset)}
              </p>
              <p className="font-display text-lg leading-tight text-[var(--ink)]">{day.moonSign}</p>
              <p className="font-mono text-[10px] leading-snug text-[var(--ink-muted)]">
                {day.moonNakshatra}
              </p>
              <p className="font-mono text-[10px] text-[var(--ink-faint)]">{day.tithi.name}</p>
              {day.moonChangesSign ? (
                <p className="mt-auto pt-1 font-mono text-[9px] uppercase tracking-wider text-[var(--accent)]">
                  changes sign
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
