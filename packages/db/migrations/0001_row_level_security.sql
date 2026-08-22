-- Row-level security.
--
-- What this defends against: an application bug. One query that forgets its
-- `where workspace_id = ...` in a product holding other people's birth data is
-- a breach, not a bug, so Postgres refuses to return the rows regardless.
--
-- What it does NOT defend against: someone who already has the database
-- credentials. Jade connects as a single role, so `app.bypass_rls` is
-- reachable by anything that can run SQL. That is deliberate — the threat
-- model here is our own mistakes, and it is worth being precise about which
-- threat a control actually addresses.
--
-- FORCE is the part people miss: without it, the table owner (which is the
-- role the app connects as on both Neon and Supabase) silently bypasses every
-- policy, and RLS looks enabled while protecting nothing.

CREATE OR REPLACE FUNCTION app_current_workspace() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.workspace_id', true), '')::uuid;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_rls_bypassed() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.bypass_rls', true), '') = 'on';
$$;
--> statement-breakpoint

ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subjects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "subjects_workspace_isolation" ON "subjects"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

ALTER TABLE "birth_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "birth_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "birth_events_workspace_isolation" ON "birth_events"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

ALTER TABLE "charts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "charts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "charts_workspace_isolation" ON "charts"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

ALTER TABLE "settings_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "settings_profiles_workspace_isolation" ON "settings_profiles"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "memberships_workspace_isolation" ON "memberships"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

-- `places` is shared reference data derived from GeoNames and carries no
-- personal information, so it is readable by everyone. `users` is written and
-- read only through the service path during sign-in. Both are left without
-- policies on purpose rather than by omission.
COMMENT ON TABLE "places" IS 'Shared GeoNames reference data. No RLS by design: no personal data, read by every workspace.';
--> statement-breakpoint
COMMENT ON TABLE "users" IS 'Identity records. Accessed only via the service path during authentication.';
