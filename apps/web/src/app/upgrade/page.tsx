import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEntitlement } from '@/lib/entitlements';
import {
  CAPABILITIES,
  COUNTED,
  SELF_SERVE,
  bulletsFor,
  capabilitiesOf,
  cheapestPlanAllowing,
  cheapestPlanWith,
  limitOf,
  type CapabilityId,
  type CountedId,
} from '@/lib/plans';
import { Kicker, Shell } from '@/components/Shell';
import { NotifyButton } from '@/components/NotifyButton';

export const dynamic = 'force-dynamic';

/**
 * The wall.
 *
 * Every refusal in the app lands here, and the page has one job: make the
 * refusal legible. A wall that says "upgrade to continue" has told the reader
 * nothing they did not already know and given them no way to judge whether it
 * is worth nine dollars.
 *
 * So this page always answers four things, in this order:
 *
 *  1. **What was blocked** — named as the feature, not as the tier.
 *  2. **What that feature actually does** — because a person who arrived by
 *     clicking a locked link may never have seen it work.
 *  3. **Which tier has it, and what that costs** — the cheapest one, never the
 *     most expensive one that happens to include it.
 *  4. **What tier they are on now** — so the gap is a fact, not an implication.
 *
 * There is no Buy button, because there is no checkout yet, and a Buy button
 * that opens a mailto is worse than an honest sentence. What there is instead
 * is a button that records the request, which is the one thing this page can
 * do today that is worth anything to either side.
 */

function isCapability(value: string | undefined): value is CapabilityId {
  return typeof value === 'string' && value in CAPABILITIES;
}

function isCounted(value: string | undefined): value is CountedId {
  return typeof value === 'string' && value in COUNTED;
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const { plan: current, stored, recognised, source } = await getEntitlement(session.workspaceId);

  const need = one('need');
  const full = one('full');
  const used = Number(one('used') ?? '0');

  // What sent them here, if anything did. Arriving at /upgrade directly is a
  // legitimate way to read the tier list, so an absent reason is not an error.
  const capability = isCapability(need) ? CAPABILITIES[need] : null;
  const counted = isCounted(full) ? COUNTED[full] : null;

  const wanted = capability
    ? cheapestPlanWith(capability.id)
    : counted
      ? cheapestPlanAllowing(counted.id, used)
      : null;

  const headline = capability?.locked ?? counted?.locked ?? 'What each tier includes';
  const held = capabilitiesOf(current);

  return (
    <Shell email={session.email}>
      <div className="mx-auto max-w-3xl">
        <Kicker>{capability || counted ? 'Not on this tier' : 'Tiers'}</Kicker>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">{headline}</h1>

        {capability ? (
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {capability.blurb}
          </p>
        ) : null}

        {counted ? (
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            You are keeping {used} {used === 1 ? counted.one : counted.many}, which is everything{' '}
            {current.name} allows. Nothing has been deleted and nothing will be — the limit is on
            adding, not on keeping. Removing{' '}
            {used === 1 ? `the ${counted.one}` : `a ${counted.one}`} frees the slot again.
          </p>
        ) : null}

        {capability && !capability.built ? (
          <p className="mt-4 border-l-2 border-[var(--clay)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed">
            <strong>This one is not finished yet.</strong> It is on the tier list because you should
            know what you would be buying into, but it does not work today and you should not pay
            for it expecting it to.
          </p>
        ) : null}

        {/* ------------------------------------------------ where they stand */}
        <div className="mt-6 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] px-4 py-3">
            <span className="block font-display text-xl font-semibold">{current.name}</span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Your tier
            </span>
          </div>
          {wanted ? (
            <div className="bg-[var(--surface)] px-4 py-3">
              <span className="block font-display text-xl font-semibold text-[var(--accent)]">
                {wanted.name} · ${wanted.monthly}/mo
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                The cheapest tier with it
              </span>
            </div>
          ) : null}
        </div>

        {/* An unrecognised value in the column is shown rather than swallowed.
            Somebody paying for Practitioner and silently receiving Free would
            otherwise have no way at all to discover it. */}
        {!recognised && stored ? (
          <p className="mt-3 border-l-2 border-[var(--clay)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed">
            Your workspace is recorded as <code className="font-mono">{stored}</code>, which is not
            a tier Jade knows. It is being treated as Free. If you are paying for something, this is
            a mistake on our side — tell us and we will fix it.
          </p>
        ) : null}

        {source === 'grandfathered' ? (
          <p className="mt-3 border-l-2 border-[var(--jade)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed">
            You were using Jade before tiers existed, so your workspace keeps everything at no
            charge. Nothing here applies to you — this page is showing you the ladder, not asking
            you to climb it.
          </p>
        ) : null}

        {wanted ? (
          <div className="jade-panel mt-6 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Paying for this
            </p>
            <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed">
              Checkout is not open yet. Rather than pretend otherwise, the button below records that
              you wanted {wanted.name} and what you were trying to do when you hit this — which is
              what decides the order things get built in, and who gets written to first when billing
              opens.
            </p>
            <div className="mt-4">
              <NotifyButton
                wantedPlan={wanted.id}
                fromPlan={current.id}
                capability={capability?.id ?? null}
                counted={counted?.id ?? null}
                label={`Tell me when ${wanted.name} opens`}
                noted={one('noted') === '1'}
              />
            </div>
          </div>
        ) : null}

        {/* ----------------------------------------------------- the ladder */}
        <h2 className="mt-12 font-display text-2xl font-semibold">Every tier</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SELF_SERVE.map((plan) => {
            const isCurrent = plan.id === current.id;
            const isTarget = wanted?.id === plan.id;
            const people = limitOf(plan, 'people');
            return (
              <section
                key={plan.id}
                className={`jade-panel p-5 ${isTarget ? 'jade-panel--marked' : ''}`}
              >
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                    {plan.monthly === 0 ? 'free' : `$${plan.monthly}/mo`}
                  </span>
                  {isCurrent ? (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-[var(--accent)]">
                      you are here
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--ink-faint)]">{plan.who}</p>
                <p className="mt-2 font-mono text-[11px] text-[var(--ink-muted)]">
                  {people === null ? 'Unlimited people' : `${people} people`}
                </p>
                <ul className="mt-3 space-y-1 text-[13px]">
                  {bulletsFor(plan).map((bullet) => (
                    <li key={bullet.text} className="flex gap-2 text-[var(--ink-muted)]">
                      <span aria-hidden="true" className="mt-[1px] shrink-0 text-[var(--accent)]">
                        ·
                      </span>
                      <span>
                        {bullet.text}
                        {bullet.built ? null : (
                          <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--clay)]">
                            being built
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-8 text-[13px] text-[var(--ink-muted)]">
          Every tier computes the same chart to the same standard.{' '}
          <Link href="/accuracy" className="text-[var(--accent)] underline underline-offset-2">
            How that is checked
          </Link>{' '}
          · <span className="text-[var(--ink-faint)]">{held.length} features on your tier</span>
        </p>

        <p className="mt-6">
          <Link
            href="/home"
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
          >
            ← Back
          </Link>
        </p>
      </div>
    </Shell>
  );
}
