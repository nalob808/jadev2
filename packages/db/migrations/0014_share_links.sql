-- A reading a client can open, without an account and without a session.
--
-- ## The feature, and why it needs its own table
--
-- Every consultation ends the same way: "can you send me that?". Today the
-- answer is a PDF or a screenshot, which is a dead copy — it cannot be revoked,
-- it does not update when the practitioner fixes a birth time, and it travels
-- further than anyone intended with no way to find out. A share link is the
-- same reading, served live, revocable, and countable.
--
-- It is not a flag on `subjects` for the same reason the public figure library
-- is not: a flag means every query against client data is one forgotten
-- condition away from serving a private chart to the open web. A separate table
-- means the public route's query never mentions `subjects` until a valid token
-- has already named exactly one.
--
-- ## The token is stored hashed
--
-- `token_hash` is SHA-256 of a 256-bit random value that exists in full only in
-- the URL. If this table is ever read by somebody who should not have it —
-- which is the threat a share link creates and the reason to think about it now
-- — they get hashes, and a hash does not open a reading.
--
-- The cost is real and worth naming: a practitioner who loses the link cannot
-- be shown it again, because Jade genuinely does not have it. They revoke and
-- issue another. That is the correct trade for a URL that opens a named
-- person's birth chart with no further authentication.
--
-- ## Birth data is opt-in, per link
--
-- The reading is the interpretation; the birth line is the sensitive personal
-- data (CLAUDE.md #4). A client reading their own chart usually wants to see
-- their birth moment on it, and a link that gets forwarded should not carry it.
-- Those pull in opposite directions, so the practitioner decides per link and
-- the default is the quieter one.
CREATE TABLE "share_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  -- SHA-256 of the token, hex. Never the token itself.
  "token_hash" text NOT NULL,
  -- What the link opens. One kind today; the column exists so that adding the
  -- relationship report later does not need a second table.
  "kind" text NOT NULL DEFAULT 'reading',
  -- Whether the client sees the exact birth moment and place.
  "shows_birth_data" boolean NOT NULL DEFAULT false,
  -- The practitioner's own label: "sent after the March session".
  "label" text,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "view_count" integer NOT NULL DEFAULT 0,
  "last_viewed_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX "share_links_token_hash_idx" ON "share_links" ("token_hash");
--> statement-breakpoint
CREATE INDEX "share_links_subject_idx" ON "share_links" ("subject_id", "created_at");
--> statement-breakpoint
CREATE INDEX "share_links_workspace_idx" ON "share_links" ("workspace_id", "created_at");
--> statement-breakpoint

ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "share_links_workspace_isolation" ON "share_links"
  USING (app_rls_bypassed() OR workspace_id = app_current_workspace())
  WITH CHECK (app_rls_bypassed() OR workspace_id = app_current_workspace());
--> statement-breakpoint

-- What a visitor with no workspace is allowed to see.
--
-- ## Why this is a policy and not a SECURITY DEFINER function
--
-- The first attempt gave the public route a definer function that bypassed
-- row-level security for one lookup. It did not work, and the reason it did not
-- work is the reason this is better: `FORCE ROW LEVEL SECURITY` applies to the
-- table's owner too, so the function saw nothing either — and the fix would
-- have been to punch a hole in RLS and trust the function's body to be the only
-- thing in it.
--
-- A policy says the same thing without the hole. Presenting the hash IS the
-- capability, so the predicate is simply "the row whose hash you already know".
-- A visitor who knows nothing sets nothing, `current_setting` returns NULL, the
-- comparison is NULL, and no row is visible. There is no state in which this
-- policy shows a second row, because equality on a unique column cannot.
--
-- The practitioner's own policy above is unchanged and independent: these are
-- permissive policies, so a request satisfies either one or neither.
CREATE POLICY "share_links_by_token" ON "share_links"
  FOR SELECT
  USING (token_hash = current_setting('app.share_token_hash', true));
--> statement-breakpoint

-- Counting a view is a write from that same visitor, held to the same row.
CREATE POLICY "share_links_count_by_token" ON "share_links"
  FOR UPDATE
  USING (token_hash = current_setting('app.share_token_hash', true))
  WITH CHECK (token_hash = current_setting('app.share_token_hash', true));
