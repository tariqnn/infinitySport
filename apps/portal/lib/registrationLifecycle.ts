import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

type PrismaLifecycleSource = Pick<
  PrismaClient,
  "$executeRawUnsafe" | "$queryRawUnsafe"
>;

const lifecycleInfraState = globalThis as unknown as {
  __portalRegistrationLifecycleReady?: boolean;
  __portalRegistrationLifecycleVersion?: number;
};
const REGISTRATION_LIFECYCLE_VERSION = 1;

export type RegistrationProfileRow = {
  registrationId: string;
  playerCode: string;
  currentCycle: number;
  createdAt: string;
  updatedAt: string;
};

export type RegistrationRenewalHistoryRow = {
  id: string;
  registrationId: string;
  playerCode: string;
  cycleNumber: number;
  action: string;
  snapshot: Record<string, unknown> | null;
  createdAt: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePhoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function serializeDateTime(value: Date | string): string {
  return new Date(value).toISOString();
}

function isPlayerCodeCollision(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes(`Key ("playerCode")=`) ||
    message.includes(`Unique constraint failed`) ||
    message.includes(`23505`)
  );
}

async function generateNextPlayerCode(prisma: PrismaLifecycleSource): Promise<string> {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "playerCode"
      FROM "RegistrationProfile"
      WHERE "playerCode" LIKE 'PLR-%'
      ORDER BY "playerCode" DESC
      LIMIT 1
    `,
  )) as Array<{ playerCode: string }>;

  const latest = rows[0]?.playerCode ?? "";
  const match = latest.match(/^PLR-(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `PLR-${String(nextNumber).padStart(6, "0")}`;
}

export async function ensureRegistrationLifecycleInfrastructure(
  prisma: PrismaLifecycleSource,
) {
  if (
    lifecycleInfraState.__portalRegistrationLifecycleReady &&
    (lifecycleInfraState.__portalRegistrationLifecycleVersion || 0) >=
      REGISTRATION_LIFECYCLE_VERSION
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistrationProfile" (
      "registrationId" TEXT PRIMARY KEY REFERENCES "PackageRegistration"("id") ON DELETE CASCADE,
      "playerCode" TEXT NOT NULL UNIQUE,
      "currentCycle" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistrationProfile_playerCode_idx"
    ON "RegistrationProfile" ("playerCode");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistrationRenewalHistory" (
      "id" TEXT PRIMARY KEY,
      "registrationId" TEXT NOT NULL REFERENCES "PackageRegistration"("id") ON DELETE CASCADE,
      "playerCode" TEXT NOT NULL,
      "cycleNumber" INTEGER NOT NULL,
      "action" TEXT NOT NULL DEFAULT 'REREGISTERED',
      "snapshot" JSONB NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistrationRenewalHistory_registrationId_idx"
    ON "RegistrationRenewalHistory" ("registrationId");
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Receipt"
    ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Receipt_registration_cycle_idx"
    ON "Receipt" ("registrationId", "cycleNumber");
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SessionAdjustment"
    ADD COLUMN IF NOT EXISTS "cycleNumber" INTEGER NOT NULL DEFAULT 1;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SessionAdjustment_registration_cycle_idx"
    ON "SessionAdjustment" ("registrationId", "cycleNumber");
  `);

  lifecycleInfraState.__portalRegistrationLifecycleReady = true;
  lifecycleInfraState.__portalRegistrationLifecycleVersion =
    REGISTRATION_LIFECYCLE_VERSION;
}

