-- Relationships between two subjects.
--
-- Stored as an ordered pair — subject_a_id < subject_b_id as uuids — so that a
-- couple can only be recorded once no matter who was added to the book first.
-- Without that, "Nalu and Jade" and "Jade and Nalu" are two rows, they drift
-- apart, and the second one is the stale one nobody notices.
--
-- The check constraint is what keeps the ordering true; the unique index alone
-- would happily accept both directions.
CREATE TYPE "relationship_kind" AS ENUM('partner', 'family', 'friend', 'professional', 'other');
--> statement-breakpoint

CREATE TABLE "relationships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_a_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "subject_b_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "kind" "relationship_kind" DEFAULT 'partner' NOT NULL,
  "label" text,
  "notes" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "relationships_ordered_pair" CHECK ("subject_a_id" < "subject_b_id")
);
--> statement-breakpoint

CREATE INDEX "relationships_workspace_idx" ON "relationships" ("workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "relationships_pair_idx"
  ON "relationships" ("workspace_id", "subject_a_id", "subject_b_id");
--> statement-breakpoint

-- Same isolation as every other workspace-scoped table. ENABLE and FORCE both:
-- without FORCE the owner bypasses every policy and this protects nothing.
ALTER TABLE "relationships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "relationships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "relationships_workspace_isolation" ON "relationships"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
