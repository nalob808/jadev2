import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { WatchRule } from '@jade/astro';
import { listSubjects, listUpcomingHits, listWatches } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { hasCapability } from '@/lib/entitlements';
import { Kicker, PageHead, Panel, Shell } from '@/components/Shell';
import { SubmitButton } from '@/components/SubmitButton';
import { WatchRuleFields } from '@/components/WatchRuleFields';
import { addWatch, removeWatch, toggleWatch } from '@/app/actions';
import {
  DASHA_LEVELS,
  DEFAULT_HORIZON_DAYS,
  HORIZON_CHOICES,
  describeWatch,
} from '@/lib/watchForm';

export const dynamic = 'force-dynamic';

/**
 * Standing rules, and the page that was missing.
 *
 * ## What was here before
 *
 * Nothing. The table existed with forced row-level security, the evaluator
 * handled four rule kinds behind an exhaustiveness guard, the runner was
 * idempotent with keys derived from the event rather than from the run, and
 * two surfaces rendered the hits. `createWatch` had zero callers, so the whole
 * feature was an engine evaluating rows that no interface could write — and
 * the panel on Today could only ever say "No alerts queued".
 *
 * ## Why the list is the page and the form is below it
 *
 * Somebody arrives here far more often to check what they are watching than to
 * add one. A form at the top pushes the answer below the fold on the common
 * visit to serve the rare one.
 *
 * ## What a watch does not do yet, said on the page
 *
 * Nothing is delivered anywhere. The evaluator runs when something runs it,
 * and there is no email, so a watch is a standing query whose results appear
 * here and on Today. The page says so rather than implying an alert will
 * arrive — a feature that quietly does not notify you is worse than one that
 * says it does not.
 */
