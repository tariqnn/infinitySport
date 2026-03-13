import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import {
  ensureBookingRewardPointsInfrastructure,
  loadBookingRewardPointsByEmail,
} from "./bookingRewardPoints";

type PrismaGuestPointSource = Pick<
  PrismaClient,
  "$executeRawUnsafe" | "$queryRawUnsafe"
>;

const guestPointInfraState = globalThis as unknown as {
  __portalGuestPointReady?: boolean;
  __portalGuestPointVersion?: number;
};

const GUEST_POINT_VERSION = 2;

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export type GuestPointAdjustmentRow = {
  id: string;
  customerEmail: string;
  change: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
};

export type GuestAccountSummaryRow = {
  email: string;
  name: string | null;
  bookingsCount: number;
  lastBookingAt: string | null;
  lastCourt: string | null;
  rewardPoints: number;
  manualPoints: number;
  totalPoints: number;
};

export async function ensureGuestPointInfrastructure(prisma: PrismaGuestPointSource) {
  if (
    guestPointInfraState.__portalGuestPointReady &&
    (guestPointInfraState.__portalGuestPointVersion || 0) >= GUEST_POINT_VERSION
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GuestPointAdjustment" (
      "id" TEXT PRIMARY KEY,
      "customerEmail" TEXT NOT NULL,
      "change" INTEGER NOT NULL,
      "reason" TEXT NOT NULL,
      "createdBy" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "GuestPointAdjustment_customerEmail_idx"
    ON "GuestPointAdjustment" (LOWER("customerEmail"));
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "GuestPointAdjustment_createdAt_idx"
    ON "GuestPointAdjustment" ("createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GuestAccountDeletion" (
      "customerEmail" TEXT PRIMARY KEY,
      "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "GuestAccountDeletion_deletedAt_idx"
    ON "GuestAccountDeletion" ("deletedAt");
  `);

  guestPointInfraState.__portalGuestPointReady = true;
  guestPointInfraState.__portalGuestPointVersion = GUEST_POINT_VERSION;
}

export async function loadGuestManualPointsByEmail(
  prisma: PrismaGuestPointSource,
  emails: string[],
): Promise<Map<string, number>> {
  const normalizedEmails = Array.from(
    new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean)),
  );
  if (normalizedEmails.length === 0) return new Map();

  await ensureGuestPointInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        LOWER("customerEmail") AS "customerEmail",
        COALESCE(SUM("change"), 0) AS "pointsTotal"
      FROM "GuestPointAdjustment"
      WHERE LOWER("customerEmail") = ANY($1::text[])
      GROUP BY LOWER("customerEmail")
    `,
    normalizedEmails,
  )) as Array<{ customerEmail: string; pointsTotal: number | string }>;

  return new Map(
    rows.map((row) => [
      normalizeEmail(row.customerEmail),
      Math.round(Number(row.pointsTotal || 0)),
    ]),
  );
}

export async function loadGuestTotalPointsByEmail(
  prisma: PrismaGuestPointSource,
  emails: string[],
): Promise<Map<string, { rewardPoints: number; manualPoints: number; totalPoints: number }>> {
  const normalizedEmails = Array.from(
    new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean)),
  );
  if (normalizedEmails.length === 0) return new Map();

  const [rewardPoints, manualPoints] = await Promise.all([
    loadBookingRewardPointsByEmail(prisma, normalizedEmails),
    loadGuestManualPointsByEmail(prisma, normalizedEmails),
  ]);

  const result = new Map<string, { rewardPoints: number; manualPoints: number; totalPoints: number }>();
  for (const email of normalizedEmails) {
    const reward = Math.max(0, rewardPoints.get(email) ?? 0);
    const manual = manualPoints.get(email) ?? 0;
    result.set(email, {
      rewardPoints: reward,
      manualPoints: manual,
      totalPoints: Math.max(0, reward + manual),
    });
  }
  return result;
}

export async function addGuestPointAdjustment(
  prisma: PrismaGuestPointSource,
  input: {
    customerEmail: string;
    change: number;
    reason: string;
    createdBy?: string | null;
  },
) {
  const customerEmail = normalizeEmail(input.customerEmail);
  const change = Math.round(Number(input.change || 0));
  if (!customerEmail || !Number.isFinite(change) || change === 0) {
    throw new Error("Valid customer email and non-zero points change are required.");
  }

  await ensureGuestPointInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "GuestPointAdjustment" (
        "id",
        "customerEmail",
        "change",
        "reason",
        "createdBy",
        "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    crypto.randomUUID(),
    customerEmail,
    change,
    input.reason.trim(),
    input.createdBy ?? null,
  );
}

