-- Sessions: the consultation itself.
--
-- This is the table the practice layer is built on, and the thing a $49 tier
-- is actually selling: not another technique, but the hour before a reading
-- that a working astrologer currently spends assembling by hand.
--
-- Three modelling decisions worth the words.
--
-- **A session belongs to a subject, not to a "client".** Jade has no separate
-- client entity and should not grow one: the person is the person, and whether
-- they are a client, a partner or yourself is already recorded on the subject.
-- A second table would immediately disagree with the first about somebody's
-- name.
--
-- **`scheduled_for` is a timestamptz, unlike birth data.** Birth events store
-- a wall clock as text because the characters on the certificate are the
-- record and re-deriving them loses precision. A consultation is the opposite:
-- it is an instant two people must both turn up for, and it is read in the
-- practice's own zone. So an instant is exactly right here, and the difference
-- between the two is deliberate rather than an inconsistency.
--
-- **Follow-ups outlive the session that raised them.** `session_id` is
-- nullable and ON DELETE SET NULL: "she wanted to revisit the 10th when Saturn
-- stations" is still true after the session record is gone, and losing it
-- because a consultation was deleted would be the single most annoying data
-- loss this feature could produce.

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,

  "scheduled_for" timestamptz NOT NULL,
  "duration_minutes" integer NOT NULL DEFAULT 60,

  -- Free-ish vocabulary, checked. 'first' and 'follow_up' change what the prep
  -- sheet leads with, which is why the distinction is stored rather than
  -- inferred from whether earlier sessions exist — a practitioner may take
  -- somebody on mid-stream.
  "kind" text NOT NULL DEFAULT 'follow_up',
  "status" text NOT NULL DEFAULT 'scheduled',

  -- Where or how. Deliberately free text: video, a room, a phone number, a
  -- festival stall. An enum here would be wrong within a week.
  "location" text,

  -- Optional, and never rendered on anything the client sees.
  "fee_cents" integer,
  "currency" text NOT NULL DEFAULT 'USD',

  -- The practitioner's own jottings before the reading, and their account of
  -- it afterwards. Both private.
  "prep_note" text,
  "summary" text,

  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "sessions_kind_known"
    CHECK ("kind" IN ('first', 'follow_up', 'muhurta', 'other')),
  CONSTRAINT "sessions_status_known"
    CHECK ("status" IN ('scheduled', 'held', 'cancelled')),
  CONSTRAINT "sessions_duration_sane"
    CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440),
  -- A negative fee is a typo, not a refund.
  CONSTRAINT "sessions_fee_not_negative" CHECK ("fee_cents" IS NULL OR "fee_cents" >= 0)
);

-- The two queries this table actually serves: "what is coming up" and
-- "everything for this person, most recent first".
CREATE INDEX "sessions_workspace_when_idx" ON "sessions" ("workspace_id", "scheduled_for");
CREATE INDEX "sessions_subject_when_idx" ON "sessions" ("subject_id", "scheduled_for" DESC);

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "sessions_workspace_isolation" ON "sessions"
  USING (app_rls_bypassed() OR "workspace_id" = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR "workspace_id" = app_current_workspace());

-- ---------------------------------------------------------------------------

CREATE TABLE "follow_ups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  -- Nullable and SET NULL: the thing to revisit outlives the consultation that
  -- raised it.
  "session_id" uuid REFERENCES "sessions"("id") ON DELETE SET NULL,

  "body" text NOT NULL,
  -- A DATE, and nullable. Plenty of follow-ups are "next time we speak" rather
  -- than a date, and inventing one would put them in a diary they do not
  -- belong in.
  "due_on" date,
  "done_at" timestamptz,

  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "follow_ups_body_not_blank" CHECK (btrim("body") <> '')
);

CREATE INDEX "follow_ups_subject_idx" ON "follow_ups" ("subject_id", "done_at", "due_on");
CREATE INDEX "follow_ups_workspace_idx" ON "follow_ups" ("workspace_id");

ALTER TABLE "follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follow_ups" FORCE ROW LEVEL SECURITY;
CREATE POLICY "follow_ups_workspace_isolation" ON "follow_ups"
  USING (app_rls_bypassed() OR "workspace_id" = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR "workspace_id" = app_current_workspace());

-- ---------------------------------------------------------------------------
-- Notes taken during a session.
--
-- A LINK, not an anchor. `notes.anchor_kind` is a claim about a *factor* —
-- "Mars", "the 7th", "gajakesari" — chosen precisely because those names are
-- stable across charts, across settings and across recomputation, which is
-- what lets "show me everything I've written about Gajakesarī" work at all.
-- A session is not a factor. Adding 'session' to the anchor vocabulary would
-- put a row id where a stable name belongs and quietly break that invariant.
--
-- So the session is recorded beside the anchor instead: a note taken while
-- discussing the 7th house during Tuesday's reading is still anchored to
-- `house:7`, and additionally knows which afternoon it was written on.

ALTER TABLE "notes"
  ADD COLUMN IF NOT EXISTS "session_id" uuid REFERENCES "sessions"("id") ON DELETE SET NULL;

CREATE INDEX "notes_session_idx" ON "notes" ("session_id") WHERE "session_id" IS NOT NULL;
