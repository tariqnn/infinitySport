ALTER TABLE "PackageRegistration"
ADD COLUMN IF NOT EXISTS "cycleStartedAt" TIMESTAMP(3);

UPDATE "PackageRegistration"
SET "cycleStartedAt" = COALESCE("periodStartsAt", "createdAt")
WHERE "cycleStartedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "PackageRegistration_cycleStartedAt_idx"
ON "PackageRegistration" ("cycleStartedAt");
