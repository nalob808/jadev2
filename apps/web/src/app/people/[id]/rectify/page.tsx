import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSettingsProfile, getSubject, listLifeEvents } from '@jade/db';
import {
  AstronomyEngineProvider,
  LIFE_EVENTS,
  RECTIFICATION_CAVEAT,
  gregorianToJd,
  jdFromUnixMs,
  rectify,
  unixMsFromJd,
  type LifeEventKind,
} from '@jade/astro';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { addLifeEvent, removeLifeEvent, toggleLifeEvent } from '@/app/actions';
import { CandidateList } from '@/components/CandidateList';

export const dynamic = 'force-dynamic';

/**
 * The rectification workspace.
 *
 * Birth time rectification is the problem professional astrologers pay for and
 * nothing good exists for. It is also the easiest place in this whole product
 * to produce something confident and worthless, so the page is arranged around
 * three refusals:
 *
 *  - it never names a corrected time, only a ranked shortlist;
 *  - every candidate shows the rules that scored it and the placements behind
 *    them, so a practitioner can disagree with a specific line rather than
 *    with a number;
 *  - it reports which rules failed to discriminate, because a rule that fires
 *    for every candidate in the window has ranked nothing, and hiding that is
 *    how a tool starts lying politely.
 *
 * The sweep runs on the server on each load rather than behind a button. It is
 * a pure function of the events and the window, so there is nothing to cache
 * and nothing to invalidate — adding an event simply changes the answer.
 */

const STEP_CHOICES = [1, 2, 4, 5, 10, 15, 30] as const;

function parseWindowHours(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 12 ? value : 2;
}

