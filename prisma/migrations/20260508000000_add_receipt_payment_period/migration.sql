-- Track which billing month a registration receipt pays for.
-- Example: a receipt issued in April can be marked as paid for 2026-03.
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "paymentPeriodKey" TEXT;

UPDATE "Receipt" r
SET "paymentPeriodKey" = to_char(COALESCE(pr."periodStartsAt", r."dateTimeIssued"), 'YYYY-MM')
FROM "PackageRegistration" pr
WHERE r."registrationId" = pr."id"
  AND r."paymentPeriodKey" IS NULL;

CREATE INDEX IF NOT EXISTS "Receipt_paymentPeriodKey_idx" ON "Receipt"("paymentPeriodKey");
