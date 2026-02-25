-- CreateTable: Package (sellable packages for Landing + Portal; Admin CRUD)
CREATE TABLE IF NOT EXISTS "Package" (
    "id" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "descriptionBullets" JSONB,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "trackingType" TEXT NOT NULL DEFAULT 'SESSIONS',
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED',
    "currentPriceJod" INTEGER,
    "timeSlots" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Package_name_key" ON "Package"("name");
CREATE INDEX IF NOT EXISTS "Package_sportType_idx" ON "Package"("sportType");
CREATE INDEX IF NOT EXISTS "Package_isActive_idx" ON "Package"("isActive");
CREATE INDEX IF NOT EXISTS "Package_sortOrder_idx" ON "Package"("sortOrder");