export default async function WatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const query = await searchParams;
  const database = getDatabase();

  /* Not `requireCapability`: a Seeker should see what this is and what it
     would cost, not a redirect. The actions are gated; the page explains. */
  const allowed = await hasCapability(session.workspaceId, 'watches');

  const [people, watchList, hits] = await Promise.all([
    listSubjects(database, session.workspaceId),
    listWatches(database, { workspaceId: session.workspaceId }),
    listUpcomingHits(database, {
      workspaceId: session.workspaceId,
      fromDate: new Date(),
      limit: 50,
    }),
  ]);

  /* How many upcoming hits each watch has found, so a row can say whether the
     rule is live or merely standing. */
  const hitsByWatch = new Map<string, number>();
  for (const hit of hits) {
    hitsByWatch.set(hit.watch.id, (hitsByWatch.get(hit.watch.id) ?? 0) + 1);
  }

  return (
    <Shell email={session.email}>
      <PageHead
        kicker="Watches"
        title="Tell me when the sky does this"
        lede="A standing rule against one person's chart. Jade evaluates it over a window you choose and records what it finds, with the placements that produced each one."
      />

      {query.error ? (
        <p className="mb-5 border-l-2 border-[var(--clay)] bg-[var(--surface)] px-4 py-3 text-sm">
          {query.error}
        </p>
      ) : null}
      {query.added ? (
        <p className="mb-5 border-l-2 border-[var(--jade)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--jade)]">
          Watching. It will be evaluated on the next run.
        </p>
      ) : null}

      {/*
        The honest state of delivery, at the top, where it cannot be missed.
        A watch records hits; nothing emails them yet. Saying so is the
        difference between a feature and a promise.
      */}
      <p className="mb-6 max-w-[68ch] border-l-2 border-[var(--rule-strong)] py-1 pl-4 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
        What a watch does today: it is evaluated when the nightly job runs, and what it finds
        appears here, on Today, and on{' '}
        <Link href="/timing/sky" className="text-[var(--accent)] underline underline-offset-2">
          Sky now
        </Link>
        . What it does not do yet: email you. Nothing is sent anywhere, so treat this as a list you
        check rather than an alarm that will wake you.
      </p>

      {/* ----------------------------------------------------- what is watched */}
      <section>
        <div className="mb-3 border-b border-[var(--rule)] pb-2">
          <Kicker>Standing</Kicker>
          <h2 className="font-display text-2xl font-semibold">
            {watchList.length === 0
              ? 'Nothing watched yet'
              : `${watchList.length} ${watchList.length === 1 ? 'watch' : 'watches'}`}
          </h2>
        </div>

        {watchList.length === 0 ? (
          <Panel>
            <p className="max-w-[58ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
              A watch answers a question you would otherwise have to remember to ask — when Saturn
              next reaches somebody&rsquo;s Moon, when Jupiter enters their tenth, when an antardaśā
              turns over. Add one below.
            </p>
          </Panel>
        ) : (
          <ul className="flex flex-col gap-2">
            {watchList.map((watch) => {
              const found = hitsByWatch.get(watch.id) ?? 0;
              return (
                <li
                  key={watch.id}
                  className={`jade-panel flex flex-wrap items-baseline gap-x-4 gap-y-2 px-4 py-3 ${
                    watch.enabled ? '' : 'opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[1.2rem] leading-tight">
                      {describeWatch(watch.rule as WatchRule)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                      <Link
                        href={`/people/${watch.subjectId}`}
                        className="text-[var(--accent)] underline underline-offset-4"
                      >
                        {watch.subject.displayName}
                      </Link>
                      {' · '}
                      {watch.horizonDays} days ahead
                      {found > 0 ? ` · ${found} upcoming` : ''}
                      {watch.enabled ? '' : ' · paused'}
                    </p>
                    {watch.label ? (
                      <p className="mt-1 text-[13px] italic text-[var(--ink-muted)]">
                        {watch.label}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <form action={toggleWatch}>
                      <input type="hidden" name="id" value={watch.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={watch.enabled ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] underline underline-offset-4 transition-colors hover:text-[var(--ink)]"
                      >
                        {watch.enabled ? 'Pause' : 'Resume'}
                      </button>
                    </form>
                    <form action={removeWatch}>
                      <input type="hidden" name="id" value={watch.id} />
                      <button
                        type="submit"
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--clay)] underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- add one */}
      <section className="mt-9">
        <div className="mb-3 border-b border-[var(--rule)] pb-2">
          <Kicker>Add</Kicker>
          <h2 className="font-display text-2xl font-semibold">Watch something new</h2>
        </div>

        {people.length === 0 ? (
          <Panel>
            <p className="text-[14px] text-[var(--ink-muted)]">
              A watch runs against one person&rsquo;s chart.{' '}
              <Link
                href="/people/new"
                className="text-[var(--accent)] underline underline-offset-4"
              >
                Add somebody first
              </Link>
              .
            </p>
          </Panel>
        ) : !allowed ? (
          <Panel>
            <p className="max-w-[58ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
              Watches are a Practitioner feature.{' '}
              <Link
                href="/upgrade?want=watches"
                className="text-[var(--accent)] underline underline-offset-4"
              >
                See what that costs
              </Link>
              .
            </p>
          </Panel>
        ) : (
          <Panel>
            <form action={addWatch} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="subjectId"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                >
                  Whose chart
                </label>
                <select
                  id="subjectId"
                  name="subjectId"
                  required
                  className="w-full max-w-[22rem] border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 text-[15px]"
                >
                  {people.map((row) => (
                    <option key={row.subject.id} value={row.subject.id}>
                      {row.subject.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* The kind-dependent fields, which need client state. */}
              <WatchRuleFields />

              <div className="flex flex-wrap gap-5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="horizonDays"
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                  >
                    Look ahead
                  </label>
                  <select
                    id="horizonDays"
                    name="horizonDays"
                    defaultValue={String(DEFAULT_HORIZON_DAYS)}
                    className="border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 text-[15px]"
                  >
                    <option value={String(DEFAULT_HORIZON_DAYS)}>
                      {DEFAULT_HORIZON_DAYS} days
                    </option>
                    {HORIZON_CHOICES.map((days) => (
                      <option key={days} value={String(days)}>
                        {days} days
                      </option>
                    ))}
                  </select>
                  <p className="max-w-[26ch] text-[12px] leading-snug text-[var(--ink-faint)]">
                    How far forward each run searches. A longer window costs more to evaluate and
                    finds things sooner.
                  </p>
                </div>

                <div className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
                  <label
                    htmlFor="label"
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]"
                  >
                    Note to yourself <span className="normal-case">(optional)</span>
                  </label>
                  <input
                    id="label"
                    name="label"
                    maxLength={120}
                    placeholder="Why this one matters"
                    className="w-full border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2 text-[15px]"
                  />
                </div>
              </div>

              <SubmitButton pendingLabel="Saving…">Watch this</SubmitButton>
            </form>
          </Panel>
        )}
      </section>

      <p className="mt-8 max-w-[68ch] border-t border-[var(--rule)] pt-3 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
        Daśā watches use Vimśottarī at the level you choose —{' '}
        {DASHA_LEVELS.map((one) => one.label).join(', ')}. Every hit carries the placements that
        produced it, and none of them says whether what it found is good or bad. Reading it is the
        part you are paid for.
      </p>
    </Shell>
  );
}
