-- AlterTable PackageRegistration: add periodStartsAt (when they will start)
ALTER TABLE "PackageRegistration" ADD COLUMN IF NOT EXISTS "periodStartsAt" TIMESTAMP(3);
