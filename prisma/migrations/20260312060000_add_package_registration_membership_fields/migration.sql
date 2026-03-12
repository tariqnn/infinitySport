ALTER TABLE "PackageRegistration"
ADD COLUMN "sessionsLeft" INTEGER,
ADD COLUMN "nextPaymentDate" TIMESTAMPTZ,
ADD COLUMN "planLabel" TEXT;
