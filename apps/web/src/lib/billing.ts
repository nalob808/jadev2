import { PLANS, isKnownPlan, type PlanId } from './plans.js';

/**
 * What a Stripe event means for a workspace's tier.
 *
 * This file is pure: no network, no database, no Stripe SDK. That is not
 * tidiness — it is because this is the piece of the system that can take
 * somebody's product away, and a rule that can only be exercised by replaying
 * live webhooks is a rule nobody exercises.
 *
 * ## The rule that matters
 *
 * A workspace's tier can only be changed by billing if billing is what put it
 * there. `plan_source` records provenance precisely so that "this customer has
 * no active subscription" and "this workspace should be Free" stay separate
 * facts. Conflating them is the single most expensive bug available here:
 * every grandfathered and comped account is downgraded at once, silently, and
 * the people affected are by definition the ones who trusted you earliest.
 *
 * So `resolvePlanChange` refuses to touch anything whose source is not
 * 'stripe' or 'default', and says why.
 *
 * ## Statuses
 *
 * Stripe's status vocabulary is kept verbatim and mapped here rather than at
 * the database. `past_due` deliberately keeps access: the card failed and
 * Stripe is retrying for up to a couple of weeks, and cutting a paying
 * customer off on the first failed retry is both bad manners and bad revenue.
 * `unpaid` is where Stripe gives up, and that is where access stops.
 */

/** The subscription statuses Stripe can report, as of the 2024+ API. */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

/** Statuses under which the customer keeps what they are paying for. */
const ENTITLING: ReadonlySet<string> = new Set<SubscriptionStatus>([
  'active',
  'trialing',
  // The card failed and Stripe is still retrying. Access continues.
  'past_due',
]);

export function statusEntitles(status: string | null | undefined): boolean {
  return typeof status === 'string' && ENTITLING.has(status);
}

export interface WorkspaceBillingState {
  readonly plan: string;
  /** 'default' | 'grandfathered' | 'stripe' | 'manual'. */
  readonly planSource: string;
}

export interface PlanChange {
  readonly plan: PlanId;
  readonly planSource: 'stripe';
  readonly status: string;
  /** Written to the event ledger, for reading back months later. */
  readonly outcome: string;
}

export interface PlanRefusal {
  readonly plan: null;
  readonly outcome: string;
}

export type PlanDecision = PlanChange | PlanRefusal;

/**
 * Sources billing is permitted to overwrite.
 *
 * 'default' is included because a workspace that has never been touched is
 * exactly what a first-time subscriber looks like. 'grandfathered' and
 * 'manual' are not, and no Stripe event may change them — if one of those
 * accounts genuinely starts paying, a human moves it to 'stripe' first, on
 * purpose.
 */
const BILLING_MAY_OVERWRITE: ReadonlySet<string> = new Set(['default', 'stripe']);

export function resolvePlanChange(
  current: WorkspaceBillingState,
  incoming: { plan: string | null; status: string | null },
): PlanDecision {
  if (!BILLING_MAY_OVERWRITE.has(current.planSource)) {
    return {
      plan: null,
      outcome: `ignored — workspace plan_source is '${current.planSource}', which billing does not manage`,
    };
  }

  const status = incoming.status ?? 'canceled';

  if (!statusEntitles(status)) {
    // Ending a subscription returns the workspace to Free — but only because
    // we established above that Stripe is what put it on a paid tier.
    return {
      plan: 'free',
      planSource: 'stripe',
      status,
      outcome: `downgraded to free — subscription status '${status}' does not entitle`,
    };
  }

  if (!incoming.plan || !isKnownPlan(incoming.plan)) {
    // A price we do not recognise. Refusing is right: guessing a tier from an
    // unknown price either gives away the product or takes away something
    // somebody just paid for, and both are worse than a loud no-op.
    return {
      plan: null,
      outcome: `ignored — price maps to no known tier (got '${incoming.plan ?? 'nothing'}')`,
    };
  }

  return {
    plan: incoming.plan,
    planSource: 'stripe',
    status,
    outcome: `set to ${incoming.plan} — subscription status '${status}'`,
  };
}

/**
 * Which tier a Stripe price id belongs to.
 *
 * The mapping lives in environment variables rather than in the database so
 * that test-mode and live-mode price ids never coexist in one table, which is
 * the classic way to charge somebody nine real dollars for a test product.
 * `readPriceMap` is passed in so this stays pure and testable.
 */
export function planForPrice(
  priceId: string | null | undefined,
  readPriceMap: (plan: string, interval: 'monthly' | 'yearly') => string | null,
): PlanId | null {
  if (!priceId) return null;
  for (const plan of PLANS) {
    for (const interval of ['monthly', 'yearly'] as const) {
      if (readPriceMap(plan.id, interval) === priceId) return plan.id;
    }
  }
  return null;
}

/** Tiers that can actually be bought: priced, self-serve, and fully built. */
export function purchasablePlans(
  readPriceMap: (plan: string, interval: 'monthly' | 'yearly') => string | null,
): ReadonlyArray<{ plan: (typeof PLANS)[number]; monthly: string | null; yearly: string | null }> {
  return PLANS.filter((plan) => plan.monthly > 0 && !plan.contactOnly)
    .map((plan) => ({
      plan,
      monthly: readPriceMap(plan.id, 'monthly'),
      yearly: readPriceMap(plan.id, 'yearly'),
    }))
    .filter((row) => row.monthly !== null || row.yearly !== null);
}
