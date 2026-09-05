-- The public chart library.
--
-- ## Why this is its own table and not a flag on `subjects`
--
-- The obvious design is `subjects.is_public`. It is wrong, and the reason is
-- safety rather than tidiness.
--
-- `subjects` holds clients' birth data: the most sensitive thing Jade stores,
-- protected by row-level security so that one missing WHERE clause cannot leak
-- a practice's client list. A public library reads with no session and no
-- workspace binding — so putting public figures in that table would mean
-- either poking a hole in the isolation policy or running the library's
-- queries with RLS bypassed. Both put one bad predicate between a private
-- client and a page indexed by Google.
--
-- With two tables, that class of bug is not merely unlikely, it is
-- unexpressible: the library's queries do not mention `subjects` at all.
--
-- The two kinds of data are genuinely different anyway. A client's birth time
-- is private information held on their behalf. A public figure's is a
-- published fact with a citation, and it carries obligations this table
-- encodes and `subjects` does not — a rating and a source, both required.
--
-- ## Why the rating is NOT NULL
--
-- Every astrologer reads the Rodden scale, and the difference between a chart
-- from a birth register and one from a magazine is the difference between an
-- ascendant you can teach from and one you cannot. Making the rating optional
-- would mean shipping unrated charts the moment anyone was in a hurry, so it
-- is required and 'X' — no time known — is a legitimate, common answer.
--
--   AA  birth certificate or register, in hand
--   A   from the person, family, or someone who was there
--   B   a biography or autobiography
--   C   no source; caution
--   DD  sources conflict; dirty data
--   X   date known, time not
--   XX  date itself uncertain
--
-- A row rated X or XX has `birth_time` NULL, and the application refuses to
-- draw an ascendant for it. Constitution item 3 — no silent defaults — reaches
-- further here than anywhere else in Jade, because these are the pages a
-- student learns from.

CREATE TABLE "public_figures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL identity. Stable forever once published: these are indexable pages and
  -- a changed slug is a dead link somebody else has cited.
  "slug" text NOT NULL,
  "display_name" text NOT NULL,
  -- For alphabetical listing: "Ramanujan, Srinivasa".
  "sort_name" text NOT NULL,
  "also_known_as" text,

  -- Written for Jade, in our own words. Never pasted from an encyclopaedia:
  -- the sources are variously licensed and a library built on copied prose is
  -- a library that has to be taken down.
  "summary" text NOT NULL,

  "birth_date" date NOT NULL,
  -- NULL when no time is attested. Not a placeholder, not noon.
  "birth_time" time,
  "rodden" text NOT NULL,
  -- Where the time came from, in a sentence a reader can check.
  "time_source" text,

  "place_name" text NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  -- IANA zone. The tz database knows Calcutta kept Howrah Mean Time
  -- (+05:53:20) until 1941, which is the sort of thing naive software gets
  -- wrong by twenty minutes for every 19th-century Indian birth.
  "timezone_id" text NOT NULL,

  "died_on" date,

  -- Profession and interest tags, lower case, used for browsing.
  "tags" text[] NOT NULL DEFAULT '{}',

  -- Where the date and place came from.
  "source_url" text,
  -- Any caveat worth printing beside the chart: a Julian calendar date, a
  -- disputed year, a place that has been renamed.
  "provenance_note" text,

  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "public_figures_rodden_known"
    CHECK ("rodden" IN ('AA', 'A', 'B', 'C', 'DD', 'X', 'XX')),
  -- The invariant the whole feature rests on: an unrated-for-time row has no
  -- time, and a row with a time is not claiming to be untimed. Enforced here
  -- so it holds even against a hand-written INSERT.
  CONSTRAINT "public_figures_time_matches_rating"
    CHECK (
      ("rodden" IN ('X', 'XX') AND "birth_time" IS NULL)
      OR ("rodden" NOT IN ('X', 'XX') AND "birth_time" IS NOT NULL)
    ),
  CONSTRAINT "public_figures_slug_shape" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "public_figures_summary_not_blank" CHECK (btrim("summary") <> ''),
  CONSTRAINT "public_figures_latitude_range" CHECK ("latitude" BETWEEN -90 AND 90),
  CONSTRAINT "public_figures_longitude_range" CHECK ("longitude" BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX "public_figures_slug_idx" ON "public_figures" ("slug");
CREATE INDEX "public_figures_sort_idx" ON "public_figures" ("sort_name");
CREATE INDEX "public_figures_tags_idx" ON "public_figures" USING gin ("tags");

-- "Born on this day" reads month and day with the year thrown away, so the
-- index has to be on that expression or every visit is a sequential scan.
CREATE INDEX "public_figures_born_idx"
  ON "public_figures" (
    (EXTRACT(MONTH FROM "birth_date")),
    (EXTRACT(DAY FROM "birth_date"))
  );

-- Full-text over name and summary, matching how listNotes searches: written
-- the same way here as in the query, or the planner ignores the index.
CREATE INDEX "public_figures_search_idx"
  ON "public_figures"
  USING gin (to_tsvector('simple', "display_name" || ' ' || "summary"));

-- Deliberately NO row-level security.
--
-- Not an oversight and not a shortcut: this table is public by definition,
-- has no workspace column, and is read by pages that have no session. There is
-- nothing to isolate it to. It holds no personal data in the protected sense —
-- every row is a published fact with a citation attached.
--
-- Note it also carries no `workspace_id`, so `pnpm db:doctor`'s unlisted-table
-- check does not flag it; there is nothing for that check to find.
