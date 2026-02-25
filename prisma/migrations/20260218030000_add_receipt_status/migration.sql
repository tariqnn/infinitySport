-- AlterTable Receipt: add status (ACTIVE | VOIDED)
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
UPDATE "Receipt" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
ALTER TABLE "Receipt" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Receipt" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "Receipt_status_idx" ON "Receipt"("status");
