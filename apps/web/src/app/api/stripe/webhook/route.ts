import type Stripe from 'stripe';
import {
  applyBillingState,
  claimStripeEvent,
  finishStripeEvent,
  workspaceByStripeCustomer,
} from '@jade/db';
import { getDatabase } from '@/lib/db';
import { env } from '@/lib/env';
import { getStripe, priceMap } from '@/lib/stripe';
import { planForPrice, resolvePlanChange } from '@/lib/billing';

/**
 * Stripe's webhook.
 *
 * Four things this route does that are easy to leave out and expensive to
 * leave out.
 *
 * **It verifies the signature against the raw body.** Anything else — parsing
 * the JSON first, trusting the payload, reading the customer id before
 * verifying — turns this URL into an open endpoint for granting yourself a
 * subscription. `request.text()` is used, never `request.json()`, because
 * re-serialising the parsed body changes the bytes and the signature no longer
 * matches.
 *
 * **It answers 200 to events it does not act on.** A non-2xx tells Stripe to
 * retry, so returning an error for an event we simply do not care about earns
 * an escalating retry storm and eventually a disabled endpoint. "Received and
 * deliberately ignored" is a success.
 *
 * **It claims the event id before acting.** Stripe retries until it gets a 2xx
 * and delivers out of order under load, so events arrive twice. Without the
 * claim, a redelivered `customer.subscription.deleted` downgrades a workspace
 * that has since resubscribed.
 *
 * **It never decides anything itself.** What an event means is computed by
 * `resolvePlanChange` in lib/billing.ts, which is pure and exhaustively
 * tested. This file does I/O.
 */
export const dynamic = 'force-dynamic';

/** Events worth acting on. Everything else is acknowledged and dropped. */
const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

function ok(outcome: string): Response {
  return new Response(JSON.stringify({ outcome }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * The subscription behind an event.
 *
 * A completed checkout carries only a subscription id, so it is fetched. The
 * subscription events carry the object itself and need no round trip.
 */
async function subscriptionFor(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<Stripe.Subscription | null> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const id = typeof session.subscription === 'string' ? session.subscription : null;
    if (!id) return null;
    return stripe.subscriptions.retrieve(id);
  }
  return event.data.object as Stripe.Subscription;
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = env.stripeWebhookSecret;
  if (!stripe || !secret) {
    // Billing is not configured on this deployment. Say so plainly rather
    // than 500ing — this is a supported state, and a 503 tells Stripe to
    // retry later rather than that something is broken.
    return new Response('Billing is not configured on this deployment.', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing stripe-signature.', { status: 400 });

  // Raw bytes, exactly as sent. Never request.json().
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (error) {
    // A bad signature is either a misconfigured secret or somebody probing.
    // 400 is correct for both: Stripe does not retry it, and an attacker
    // learns nothing.
    const reason = error instanceof Error ? error.message : 'unknown';
    return new Response(`Signature verification failed: ${reason}`, { status: 400 });
  }

  const database = getDatabase();

  if (!HANDLED.has(event.type)) {
    return ok(`ignored — ${event.type} is not a type Jade acts on`);
  }

  // Claim before acting. A redelivery stops here.
  const claimed = await claimStripeEvent(database, { id: event.id, type: event.type });
  if (!claimed) return ok(`ignored — event ${event.id} was already received`);

  const subscription = await subscriptionFor(stripe, event);
  if (!subscription) {
    const outcome = 'ignored — event carried no subscription (a one-off payment?)';
    await finishStripeEvent(database, event.id, { outcome });
    return ok(outcome);
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const workspace = await workspaceByStripeCustomer(database, customerId);
  if (!workspace) {
    // The customer exists in Stripe but belongs to no workspace here. Almost
    // always a test-mode event hitting a live deployment or vice versa.
    // Acknowledged so Stripe stops retrying, and recorded so it is findable.
    const outcome = `ignored — no workspace holds Stripe customer ${customerId}`;
    await finishStripeEvent(database, event.id, { outcome });
    return ok(outcome);
  }

  // Which tier the price on this subscription corresponds to. Taken from the
  // subscription's own item rather than from anything in the event's metadata,
  // which a client could have influenced at checkout.
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planForPrice(priceId, priceMap);

  const decision = resolvePlanChange(
    { plan: workspace.plan, planSource: workspace.planSource },
    { plan, status: subscription.status },
  );

  if (decision.plan === null) {
    await finishStripeEvent(database, event.id, {
      workspaceId: workspace.id,
      outcome: decision.outcome,
    });
    return ok(decision.outcome);
  }

  // `current_period_end` moved onto the subscription item in recent API
  // versions; read either, and treat its absence as unknown rather than as now.
  const periodEndSeconds =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items.data[0]?.current_period_end ??
    null;

  const applied = await applyBillingState(database, workspace.id, {
    plan: decision.plan,
    planSource: 'stripe',
    subscriptionId: subscription.id,
    status: decision.status,
    periodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
  });

  const outcome = applied
    ? decision.outcome
    : `${decision.outcome} — but the write was refused, plan_source changed underneath`;

  await finishStripeEvent(database, event.id, { workspaceId: workspace.id, outcome });
  return ok(outcome);
}
