-- AlterTable
ALTER TABLE "BlockedSlot" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "BlockedSlot" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "BlockedSlot" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- CreateIndex (only if not exists - PostgreSQL doesn't have IF NOT EXISTS for indexes in older versions, so we use a simple CREATE INDEX; migration will fail if index exists, then we can fix)
CREATE INDEX IF NOT EXISTS "BlockedSlot_label_idx" ON "BlockedSlot"("label");
