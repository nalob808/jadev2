-- The one workspace-bearing table that had no policy.
--
-- Every other table carrying a `workspace_id` is ENABLEd, FORCEd and guarded.
-- `workspaces` itself was not — so a query against it without a WHERE returned
-- every practice's name, slug, plan and Stripe customer id. In a schema whose
-- whole argument is "Postgres refuses regardless of what the application
-- forgot", one unguarded table in the middle of it is the one the application
-- will eventually forget about.
--
-- The policy keys on the primary key rather than on a `workspace_id` column,
-- because for this table the id IS the tenant. `db:doctor` finds tables with a
-- `workspace_id` column and no policy, which is exactly why this one was
-- invisible to it; the doctor is taught about it in the same change.
--
-- ## The one caller that legitimately reads across the boundary
--
-- `apps/worker/src/runWatches.ts` lists every workspace to evaluate each one's
-- watches. That is a service job with no session and no tenant, and it was
-- relying on this table being unguarded — which is a dependency on a gap
-- rather than on a decision. It now sets `app.bypass_rls` explicitly for the
-- listing, so the reach across tenants is a visible line of code in the job
-- rather than an absence in the schema.

ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "workspaces_isolation" ON "workspaces"
  USING (app_rls_bypassed() OR id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR id = app_current_workspace());
