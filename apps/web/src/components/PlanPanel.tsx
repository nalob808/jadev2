import Link from 'next/link';
import { openBillingPortal } from '@/app/actions';
import type { Entitlement } from '@/lib/entitlements';
import { COUNTED, capabilitiesOf, limitOf, type CountedId } from '@/lib/plans';

/**
 * Which tier this workspace is on, in Settings.
 *
 * The interesting case is the third one. If the `plan` column holds something
 * the app does not recognise, the workspace is silently treated as Free — and
 * a customer paying for Practitioner while receiving Free would otherwise have
 * no way on earth to discover it. So the raw stored string is printed. This is
 * constitution item 3 ("no silent defaults, always visible in the UI") applied
 * to billing rather than to ayanāṁśa, and it is the same argument: a tool that
 * hides which setting it used is unusable.
 */
/**
 * Stripe's status words, said in English.
 *
 * `past_due` in particular has to be said carefully: the customer still has
 * access and Stripe is still retrying, so the message is "we will try again",
 * not "your account is suspended".
 */
const SUBSCRIPTION_WORDS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed — we will retry, and nothing is switched off in the meantime',
  unpaid: 'Unpaid — access has returned to Free',
  canceled: 'Cancelled',
  incomplete: 'Not finished — the first payment did not complete',
  incomplete_expired: 'Expired before the first payment completed',
  paused: 'Paused',
};

export function PlanPanel({
  entitlement,
  subscription,
}: {
  entitlement: Entitlement;
  /** Present only when this workspace has ever been through Stripe. */
  subscription?:
    { status: string | null; periodEnd: Date | null; hasCustomer: boolean } | undefined;
}): React.ReactElement {
  const { plan, stored, recognised, source } = entitlement;
  const limits = (['people', 'notes'] as CountedId[])
    .map((id) => ({ id, limit: limitOf(plan, id) }))
    .filter((row): row is { id: CountedId; limit: number } => row.limit !== null);

  return (
    <section className="mb-6 border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Tier
        </span>
        <span className="font-display text-xl font-semibold">{plan.name}</span>
        {source === 'grandfathered' ? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--jade)]">
            grandfathered — no charge
          </span>
        ) : null}
        <Link
          href="/upgrade"
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
        >
          Every tier
        </Link>
      </div>

      <p className="mt-1.5 text-[12.5px] text-[var(--ink-muted)]">
        {limits.length === 0
          ? 'No limits on people or notes.'
          : limits
              .map(
                (row) =>
                  `${row.limit} ${row.limit === 1 ? COUNTED[row.id].one : COUNTED[row.id].many}`,
              )
              .join(' · ')}
        {' · '}
        {capabilitiesOf(plan).length} features
        {' · '}
        export is available on every tier
      </p>

      {subscription?.hasCustomer ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--rule)] pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Subscription
          </span>
          <span className="text-[12.5px]">
            {SUBSCRIPTION_WORDS[subscription.status ?? ''] ?? subscription.status ?? 'none'}
          </span>
          {subscription.periodEnd ? (
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
              {subscription.status === 'canceled' ? 'access until' : 'renews'}{' '}
              {subscription.periodEnd.toISOString().slice(0, 10)}
            </span>
          ) : null}
          {/* Cards, cancellation, invoices and receipts all live in Stripe's
              own portal. Every billing screen we do not build is one that
              cannot leak a card detail. */}
          <form action={openBillingPortal} className="ml-auto">
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
            >
              Manage billing
            </button>
          </form>
        </div>
      ) : null}

      {!recognised && stored ? (
        <p className="mt-2 border-l-2 border-[var(--clay)] px-3 py-1.5 text-[12.5px] leading-relaxed">
          Your workspace is recorded as <code className="font-mono">{stored}</code>, which is not a
          tier Jade knows, so it is being treated as Free. If you are paying for something, that is
          our mistake — tell us.
        </p>
      ) : null}
    </section>
  );
}
