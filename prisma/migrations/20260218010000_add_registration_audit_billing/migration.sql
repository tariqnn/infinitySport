-- AlterTable PackageRegistration: add audit and billing fields (price locking)
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "discountAppliedBy" TEXT;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "discountAppliedAt" TIMESTAMP(3);
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "billingPeriodKey" TEXT;
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "priceLockedUntil" TIMESTAMP(3);
