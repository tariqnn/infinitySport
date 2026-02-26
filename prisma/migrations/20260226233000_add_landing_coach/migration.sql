CREATE TABLE "LandingCoach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quote" TEXT,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingCoach_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LandingCoach_order_idx" ON "LandingCoach"("order");
CREATE INDEX "LandingCoach_isActive_idx" ON "LandingCoach"("isActive");