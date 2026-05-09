CREATE TABLE IF NOT EXISTS "CompetitionRegistration" (
  "id" TEXT NOT NULL,
  "competitionType" TEXT NOT NULL,
  "participantName" TEXT,
  "age" INTEGER,
  "gender" TEXT,
  "teamName" TEXT,
  "playerOne" TEXT,
  "playerTwo" TEXT,
  "playerThree" TEXT,
  "playerFour" TEXT,
  "source" TEXT NOT NULL DEFAULT 'WEBSITE',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitionRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompetitionRegistration_competitionType_idx"
ON "CompetitionRegistration" ("competitionType");

CREATE INDEX IF NOT EXISTS "CompetitionRegistration_createdAt_idx"
ON "CompetitionRegistration" ("createdAt");

CREATE INDEX IF NOT EXISTS "CompetitionRegistration_status_idx"
ON "CompetitionRegistration" ("status");
