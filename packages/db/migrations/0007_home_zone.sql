-- The practice's wall clock.
--
-- Every date Jade renders was being formatted in the *server's* zone. On a
-- developer's laptop that is indistinguishable from correct. In production it
-- is UTC, and for a reader in Hawaii the dashboard called it Tuesday from 2pm
-- Monday onward: the header date wrong for ten hours a day, the "Today" column
-- of the week strip showing tomorrow, and the daily reading computed for a day
-- the reader had not reached.
--
-- This lives on the workspace rather than on a settings profile on purpose. A
-- settings profile is the astrological lens, and a practice may keep several —
-- one for its own tradition, one to match a teacher's software. Which ayanāṁśa
-- is selected has nothing to do with what time it is where the astrologer is
-- sitting, and putting the zone on the profile would let the two disagree.
--
-- Nullable, with no default. An unset zone is a question the UI asks rather
-- than a value Jade invents — the same rule the astrology settings follow.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "home_zone_id" text;

COMMENT ON COLUMN "workspaces"."home_zone_id" IS
  'IANA zone the practice reads its clock in, e.g. Pacific/Honolulu. NULL means unset: render in UTC and say so.';