export default async function RectifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; hours?: string; step?: string; added?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const query = await searchParams;
  const windowHours = parseWindowHours(query.hours);
  const stepMinutes = STEP_CHOICES.includes(Number(query.step) as never) ? Number(query.step) : 4;

  const database = getDatabase();
  const record = await getSubject(database, session.workspaceId, id);
  if (!record?.birthEvent) notFound();
  const { subject, birthEvent } = record;

  const profile = await getSettingsProfile(
    database,
    session.workspaceId,
    session.settingsProfileId,
  );
  if (!profile) notFound();

  const clock = await getClock(session.workspaceId);
  const events = await listLifeEvents(database, session.workspaceId, subject.id);
  const enabled = events.filter((event) => event.enabled);

  const recordedJd = jdFromUnixMs(
    birthEvent.utcDatetime instanceof Date
      ? birthEvent.utcDatetime.getTime()
      : new Date(birthEvent.utcDatetime).getTime(),
  );

  const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType });

  // The window is centred on the time already on record. That is the right
  // prior: a practitioner rectifying "around 7am" has better information than
  // a blind sweep of the whole day, and centring respects it.
  const halfWindow = windowHours / 2 / 24;
  const result =
    enabled.length > 0
      ? rectify(provider, {
          location: {
            latitude: birthEvent.latitude,
            longitude: birthEvent.longitude,
            elevation: birthEvent.elevationM,
          },
          fromJd: recordedJd - halfWindow,
          toJd: recordedJd + halfWindow,
          stepMinutes,
          houseSystem: profile.houseSystem,
          ayanamsaMode: profile.ayanamsa,
          ...(profile.customAyanamsaAtJ2000 != null
            ? { customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 }
            : {}),
          events: enabled.map((event) => {
            const [y, m, d] = event.occurredOn.split('-').map(Number) as [number, number, number];
            return {
              kind: event.kind as LifeEventKind,
              // Noon UT: the event date is a date, and noon is the point that
              // minimises the error of not knowing the hour.
              jdUt: gregorianToJd(y, m, d) + 0.5,
            };
          }),
        })
      : null;

  const link = (patch: Record<string, string>): string => {
    const next = new URLSearchParams({ hours: String(windowHours), step: String(stepMinutes) });
    for (const [key, value] of Object.entries(patch)) next.set(key, value);
    return `/people/${subject.id}/rectify?${next.toString()}`;
  };

  return (
    <Shell email={session.email}>
      <div className="jade-rise mb-6">
        <Kicker>Rectification · {subject.displayName}</Kicker>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.06]">
          Which birth time fits the life?
        </h1>
        <p className="mt-2 max-w-[68ch] text-[var(--ink-muted)]">{RECTIFICATION_CAVEAT}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          On record: {birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} ·{' '}
          {birthEvent.placeName} · {profile.ayanamsa} ayanāṁśa ·{' '}
          {profile.houseSystem.replace('_', ' ')} houses
        </p>
      </div>

      {query.error ? (
        <p className="mb-5 border-l-2 border-[var(--clay)] bg-[var(--surface)] px-4 py-2 text-sm">
          {query.error}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- the events */}
        <section>
          <div className="mb-3 border-b border-[var(--rule)] pb-2">
            <Kicker>The evidence</Kicker>
            <h2 className="font-display text-2xl font-semibold">
              {events.length} event{events.length === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
              Precisely dated events discriminate best. Three good ones beat ten vague ones.
            </p>
          </div>

          <Panel marked>
            {/*
              Keyed on the event count so the form remounts after every save.
              Without it React keeps this subtree across the server-action
              redirect: `useFormStatus` stays pending, the submit button is
              left reading "Adding…" and disabled, and a practitioner cannot
              add a second event without reloading the page. The same thing bit
              the note composer, and the same fix applies — the identity of
              this form is "the blank one after N saves", not "the form".
            */}
            <form key={events.length} action={addLifeEvent} className="flex flex-col gap-3">
              <input type="hidden" name="subjectId" value={subject.id} />

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  What happened
                </span>
                <select
                  id="kind"
                  name="kind"
                  required
                  className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
                >
                  {LIFE_EVENTS.map((event) => (
                    <option key={event.kind} value={event.kind}>
                      {event.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                    When
                  </span>
                  <input
                    id="occurredOn"
                    name="occurredOn"
                    type="date"
                    required
                    className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                    How sure
                  </span>
                  <select
                    id="precision"
                    name="precision"
                    defaultValue="day"
                    className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
                  >
                    <option value="day">To the day</option>
                    <option value="month">To the month</option>
                    <option value="year">To the year</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  What they said <span className="normal-case">(optional)</span>
                </span>
                <input
                  id="note"
                  name="note"
                  className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm"
                />
              </label>

              {/*
                A plain submit button, not the app's `SubmitButton`.
                
                That component tracks its own pending state, and a server
                action which redirects back to this same page leaves it stuck
                reading "Adding…" — React reuses the client subtree across the
                soft navigation, and neither keying the form nor resetting on a
                prop reliably clears it. The consequence was severe: after
                adding one life event the form could not be used again without
                a manual reload, which for a page whose entire purpose is
                entering a list of events made it useless.
                
                A pending label is a nicety. A form that works twice is not.
              */}
              <button
                type="submit"
                className="bg-[var(--accent)] px-4 py-2.5 font-display text-lg tracking-wide text-white transition-opacity hover:opacity-90"
              >
                Add event
              </button>
            </form>
          </Panel>

          {events.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {events.map((event) => {
                const definition = LIFE_EVENTS.find((d) => d.kind === event.kind);
                return (
                  <li
                    key={event.id}
                    className={`border-l-2 pl-3 ${
                      event.id === query.added ? 'bg-[var(--surface)]' : ''
                    } ${event.enabled ? 'border-[var(--accent)]' : 'border-[var(--rule)] opacity-55'}`}
                  >
                    <p className="text-[14px] leading-snug">
                      {definition?.label ?? event.kind}
                      {event.enabled ? null : (
                        <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)]">
                          excluded
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {event.occurredOn}
                      {event.precision !== 'day' ? ` · to the ${event.precision}` : ''}
                      {definition ? ` · houses ${definition.houses.join(', ')}` : ''}
                    </p>
                    {event.note ? (
                      <p className="text-[12px] italic text-[var(--ink-muted)]">{event.note}</p>
                    ) : null}
                    <div className="mt-1 flex gap-3">
                      <form action={toggleLifeEvent}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <input type="hidden" name="enabled" value={String(event.enabled)} />
                        <button
                          type="submit"
                          className="font-mono text-[10px] text-[var(--ink-faint)] underline hover:text-[var(--ink)]"
                        >
                          {event.enabled ? 'exclude' : 'include'}
                        </button>
                      </form>
                      <form action={removeLifeEvent}>
                        <input type="hidden" name="id" value={event.id} />
                        <input type="hidden" name="subjectId" value={subject.id} />
                        <button
                          type="submit"
                          className="font-mono text-[10px] text-[var(--ink-faint)] underline hover:text-[var(--clay)]"
                        >
                          delete
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {/* --------------------------------------------------- the candidates */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rule)] pb-2">
            <div>
              <Kicker>The sweep</Kicker>
              <h2 className="font-display text-2xl font-semibold">Candidate times</h2>
            </div>
            <nav className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-[var(--ink-faint)]">window</span>
              {[1, 2, 4, 8].map((hours) => (
                <Link
                  key={hours}
                  href={link({ hours: String(hours) })}
                  className={`border px-1.5 py-0.5 ${
                    hours === windowHours
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--rule)] text-[var(--ink-muted)]'
                  }`}
                >
                  ±{hours / 2}h
                </Link>
              ))}
              <span className="ml-2 text-[var(--ink-faint)]">step</span>
              {[1, 4, 15].map((step) => (
                <Link
                  key={step}
                  href={link({ step: String(step) })}
                  className={`border px-1.5 py-0.5 ${
                    step === stepMinutes
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--rule)] text-[var(--ink-muted)]'
                  }`}
                >
                  {step}m
                </Link>
              ))}
            </nav>
          </div>

          {result ? (
            <CandidateList
              result={result}
              recordedJd={recordedJd}
              subjectId={subject.id}
              eventCount={enabled.length}
              today={clock.format(clock.nowMs, { day: 'numeric', month: 'short', year: 'numeric' })}
              localTime={(jd) => {
                // The adopt form needs the wall clock at the birthplace, which
                // is not the practice's zone. Reconstructed from the offset
                // stored on the birth event rather than from the reader's.
                const ms = unixMsFromJd(jd) + birthEvent.utcOffsetMinutes * 60_000;
                const d = new Date(ms);
                return `${String(d.getUTCHours()).padStart(2, '0')}:${String(
                  d.getUTCMinutes(),
                ).padStart(2, '0')}`;
              }}
            />
          ) : (
            <Panel>
              <p className="text-[var(--ink-muted)]">
                Add at least one life event and the sweep will run. Rectification works by asking
                which candidate birth time makes the classical timing rules fit what actually
                happened — with no events, every minute in the window is equally consistent, and
                saying so is more useful than ranking noise.
              </p>
            </Panel>
          )}
        </section>
      </div>
    </Shell>
  );
}
