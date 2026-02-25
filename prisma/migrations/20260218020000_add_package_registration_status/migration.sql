-- AlterTable PackageRegistration: add status (ACTIVE | TRANSFERRED | EXPIRED)
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
UPDATE "PackageRegistration" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
ALTER TABLE "PackageRegistration" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "PackageRegistration" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "PackageRegistration_status_idx" ON "PackageRegistration"("status");
