-- Ensure FacilityHighlight has "order" used by landing pages and admin sorting.
ALTER TABLE "FacilityHighlight"
ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
