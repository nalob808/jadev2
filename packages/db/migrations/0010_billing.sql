-- Billing.
--
-- Three ideas, and the third is the one that matters.
--
-- 1. The workspace remembers its Stripe customer and subscription, so a
--    returning subscriber is never charged as a new one and the billing
--    portal can be opened without a lookup by email. Email is the wrong key:
--    people change it, and Stripe lets two customers share one.
--
-- 2. `subscription_status` stores Stripe's own vocabulary verbatim
--    ('active', 'past_due', 'canceled', 'incomplete', …) rather than a
--    boolean. A subscription in `past_due` is not the same as a cancelled one
--    — the card failed and Stripe is retrying — and collapsing the two either
--    cuts off a customer who is about to pay or lets a lapsed one stay in.
--
-- 3. `stripe_events` makes redelivery safe. Stripe retries a webhook until it
--    gets a 2xx, and delivers out of order under load, so the same event will
--    arrive twice. Recording the id under a primary key and refusing to act on
--    one already present is what stops a retried
--    `customer.subscription.deleted` from downgrading a workspace that has
--    since resubscribed. Insert-then-act, not act-then-insert: a crash between
--    the two must leave the event unprocessed rather than falsely recorded.

ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text,
  ADD COLUMN IF NOT EXISTS "subscription_status" text,
  ADD COLUMN IF NOT EXISTS "subscription_period_end" timestamptz;

-- One Stripe customer maps to exactly one workspace. Without this a webhook
-- carrying a customer id could fan out across workspaces, and the failure
-- would be silent: everyone gets upgraded, nobody complains, revenue looks fine.
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_stripe_customer_idx"
  ON "workspaces" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

CREATE TABLE "stripe_events" (
  -- Stripe's own event id, e.g. evt_1P.... The primary key IS the idempotency
  -- guarantee; a second insert of the same id raises and the handler stops.
  "id" text PRIMARY KEY,
  "type" text NOT NULL,
  -- Nullable: some event types carry no workspace, and recording them anyway
  -- keeps the ledger a complete account of what was received.
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE SET NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "handled_at" timestamptz,
  -- What the handler decided, in words, for when somebody asks in six months
  -- why an account changed tier on a Tuesday.
  "outcome" text
);

CREATE INDEX "stripe_events_received_idx" ON "stripe_events" ("received_at");

-- Deliberately NOT workspace-scoped RLS.
--
-- The webhook runs with no session and no workspace binding — it is Stripe
-- talking to us, not a signed-in person — so a workspace-isolation policy
-- would make the table unwritable at exactly the moment it is needed. It holds
-- no birth data and no personal data: an event id, a type, and a workspace
-- reference. Access is controlled by the fact that only the webhook route
-- touches it.
--
-- Listed as an exception in packages/db/scripts/doctor.ts rather than left for
-- somebody to rediscover.
