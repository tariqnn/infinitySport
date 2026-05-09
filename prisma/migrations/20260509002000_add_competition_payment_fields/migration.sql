ALTER TABLE "CompetitionRegistration"
ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "amountPaid" INTEGER,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CompetitionRegistration_isPaid_idx"
ON "CompetitionRegistration" ("isPaid");