export async function listGuestPointAdjustments(
  prisma: PrismaGuestPointSource,
  customerEmail: string,
): Promise<GuestPointAdjustmentRow[]> {
  const normalizedEmail = normalizeEmail(customerEmail);
  if (!normalizedEmail) return [];

  await ensureGuestPointInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "customerEmail",
        "change",
        "reason",
        "createdBy",
        "createdAt"
      FROM "GuestPointAdjustment"
      WHERE LOWER("customerEmail") = $1
      ORDER BY "createdAt" DESC
    `,
    normalizedEmail,
  )) as Array<{
    id: string;
    customerEmail: string;
    change: number | string;
    reason: string;
    createdBy: string | null;
    createdAt: Date | string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    customerEmail: normalizeEmail(row.customerEmail),
    change: Math.round(Number(row.change || 0)),
    reason: row.reason,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function listGuestAccounts(
  prisma: PrismaGuestPointSource,
  options?: { search?: string | null },
): Promise<GuestAccountSummaryRow[]> {
  await ensureGuestPointInfrastructure(prisma);
  await ensureBookingRewardPointsInfrastructure(prisma);
  const search = String(options?.search || "").trim().toLowerCase();
  const searchLike = `%${search}%`;

  const rows = (await prisma.$queryRawUnsafe(
    `
      WITH booking_rollup AS (
        SELECT
          LOWER(TRIM("customerEmail")) AS email,
          COUNT(*)::int AS "bookingsCount",
          MAX("updatedAt") AS "lastBookingAt"
        FROM "Booking"
        WHERE "customerEmail" IS NOT NULL
          AND TRIM("customerEmail") <> ''
        GROUP BY LOWER(TRIM("customerEmail"))
      ),
      booking_latest AS (
        SELECT DISTINCT ON (LOWER(TRIM("customerEmail")))
          LOWER(TRIM("customerEmail")) AS email,
          NULLIF(TRIM("customerName"), '') AS name,
          NULLIF(TRIM("facilityArea"), '') AS "lastCourt",
          "updatedAt" AS "lastBookingAt"
        FROM "Booking"
        WHERE "customerEmail" IS NOT NULL
          AND TRIM("customerEmail") <> ''
        ORDER BY LOWER(TRIM("customerEmail")), "updatedAt" DESC
      ),
      reward_totals AS (
        SELECT
          LOWER("customerEmail") AS email,
          COALESCE(SUM("change"), 0)::int AS "rewardPoints"
        FROM "BookingRewardPointAdjustment"
        GROUP BY LOWER("customerEmail")
      ),
      manual_totals AS (
        SELECT
          LOWER("customerEmail") AS email,
          COALESCE(SUM("change"), 0)::int AS "manualPoints"
        FROM "GuestPointAdjustment"
        GROUP BY LOWER("customerEmail")
      ),
      deleted_accounts AS (
        SELECT LOWER("customerEmail") AS email
        FROM "GuestAccountDeletion"
      ),
      email_union AS (
        SELECT email FROM booking_rollup
        UNION
        SELECT email FROM reward_totals
        UNION
        SELECT email FROM manual_totals
      )
      SELECT
        email_union.email,
        booking_latest.name,
        COALESCE(booking_rollup."bookingsCount", 0) AS "bookingsCount",
        booking_rollup."lastBookingAt",
        booking_latest."lastCourt",
        COALESCE(reward_totals."rewardPoints", 0) AS "rewardPoints",
        COALESCE(manual_totals."manualPoints", 0) AS "manualPoints"
      FROM email_union
      LEFT JOIN booking_rollup ON booking_rollup.email = email_union.email
      LEFT JOIN booking_latest ON booking_latest.email = email_union.email
      LEFT JOIN reward_totals ON reward_totals.email = email_union.email
      LEFT JOIN manual_totals ON manual_totals.email = email_union.email
      LEFT JOIN deleted_accounts ON deleted_accounts.email = email_union.email
      WHERE deleted_accounts.email IS NULL
        AND (
             $1 = '%%'
         OR email_union.email ILIKE $1
         OR COALESCE(booking_latest.name, '') ILIKE $1
        )
      ORDER BY COALESCE(booking_rollup."lastBookingAt", booking_latest."lastBookingAt") DESC NULLS LAST,
               email_union.email ASC
    `,
    search ? searchLike : "%%",
  )) as Array<{
    email: string;
    name: string | null;
    bookingsCount: number | string;
    lastBookingAt: Date | string | null;
    lastCourt: string | null;
    rewardPoints: number | string;
    manualPoints: number | string;
  }>;

  return rows.map((row) => {
    const rewardPoints = Math.max(0, Math.round(Number(row.rewardPoints || 0)));
    const manualPoints = Math.round(Number(row.manualPoints || 0));
    return {
      email: normalizeEmail(row.email),
      name: row.name?.trim() || null,
      bookingsCount: Math.max(0, Math.round(Number(row.bookingsCount || 0))),
      lastBookingAt: row.lastBookingAt ? new Date(row.lastBookingAt).toISOString() : null,
      lastCourt: row.lastCourt?.trim() || null,
      rewardPoints,
      manualPoints,
      totalPoints: Math.max(0, rewardPoints + manualPoints),
    };
  });
}

export async function listDeletedGuestAccountEmails(
  prisma: PrismaGuestPointSource,
): Promise<Set<string>> {
  await ensureGuestPointInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT LOWER("customerEmail") AS email
    FROM "GuestAccountDeletion"
  `)) as Array<{ email: string }>;
  return new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean));
}

export async function markGuestAccountDeleted(
  prisma: PrismaGuestPointSource,
  customerEmail: string,
) {
  const normalizedEmail = normalizeEmail(customerEmail);
  if (!normalizedEmail) {
    throw new Error("Valid guest email is required.");
  }
  await ensureGuestPointInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "GuestAccountDeletion" ("customerEmail", "deletedAt")
      VALUES ($1, NOW())
      ON CONFLICT ("customerEmail")
      DO UPDATE SET "deletedAt" = EXCLUDED."deletedAt"
    `,
    normalizedEmail,
  );
}

export async function restoreGuestAccount(
  prisma: PrismaGuestPointSource,
  customerEmail: string,
) {
  const normalizedEmail = normalizeEmail(customerEmail);
  if (!normalizedEmail) return;
  await ensureGuestPointInfrastructure(prisma);
  await prisma.$executeRawUnsafe(
    `
      DELETE FROM "GuestAccountDeletion"
      WHERE LOWER("customerEmail") = $1
    `,
    normalizedEmail,
  );
}
