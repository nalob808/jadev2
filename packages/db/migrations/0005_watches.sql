-- Watches: standing rules that fire when the sky does something to one subject.
--
-- `rule` is jsonb rather than a set of columns. The shape differs per rule kind
-- and the set of kinds will grow; a migration for every new kind would be a tax
-- with no benefit, and the application validates the shape on the way in.
CREATE TABLE "watches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "label" text,
  "rule" jsonb NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "horizon_days" integer DEFAULT 120 NOT NULL,
  "last_evaluated_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "watches_horizon_positive" CHECK ("horizon_days" > 0 AND "horizon_days" <= 3650)
);
--> statement-breakpoint

CREATE INDEX "watches_workspace_idx" ON "watches" ("workspace_id");--> statement-breakpoint
CREATE INDEX "watches_subject_idx" ON "watches" ("subject_id");--> statement-breakpoint

-- One event a watch has already found.
--
-- The unique index on (watch, hit_key) is the whole anti-duplicate mechanism.
-- hit_key is derived from the rule and the event, never from when the job ran,
-- so a nightly evaluation over an overlapping window produces the same keys and
-- the database refuses the repeats. Without it a practitioner is told about the
-- same Saturn contact every morning for four months.
CREATE TABLE "watch_hits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "watch_id" uuid NOT NULL REFERENCES "watches"("id") ON DELETE CASCADE,
  "hit_key" text NOT NULL,
  "occurs_at" timestamp with time zone NOT NULL,
  "title" text NOT NULL,
  "factors" text[] DEFAULT '{}' NOT NULL,
  "notified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "watch_hits_workspace_idx" ON "watch_hits" ("workspace_id");--> statement-breakpoint
CREATE INDEX "watch_hits_occurs_idx" ON "watch_hits" ("workspace_id", "occurs_at");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_hits_key_idx" ON "watch_hits" ("watch_id", "hit_key");--> statement-breakpoint

-- Same isolation as every other workspace-scoped table. ENABLE and FORCE both.
ALTER TABLE "watches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "watches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "watches_workspace_isolation" ON "watches"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

ALTER TABLE "watch_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "watch_hits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "watch_hits_workspace_isolation" ON "watch_hits"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
