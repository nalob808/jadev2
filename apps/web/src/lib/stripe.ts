import 'server-only';
import Stripe from 'stripe';
import { env } from './env.js';

/**
 * The Stripe client.
 *
 * Constructed lazily and never at module scope, because most of this app is
 * rendered on requests that have nothing to do with billing and a deployment
 * with no Stripe keys must still boot. `getStripe()` returns null rather than
 * throwing, and every caller is written to treat null as "billing is not set
 * up here" — which is a supported, tested state, not an error.
 *
 * `server-only` is imported for its side effect: it makes the build fail if
 * this module is ever pulled into a client component, which is how secret keys
 * end up in a JavaScript bundle.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = env.stripeSecretKey;
  if (!key) return null;
  client ??= new Stripe(key, {
    // Pinned. Stripe changes response shapes between versions, and an
    // unpinned integration breaks on their schedule rather than ours.
    apiVersion: '2026-08-26.dahlia',
    appInfo: { name: 'Jade', url: 'https://jadeapp.co' },
    // Two retries on network failure. Stripe's own guidance, and it turns a
    // transient blip during checkout into a slower checkout rather than a
    // customer who was charged nothing and saw an error.
    maxNetworkRetries: 2,
  });
  return client;
}

/** Reads STRIPE_PRICE_<PLAN>_<INTERVAL>. Passed into the pure helpers in billing.ts. */
export function priceMap(plan: string, interval: 'monthly' | 'yearly'): string | null {
  return env.priceId(plan, interval);
}