export async function loadRegistrationProfiles(
  prisma: PrismaLifecycleSource,
  registrationIds: string[],
): Promise<Map<string, RegistrationProfileRow>> {
  if (registrationIds.length === 0) return new Map();
  await ensureRegistrationLifecycleInfrastructure(prisma);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "registrationId",
        "playerCode",
        "currentCycle",
        "createdAt",
        "updatedAt"
      FROM "RegistrationProfile"
      WHERE "registrationId" = ANY($1::text[])
    `,
    registrationIds,
  )) as Array<{
    registrationId: string;
    playerCode: string;
    currentCycle: number | string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;

  return new Map(
    rows.map((row) => [
      row.registrationId,
      {
        registrationId: row.registrationId,
        playerCode: row.playerCode,
        currentCycle: Math.max(1, Math.round(Number(row.currentCycle || 1))),
        createdAt: serializeDateTime(row.createdAt),
        updatedAt: serializeDateTime(row.updatedAt),
      },
    ]),
  );
}

export async function ensureRegistrationProfile(
  prisma: PrismaLifecycleSource,
  input: {
    registrationId: string;
    customerName: string;
    customerAge?: number | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
  },
): Promise<RegistrationProfileRow> {
  await ensureRegistrationLifecycleInfrastructure(prisma);

  const existing = await loadRegistrationProfiles(prisma, [input.registrationId]);
  const current = existing.get(input.registrationId);
  if (current) return current;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const playerCode = await generateNextPlayerCode(prisma);
    try {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "RegistrationProfile" (
            "registrationId",
            "playerCode",
            "currentCycle",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, 1, NOW(), NOW())
          ON CONFLICT ("registrationId")
          DO UPDATE SET "updatedAt" = NOW()
        `,
        input.registrationId,
        playerCode,
      );
      break;
    } catch (error) {
      const refreshed = await loadRegistrationProfiles(prisma, [input.registrationId]);
      const refreshedCurrent = refreshed.get(input.registrationId);
      if (refreshedCurrent) return refreshedCurrent;
      if (isPlayerCodeCollision(error)) continue;
      throw error;
    }
  }

  const profiles = await loadRegistrationProfiles(prisma, [input.registrationId]);
  const profile = profiles.get(input.registrationId);
  if (!profile) {
    throw new Error("Failed to create registration profile");
  }
  return profile;
}

export async function updateRegistrationCurrentCycle(
  prisma: PrismaLifecycleSource,
  registrationId: string,
  nextCycle: number,
) {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      UPDATE "RegistrationProfile"
      SET "currentCycle" = $2, "updatedAt" = NOW()
      WHERE "registrationId" = $1
    `,
    registrationId,
    Math.max(1, Math.round(nextCycle)),
  );
}

export async function loadCurrentCycleReceiptTotals(
  prisma: PrismaLifecycleSource,
  registrationIds: string[],
): Promise<Map<string, number>> {
  if (registrationIds.length === 0) return new Map();
  await ensureRegistrationLifecycleInfrastructure(prisma);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        pr."id" AS "registrationId",
        COALESCE(SUM(r."amountPaid"), 0) AS "collected"
      FROM "PackageRegistration" pr
      LEFT JOIN "RegistrationProfile" rp
        ON rp."registrationId" = pr."id"
      LEFT JOIN "Receipt" r
        ON r."registrationId" = pr."id"
       AND r."status" = 'ACTIVE'
       AND r."voidedAt" IS NULL
       AND r."cycleNumber" = COALESCE(rp."currentCycle", 1)
      WHERE pr."id" = ANY($1::text[])
      GROUP BY pr."id"
    `,
    registrationIds,
  )) as Array<{ registrationId: string; collected: number | string }>;

  return new Map(
    rows.map((row) => [
      row.registrationId,
      Math.max(0, Math.round(Number(row.collected || 0))),
    ]),
  );
}

