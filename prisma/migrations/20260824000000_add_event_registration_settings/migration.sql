ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tournamentOptions" JSONB,
  ADD COLUMN IF NOT EXISTS "jerseySizes" JSONB;

ALTER TABLE "CompetitionRegistration"
  ADD COLUMN IF NOT EXISTS "eventId" TEXT,
  ADD COLUMN IF NOT EXISTS "eventTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "jerseySize" TEXT,
  ADD COLUMN IF NOT EXISTS "players" JSONB;

CREATE INDEX IF NOT EXISTS "CompetitionRegistration_eventId_idx"
ON "CompetitionRegistration" ("eventId");
