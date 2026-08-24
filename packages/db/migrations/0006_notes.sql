-- Notes, anchored and free.
--
-- The design decision that matters is what `anchor_key` is allowed to be.
--
-- It is a *name* — 'Mars', '7', 'gajakesari', 'D9' — never a chart id, a
-- longitude, or a date. A chart in Jade is a pure function of a moment and a
-- lens, and its id is a hash of both: change the ayanamsa and every chart id in
-- the workspace changes. A note pinned to one would be silently orphaned by a
-- settings change. Anchoring to a name also buys the feature that makes this
-- worth building at all — "show me everything I have written about Gajakesari",
-- answered across every chart in the workspace, because the same factor in two
-- charts carries the same key.
--
-- `subject_id` is nullable on purpose. A note about a technique rather than a
-- person ("kendras — what the texts actually claim") belongs in the same place
-- she looks for everything else, and a second table for it would only mean two
-- searches instead of one.
CREATE TYPE "note_anchor_kind" AS ENUM (
  'chart',
  'graha',
  'house',
  'sign',
  'nakshatra',
  'yoga',
  'dasha',
  'varga'
);
--> statement-breakpoint

CREATE TABLE "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  -- Null means a note about a technique rather than about a person.
  "subject_id" uuid REFERENCES "subjects"("id") ON DELETE CASCADE,
  "anchor_kind" "note_anchor_kind" DEFAULT 'chart' NOT NULL,
  "anchor_key" text,
  -- The label as it read when written. Denormalised so the notes index can
  -- list a hundred notes from thirty people without computing thirty charts.
  "anchor_label" text,
  "body" text NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- An empty note is never intentional, and a blank row in the list is worse
  -- than a rejected save.
  CONSTRAINT "notes_body_not_blank" CHECK (btrim("body") <> ''),
  -- 'chart' is the only kind that means "no particular factor". Every other
  -- kind without a key is an anchor pointing at nothing, which would show up
  -- in the index as an unfilterable row nobody can explain.
  CONSTRAINT "notes_anchor_key_required"
    CHECK ("anchor_kind" = 'chart' OR ("anchor_key" IS NOT NULL AND btrim("anchor_key") <> ''))
);
--> statement-breakpoint

CREATE INDEX "notes_workspace_idx" ON "notes" ("workspace_id");--> statement-breakpoint
CREATE INDEX "notes_subject_idx" ON "notes" ("workspace_id", "subject_id");--> statement-breakpoint

-- The cross-chart query: every note about one factor, newest first.
CREATE INDEX "notes_anchor_idx"
  ON "notes" ("workspace_id", "anchor_kind", "anchor_key", "updated_at" DESC);
--> statement-breakpoint

CREATE INDEX "notes_tags_idx" ON "notes" USING GIN ("tags");--> statement-breakpoint

-- Full text over the body, with the 'simple' dictionary rather than 'english'.
-- English stemming mangles the vocabulary this app is entirely made of:
-- it would not match "grahas" to "graha", and it happily stems Sanskrit
-- transliterations into things that collide with unrelated English words.
CREATE INDEX "notes_body_search_idx"
  ON "notes" USING GIN (to_tsvector('simple', "body"));
--> statement-breakpoint

ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "notes_workspace_isolation" ON "notes"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
