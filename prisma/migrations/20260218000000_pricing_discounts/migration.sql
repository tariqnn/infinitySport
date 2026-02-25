-- CreateTable: PackagePricing (base price per package; null = manual)
CREATE TABLE IF NOT EXISTS "PackagePricing" (
    "id" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "basePriceJod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagePricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PackagePricing_packageName_key" ON "PackagePricing"("packageName");
CREATE INDEX IF NOT EXISTS "PackagePricing_packageName_idx" ON "PackagePricing"("packageName");

-- AlterTable: add pricing/discount columns to PackageRegistration
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "basePriceJod" INTEGER;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "discountType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "discountValue" INTEGER;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "discountReason" TEXT;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "finalPriceJod" INTEGER;

-- Backfill from expectedFee
UPDATE "PackageRegistration"
SET
  "basePriceJod" = COALESCE("expectedFee", 0),
  "finalPriceJod" = COALESCE("expectedFee", 0)
WHERE "basePriceJod" IS NULL OR "finalPriceJod" IS NULL;

-- Enforce NOT NULL and default for new rows
UPDATE "PackageRegistration" SET "basePriceJod" = 0 WHERE "basePriceJod" IS NULL;
UPDATE "PackageRegistration" SET "finalPriceJod" = 0 WHERE "finalPriceJod" IS NULL;
ALTER TABLE "PackageRegistration" ALTER COLUMN "basePriceJod" SET NOT NULL;
ALTER TABLE "PackageRegistration" ALTER COLUMN "finalPriceJod" SET NOT NULL;

-- Drop old column
ALTER TABLE "PackageRegistration" DROP COLUMN IF EXISTS "expectedFee";
