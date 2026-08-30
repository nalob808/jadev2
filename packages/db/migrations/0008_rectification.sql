-- Life events, for rectification.
--
-- A rectification is only as good as the events it is fitted to, and those
-- events are the most laborious thing a practitioner assembles: a client
-- reconstructs them over a whole session, sometimes over several. Losing that
-- work because it lived in a form field would be unforgivable, so it is a
-- first-class table from the start.
--
-- `occurred_on` is a DATE, not a timestamp, and that is deliberate. Nobody
-- reports "I got married at 14:20". They report a day, a month, or a year, and
-- `precision` records which of those it was so the scorer can widen its
-- transit window rather than pretending to a sharpness the memory does not
-- have. Storing a timestamp here would manufacture certainty.
--
-- The events belong to the subject rather than to a birth event, because the
-- whole point is that they outlive any particular candidate birth time — you
-- rectify, adopt a new birth event, gather two more events, and rectify again
-- against the same log.

CREATE TYPE "life_event_precision" AS ENUM ('day', 'month', 'year');

CREATE TABLE "life_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,

  -- Matches LifeEventKind in packages/astro. Text rather than an enum: the
  -- vocabulary is owned by the calculation core and will grow, and a migration
  -- per new event kind is friction with no safety benefit — an unknown kind is
  -- skipped by the scorer rather than crashing it.
  "kind" text NOT NULL,
  "occurred_on" date NOT NULL,
  "precision" "life_event_precision" NOT NULL DEFAULT 'day',

  -- What the client actually said. Never interpreted, only displayed.
  "note" text,
  -- Excluded from a sweep without being deleted, so a practitioner can test
  -- whether one doubtful event is carrying the whole result.
  "enabled" boolean NOT NULL DEFAULT true,

  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "life_events_kind_not_blank" CHECK (btrim("kind") <> ''),
  -- An event before the birth day cannot inform the birth time, and an event
  -- in the future is a typo. Neither is worth a silent bad ranking.
  CONSTRAINT "life_events_plausible_date" CHECK ("occurred_on" > DATE '1800-01-01')
);

CREATE INDEX "life_events_subject_idx" ON "life_events" ("subject_id", "occurred_on");
CREATE INDEX "life_events_workspace_idx" ON "life_events" ("workspace_id");

ALTER TABLE "life_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY "life_events_workspace_isolation" ON "life_events"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid);
