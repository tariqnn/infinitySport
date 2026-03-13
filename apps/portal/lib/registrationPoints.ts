import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

type PrismaPointSource = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

const pointsInfraState = globalThis as unknown as {
  __portalRegistrationPointsReady?: boolean;
  __portalRegistrationPointsVersion?: number;
};
const REGISTRATION_POINTS_VERSION = 1;

export type RegistrationPointAdjustmentRow = {
  id: string;
  registrationId: string;
  change: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
};

export async function ensureRegistrationPointsInfrastructure(prisma: PrismaPointSource) {
  if (
    pointsInfraState.__portalRegistrationPointsReady &&
    (pointsInfraState.__portalRegistrationPointsVersion || 0) >= REGISTRATION_POINTS_VERSION
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistrationPointAdjustment" (
      "id" TEXT PRIMARY KEY,
      "registrationId" TEXT NOT NULL REFERENCES "PackageRegistration"("id") ON DELETE CASCADE,
      "change" INTEGER NOT NULL,
      "reason" TEXT NOT NULL,
      "createdBy" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistrationPointAdjustment_registrationId_idx"
    ON "RegistrationPointAdjustment" ("registrationId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistrationPointAdjustment_createdAt_idx"
    ON "RegistrationPointAdjustment" ("createdAt");
  `);

  pointsInfraState.__portalRegistrationPointsReady = true;
  pointsInfraState.__portalRegistrationPointsVersion = REGISTRATION_POINTS_VERSION;
}

export async function loadPointsByRegistrationId(
  prisma: PrismaPointSource,
  registrationIds: string[],
): Promise<Map<string, number>> {
  if (registrationIds.length === 0) return new Map();
  await ensureRegistrationPointsInfrastructure(prisma);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "registrationId",
        COALESCE(SUM("change"), 0) AS "pointsTotal"
      FROM "RegistrationPointAdjustment"
      WHERE "registrationId" = ANY($1::text[])
      GROUP BY "registrationId"
    `,
    registrationIds,
  )) as Array<{ registrationId: string; pointsTotal: number | string }>;

  return new Map(
    rows.map((row) => [row.registrationId, Math.max(0, Math.round(Number(row.pointsTotal || 0)))]),
  );
}

export async function addRegistrationPointAdjustment(
  prisma: PrismaPointSource,
  input: {
    registrationId: string;
    change: number;
    reason: string;
    createdBy?: string | null;
  },
) {
  await ensureRegistrationPointsInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "RegistrationPointAdjustment" (
        "id",
        "registrationId",
        "change",
        "reason",
        "createdBy",
        "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    crypto.randomUUID(),
    input.registrationId,
    Math.round(input.change),
    input.reason.trim(),
    input.createdBy ?? null,
  );
}

export async function listRegistrationPointAdjustments(
  prisma: PrismaPointSource,
  registrationId: string,
): Promise<RegistrationPointAdjustmentRow[]> {
  await ensureRegistrationPointsInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "registrationId",
        "change",
        "reason",
        "createdBy",
        "createdAt"
      FROM "RegistrationPointAdjustment"
      WHERE "registrationId" = $1
      ORDER BY "createdAt" DESC
    `,
    registrationId,
  )) as Array<{
    id: string;
    registrationId: string;
    change: number | string;
    reason: string;
    createdBy: string | null;
    createdAt: Date | string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    registrationId: row.registrationId,
    change: Math.round(Number(row.change || 0)),
    reason: row.reason,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
