-- AlterTable: add expectedFee and sessionsBonus to PackageRegistration
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "expectedFee" INTEGER;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "sessionsBonus" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: Receipts (for registration payments, separate from Invoices)
CREATE TABLE IF NOT EXISTS "Receipt" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personPhone" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "dateTimeIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaid" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "privateNote" TEXT NOT NULL,
    "createdBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_receiptId_key" ON "Receipt"("receiptId");
CREATE INDEX IF NOT EXISTS "Receipt_registrationId_idx" ON "Receipt"("registrationId");
CREATE INDEX IF NOT EXISTS "Receipt_receiptId_idx" ON "Receipt"("receiptId");

ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "Receipt_registrationId_fkey";
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "PackageRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SessionAdjustment (manual +1 excuse, etc.)
CREATE TABLE IF NOT EXISTS "SessionAdjustment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionAdjustment_registrationId_idx" ON "SessionAdjustment"("registrationId");

ALTER TABLE "SessionAdjustment" DROP CONSTRAINT IF EXISTS "SessionAdjustment_registrationId_fkey";
ALTER TABLE "SessionAdjustment" ADD CONSTRAINT "SessionAdjustment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "PackageRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: PackageSessionCanceled (holiday, bad weather — no session decrement)
CREATE TABLE IF NOT EXISTS "PackageSessionCanceled" (
    "id" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageSessionCanceled_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PackageSessionCanceled_packageName_idx" ON "PackageSessionCanceled"("packageName");
CREATE INDEX IF NOT EXISTS "PackageSessionCanceled_sessionDate_idx" ON "PackageSessionCanceled"("sessionDate");
