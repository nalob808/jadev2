-- Trigram search over place names.
--
-- A btree index cannot help with "find me everywhere containing 'ann arb'",
-- which is exactly how people type a birthplace. pg_trgm makes that fast and
-- tolerant of the misspellings that come with dictating a grandmother's
-- village over the phone.

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "places_search_trgm_idx"
  ON "places" USING gin ("search_name" gin_trgm_ops);
