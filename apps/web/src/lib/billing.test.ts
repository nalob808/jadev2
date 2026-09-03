import { describe, expect, it } from 'vitest';
import {
  planForPrice,
  purchasablePlans,
  resolvePlanChange,
  statusEntitles,
  type SubscriptionStatus,
} from './billing.js';

/**
 * The rules that decide whether somebody keeps what they are paying for.
 *
 * Weighted heavily towards the refusals. Every test here that asserts nothing
 * happens is guarding against a class of bug where the damage is silent,
 * simultaneous across every affected account, and discovered by the customer
 * rather than by us.
 */

const PRICES: Record<string, string> = {
  seeker_monthly: 'price_seeker_m',
  seeker_yearly: 'price_seeker_y',
  practitioner_monthly: 'price_prac_m',
};
const readPrice = (plan: string, interval: 'monthly' | 'yearly'): string | null =>
  PRICES[`${plan}_${interval}`] ?? null;

describe('statusEntitles', () => {
  it('keeps a customer whose card just failed', () => {
    // Stripe retries `past_due` for up to a fortnight. Cutting access on the
    // first failed retry loses the customer and the recovered payment.
    expect(statusEntitles('past_due')).toBe(true);
    expect(statusEntitles('active')).toBe(true);
    expect(statusEntitles('trialing')).toBe(true);
  });

  it('stops at the point Stripe itself gives up', () => {
    for (const status of [
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'paused',
    ] as SubscriptionStatus[]) {
      expect(statusEntitles(status), status).toBe(false);
    }
  });

  it('treats absent and unrecognised statuses as not entitling', () => {
    for (const status of [null, undefined, '', 'somethingnew']) {
      expect(statusEntitles(status)).toBe(false);
    }
  });
});

describe('resolvePlanChange — what billing may not touch', () => {
  it('never downgrades a grandfathered workspace', () => {
    // The expensive bug: "no active subscription, therefore free" cancels
    // every account that never had a subscription in the first place.
    const decision = resolvePlanChange(
      { plan: 'professional', planSource: 'grandfathered' },
      { plan: 'free', status: 'canceled' },
    );
    expect(decision.plan).toBeNull();
    expect(decision.outcome).toContain('grandfathered');
  });

  it('never downgrades a comped workspace', () => {
    const decision = resolvePlanChange(
      { plan: 'practitioner', planSource: 'manual' },
      { plan: 'free', status: 'unpaid' },
    );
    expect(decision.plan).toBeNull();
  });

  it('will not even upgrade an account it does not manage', () => {
    // Symmetry matters. If billing can raise a manual account it can lower
    // one, and the guard stops being a guard.
    const decision = resolvePlanChange(
      { plan: 'free', planSource: 'manual' },
      { plan: 'professional', status: 'active' },
    );
    expect(decision.plan).toBeNull();
  });
});

describe('resolvePlanChange — what billing may do', () => {
  it('upgrades a workspace that has never been touched', () => {
    const decision = resolvePlanChange(
      { plan: 'free', planSource: 'default' },
      { plan: 'seeker', status: 'active' },
    );
    expect(decision.plan).toBe('seeker');
    expect(decision).toHaveProperty('planSource', 'stripe');
  });

  it('moves an existing subscriber between tiers', () => {
    const decision = resolvePlanChange(
      { plan: 'seeker', planSource: 'stripe' },
      { plan: 'practitioner', status: 'active' },
    );
    expect(decision.plan).toBe('practitioner');
  });

  it('downgrades its own subscriber when the subscription ends', () => {
    const decision = resolvePlanChange(
      { plan: 'seeker', planSource: 'stripe' },
      { plan: null, status: 'canceled' },
    );
    expect(decision.plan).toBe('free');
    expect(decision.outcome).toContain('canceled');
  });

  it('keeps a past_due subscriber on their tier', () => {
    const decision = resolvePlanChange(
      { plan: 'seeker', planSource: 'stripe' },
      { plan: 'seeker', status: 'past_due' },
    );
    expect(decision.plan).toBe('seeker');
  });

  it('refuses a price it cannot map rather than guessing', () => {
    // Guessing either gives the product away or removes something just paid
    // for. A loud no-op is the only safe third option.
    const decision = resolvePlanChange(
      { plan: 'seeker', planSource: 'stripe' },
      { plan: 'gold_tier', status: 'active' },
    );
    expect(decision.plan).toBeNull();
    expect(decision.outcome).toContain('no known tier');
  });

  it('treats a missing status as not entitling rather than as active', () => {
    const decision = resolvePlanChange(
      { plan: 'seeker', planSource: 'stripe' },
      { plan: 'seeker', status: null },
    );
    expect(decision.plan).toBe('free');
  });

  it('always explains itself', () => {
    const cases = [
      [
        { plan: 'free', planSource: 'default' },
        { plan: 'seeker', status: 'active' },
      ],
      [
        { plan: 'seeker', planSource: 'stripe' },
        { plan: null, status: 'canceled' },
      ],
      [
        { plan: 'seeker', planSource: 'grandfathered' },
        { plan: 'free', status: 'canceled' },
      ],
    ] as const;
    for (const [current, incoming] of cases) {
      expect(resolvePlanChange(current, incoming).outcome.length).toBeGreaterThan(20);
    }
  });
});

describe('planForPrice', () => {
  it('finds the tier for either interval', () => {
    expect(planForPrice('price_seeker_m', readPrice)).toBe('seeker');
    expect(planForPrice('price_seeker_y', readPrice)).toBe('seeker');
    expect(planForPrice('price_prac_m', readPrice)).toBe('practitioner');
  });

  it('returns null for an unknown or absent price', () => {
    // A live-mode price arriving at a test-mode deployment looks exactly like
    // this, and must not resolve to a tier.
    expect(planForPrice('price_from_another_account', readPrice)).toBeNull();
    expect(planForPrice(null, readPrice)).toBeNull();
    expect(planForPrice('', readPrice)).toBeNull();
  });
});

describe('purchasablePlans', () => {
  it('offers only tiers that have a price configured', () => {
    const ids = purchasablePlans(readPrice).map((row) => row.plan.id);
    expect(ids).toContain('seeker');
    expect(ids).toContain('practitioner');
    // No price ids configured for these, so they cannot be sold.
    expect(ids).not.toContain('professional');
    expect(ids).not.toContain('institute');
    // Free is not a purchase.
    expect(ids).not.toContain('free');
  });

  it('offers nothing at all when nothing is configured', () => {
    expect(purchasablePlans(() => null)).toHaveLength(0);
  });

  it('offers a tier with only one interval priced', () => {
    const rows = purchasablePlans(readPrice);
    const practitioner = rows.find((row) => row.plan.id === 'practitioner')!;
    expect(practitioner.monthly).toBe('price_prac_m');
    expect(practitioner.yearly).toBeNull();
  });
});
