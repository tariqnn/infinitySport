-- CreateTable
CREATE TABLE "BlockedSlot" (
    "id" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "courtType" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedSlot_dayOfWeek_courtType_time_key" ON "BlockedSlot"("dayOfWeek", "courtType", "time");

-- CreateIndex
CREATE INDEX "BlockedSlot_dayOfWeek_idx" ON "BlockedSlot"("dayOfWeek");

-- CreateIndex
CREATE INDEX "BlockedSlot_courtType_idx" ON "BlockedSlot"("courtType");