export async function loadCurrentCycleReceiptIds(
  prisma: PrismaLifecycleSource,
  registrationId: string,
): Promise<string[]> {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT r."id"
      FROM "Receipt" r
      LEFT JOIN "RegistrationProfile" rp
        ON rp."registrationId" = r."registrationId"
      WHERE r."registrationId" = $1
        AND r."status" = 'ACTIVE'
        AND r."voidedAt" IS NULL
        AND r."cycleNumber" = COALESCE(rp."currentCycle", 1)
      ORDER BY r."dateTimeIssued" DESC
    `,
    registrationId,
  )) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

export async function stampReceiptCycle(
  prisma: PrismaLifecycleSource,
  input: { receiptId: string; registrationId: string },
) {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      UPDATE "Receipt" r
      SET "cycleNumber" = COALESCE(
        (
          SELECT rp."currentCycle"
          FROM "RegistrationProfile" rp
          WHERE rp."registrationId" = $2
        ),
        1
      )
      WHERE r."id" = $1
    `,
    input.receiptId,
    input.registrationId,
  );
}

export async function stampSessionAdjustmentCycle(
  prisma: PrismaLifecycleSource,
  input: { adjustmentId: string; registrationId: string },
) {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      UPDATE "SessionAdjustment" s
      SET "cycleNumber" = COALESCE(
        (
          SELECT rp."currentCycle"
          FROM "RegistrationProfile" rp
          WHERE rp."registrationId" = $2
        ),
        1
      )
      WHERE s."id" = $1
    `,
    input.adjustmentId,
    input.registrationId,
  );
}

export async function addRegistrationRenewalHistory(
  prisma: PrismaLifecycleSource,
  input: {
    registrationId: string;
    playerCode: string;
    cycleNumber: number;
    action?: string;
    snapshot?: unknown;
  },
) {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "RegistrationRenewalHistory" (
        "id",
        "registrationId",
        "playerCode",
        "cycleNumber",
        "action",
        "snapshot",
        "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `,
    crypto.randomUUID(),
    input.registrationId,
    input.playerCode,
    Math.max(1, Math.round(input.cycleNumber)),
    normalizeText(input.action) || "REREGISTERED",
    input.snapshot == null ? null : JSON.stringify(input.snapshot),
  );
}

export async function listRegistrationRenewalHistory(
  prisma: PrismaLifecycleSource,
  registrationId: string,
): Promise<RegistrationRenewalHistoryRow[]> {
  await ensureRegistrationLifecycleInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "registrationId",
        "playerCode",
        "cycleNumber",
        "action",
        "snapshot",
        "createdAt"
      FROM "RegistrationRenewalHistory"
      WHERE "registrationId" = $1
      ORDER BY "createdAt" DESC
    `,
    registrationId,
  )) as Array<{
    id: string;
    registrationId: string;
    playerCode: string;
    cycleNumber: number | string;
    action: string;
    snapshot: Record<string, unknown> | null;
    createdAt: Date | string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    registrationId: row.registrationId,
    playerCode: row.playerCode,
    cycleNumber: Math.max(1, Math.round(Number(row.cycleNumber || 1))),
    action: row.action,
    snapshot: row.snapshot,
    createdAt: serializeDateTime(row.createdAt),
  }));
}

export async function searchRegistrationIds(
  prisma: PrismaLifecycleSource,
  search: string,
): Promise<string[]> {
  const term = normalizeText(search);
  if (!term) return [];
  await ensureRegistrationLifecycleInfrastructure(prisma);

  const like = `%${term}%`;
  const digits = normalizePhoneDigits(term);
  const digitsLike = digits ? `%${digits}%` : "";
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT pr."id"
      FROM "PackageRegistration" pr
      LEFT JOIN "RegistrationProfile" rp
        ON rp."registrationId" = pr."id"
      WHERE rp."playerCode" ILIKE $1
         OR pr."id" ILIKE $1
         OR pr."customerName" ILIKE $1
         OR COALESCE(pr."customerPhone", '') ILIKE $1
         OR COALESCE(pr."customerEmail", '') ILIKE $1
         OR ($2::text <> '' AND regexp_replace(COALESCE(pr."customerPhone", ''), '\D', '', 'g') LIKE $2)
      ORDER BY pr."createdAt" DESC
      LIMIT 500
    `,
    like,
    digitsLike,
  )) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}
