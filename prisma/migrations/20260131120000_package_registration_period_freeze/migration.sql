-- AlterTable: add 30-day period and freeze tracking to PackageRegistration
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "periodEndsAt" TIMESTAMP(3);
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "isFrozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);

-- Backfill periodEndsAt for existing rows: createdAt + 30 days
UPDATE "PackageRegistration"
SET "periodEndsAt" = "createdAt" + INTERVAL '30 days'
WHERE "periodEndsAt" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PackageRegistration_periodEndsAt_idx" ON "PackageRegistration"("periodEndsAt");
