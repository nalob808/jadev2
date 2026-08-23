-- Apparent versus true positions.
--
-- Jade computes apparent positions; Jagannātha Hora computes true (geometric)
-- ones. They differ by up to 55 arcseconds — under an arcminute, so no sign,
-- house, nakṣatra or varga changes, but a degree shown to the minute can, and
-- a practitioner reconciling Jade against JHora will see it.
--
-- Existing profiles keep what they were computed with: apparent.
CREATE TYPE "position_basis" AS ENUM('apparent', 'true');
--> statement-breakpoint
ALTER TABLE "settings_profiles"
  ADD COLUMN "position_basis" "position_basis" DEFAULT 'apparent' NOT NULL;
