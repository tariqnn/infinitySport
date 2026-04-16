DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CashBookTransactionType'
  ) THEN
    CREATE TYPE "CashBookTransactionType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CashBookCategory" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CashBookTransactionType" NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashBookCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CashBookTransaction" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "CashBookTransactionType" NOT NULL,
  "categoryId" TEXT,
  "categoryName" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "attachmentType" TEXT,
  "attachmentSize" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashBookTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CashBookCategory_companyId_type_name_key"
ON "CashBookCategory"("companyId", "type", "name");

CREATE INDEX IF NOT EXISTS "CashBookCategory_companyId_idx"
ON "CashBookCategory"("companyId");

CREATE INDEX IF NOT EXISTS "CashBookCategory_type_idx"
ON "CashBookCategory"("type");

CREATE INDEX IF NOT EXISTS "CashBookTransaction_companyId_idx"
ON "CashBookTransaction"("companyId");

CREATE INDEX IF NOT EXISTS "CashBookTransaction_type_idx"
ON "CashBookTransaction"("type");

CREATE INDEX IF NOT EXISTS "CashBookTransaction_categoryId_idx"
ON "CashBookTransaction"("categoryId");

CREATE INDEX IF NOT EXISTS "CashBookTransaction_date_idx"
ON "CashBookTransaction"("date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashBookCategory_companyId_fkey'
  ) THEN
    ALTER TABLE "CashBookCategory"
    ADD CONSTRAINT "CashBookCategory_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashBookTransaction_companyId_fkey'
  ) THEN
    ALTER TABLE "CashBookTransaction"
    ADD CONSTRAINT "CashBookTransaction_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CashBookTransaction_categoryId_fkey'
  ) THEN
    ALTER TABLE "CashBookTransaction"
    ADD CONSTRAINT "CashBookTransaction_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "CashBookCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
