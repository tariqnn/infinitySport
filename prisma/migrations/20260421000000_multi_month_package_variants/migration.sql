ALTER TABLE "Package"
ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Package"
ADD COLUMN IF NOT EXISTS "showOnWebsite" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PackageRegistration"
ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER NOT NULL DEFAULT 1;

UPDATE "Package"
SET "durationMonths" = 1
WHERE "durationMonths" IS NULL OR "durationMonths" < 1;

UPDATE "Package"
SET "showOnWebsite" = true
WHERE "showOnWebsite" IS NULL;

UPDATE "PackageRegistration"
SET "durationMonths" = 1
WHERE "durationMonths" IS NULL OR "durationMonths" < 1;

UPDATE "PackageRegistration"
SET "periodEndsAt" = COALESCE("periodStartsAt", "createdAt") + INTERVAL '1 month'
WHERE "periodEndsAt" IS NULL;
