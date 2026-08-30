-- Entitlements: make the tier column mean something, and protect everyone
-- already using Jade from the day the gate switches on.
--
-- Two things happen here.
--
-- 1. `plan_source` records *why* a workspace is on its tier. Without it the
--    Stripe webhook that lands next cannot tell a comped or grandfathered
--    account from a lapsed paying one, and the obvious implementation —
--    "no active subscription, therefore free" — silently downgrades every
--    account that never had a subscription in the first place. Recording the
--    provenance now is far cheaper than reconstructing it from support email
--    later.
--
-- 2. Every workspace that exists at the moment this migration runs is moved to
--    the top self-serve tier and marked as grandfathered. New sign-ups still
--    get 'free' from the column default. This is deliberate: gating is being
--    introduced to a product that already has live users who signed up when
--    everything was included, and taking features away from them retroactively
--    to make a pricing page tidy is not a trade worth making.
--
-- Both statements are idempotent, and the UPDATE is scoped to rows still on
-- the default so re-running it can never overwrite a real subscription.

ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "plan_source" text NOT NULL DEFAULT 'default';

UPDATE "workspaces"
   SET "plan" = 'professional',
       "plan_source" = 'grandfathered'
 WHERE "plan" = 'free'
   AND "plan_source" = 'default';

-- ---------------------------------------------------------------------------
-- What people wanted when they hit the wall.
--
-- Checkout does not exist yet, and the honest thing to put on an upgrade wall
-- in that situation is not a fake Buy button and not a mailto to an address
-- nobody reads. It is a way to say "tell me when this opens" that actually
-- records the request.
--
-- That turns the wall from a dead end into the only unbiased demand signal
-- this product can generate: which gate people press against, on which tier,
-- and how often. When Stripe lands, this table is what says which capability
-- was worth building checkout around first — and the rows already collected
-- are a list of people to email on the day it opens.
--
-- One row per press, not one per workspace. Somebody hitting the reports wall
-- four times in a week is louder than somebody who hit it once, and collapsing
-- that to a unique constraint would throw away the volume.

CREATE TABLE "upgrade_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,

  -- The tier they were on when they hit it, and the tier that would have
  -- unlocked it. Both stored as text for the same reason `plan` is: the
  -- pricing ladder is owned by the application and will change, and a row
  -- recorded under an old tier name is still a true record of what happened.
  "from_plan" text NOT NULL,
  "wanted_plan" text NOT NULL,

  -- Which capability or which exhausted count sent them here. Null when they
  -- arrived at the pricing wall directly rather than by being refused.
  "capability" text,
  "counted" text,

  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "upgrade_intents_workspace_idx" ON "upgrade_intents" ("workspace_id");
CREATE INDEX "upgrade_intents_wanted_idx" ON "upgrade_intents" ("wanted_plan", "created_at");

ALTER TABLE "upgrade_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "upgrade_intents" FORCE ROW LEVEL SECURITY;

CREATE POLICY "upgrade_intents_workspace_isolation" ON "upgrade_intents"
  USING (app_rls_bypassed() OR "workspace_id" = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR "workspace_id" = app_current_workspace());

-- ---------------------------------------------------------------------------
-- Bring life_events into line with every other policy.
--
-- 0008 wrote its policy inline as
--
--   workspace_id = current_setting('app.workspace_id', true)::uuid
--
-- rather than through the two helper functions 0001 established, and that has
-- two consequences. The visible one is that it does not honour
-- `app_rls_bypassed()`, so the same maintenance and bootstrap paths that can
-- read every other table cannot read this one. The quieter one is the cast: if
-- the setting is present but empty, `''::uuid` raises rather than matching no
-- rows, which turns a missing binding into a 500 instead of an empty result.
--
-- Corrected here rather than by editing 0008, because 0008 is recorded as
-- applied on any database that has already run it and would never execute
-- again. Rewriting history in a migrations directory only works on the
-- machines that have not run it yet, which is the worst possible half.

DROP POLICY IF EXISTS "life_events_workspace_isolation" ON "life_events";

CREATE POLICY "life_events_workspace_isolation" ON "life_events"
  USING (app_rls_bypassed() OR "workspace_id" = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR "workspace_id" = app_current_workspace());
