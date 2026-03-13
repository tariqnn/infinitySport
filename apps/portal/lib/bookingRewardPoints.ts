import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

type PrismaBookingRewardPointSource = Pick<
  PrismaClient,
  "$executeRawUnsafe" | "$queryRawUnsafe"
>;

const bookingRewardPointsInfraState = globalThis as unknown as {
  __portalBookingRewardPointsReady?: boolean;
  __portalBookingRewardPointsVersion?: number;
};

const BOOKING_REWARD_POINTS_VERSION = 1;
export const BOOKING_REWARD_POINTS_PER_HOUR = 10;

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export type BookingRewardPointAdjustmentRow = {
  id: string;
  bookingId: string;
  customerEmail: string;
  change: number;
  reason: string;
  source: string;
  createdAt: string;
};

export async function ensureBookingRewardPointsInfrastructure(
  prisma: PrismaBookingRewardPointSource,
) {
  if (
    bookingRewardPointsInfraState.__portalBookingRewardPointsReady &&
    (bookingRewardPointsInfraState.__portalBookingRewardPointsVersion || 0) >=
      BOOKING_REWARD_POINTS_VERSION
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookingRewardPointAdjustment" (
      "id" TEXT PRIMARY KEY,
      "bookingId" TEXT NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
      "customerEmail" TEXT NOT NULL,
      "change" INTEGER NOT NULL CHECK ("change" > 0),
      "reason" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BookingRewardPointAdjustment_bookingId_key"
    ON "BookingRewardPointAdjustment" ("bookingId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BookingRewardPointAdjustment_customerEmail_idx"
    ON "BookingRewardPointAdjustment" (LOWER("customerEmail"));
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BookingRewardPointAdjustment_createdAt_idx"
    ON "BookingRewardPointAdjustment" ("createdAt");
  `);

  bookingRewardPointsInfraState.__portalBookingRewardPointsReady = true;
  bookingRewardPointsInfraState.__portalBookingRewardPointsVersion =
    BOOKING_REWARD_POINTS_VERSION;
}

export function calculateBookingRewardPoints(input: {
  totalHours?: number | null;
  rewardPointsPerHour?: number | null;
}): number {
  const totalHours = Number(input.totalHours || 0);
  const rewardPointsPerHour =
    input.rewardPointsPerHour == null
      ? BOOKING_REWARD_POINTS_PER_HOUR
      : Math.max(0, Number(input.rewardPointsPerHour || 0));
  if (!Number.isFinite(totalHours) || totalHours <= 0) return 0;
  if (!Number.isFinite(rewardPointsPerHour) || rewardPointsPerHour <= 0) return 0;
  return Math.max(1, Math.round(totalHours * rewardPointsPerHour));
}

export async function loadBookingRewardPointsByEmail(
  prisma: PrismaBookingRewardPointSource,
  emails: string[],
): Promise<Map<string, number>> {
  const normalizedEmails = Array.from(
    new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean)),
  );
  if (normalizedEmails.length === 0) return new Map();

  await ensureBookingRewardPointsInfrastructure(prisma);

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        LOWER("customerEmail") AS "customerEmail",
        COALESCE(SUM("change"), 0) AS "pointsTotal"
      FROM "BookingRewardPointAdjustment"
      WHERE LOWER("customerEmail") = ANY($1::text[])
      GROUP BY LOWER("customerEmail")
    `,
    normalizedEmails,
  )) as Array<{ customerEmail: string; pointsTotal: number | string }>;

  return new Map(
    rows.map((row) => [
      normalizeEmail(row.customerEmail),
      Math.max(0, Math.round(Number(row.pointsTotal || 0))),
    ]),
  );
}

export async function addBookingRewardPointAdjustment(
  prisma: PrismaBookingRewardPointSource,
  input: {
    bookingId: string;
    customerEmail: string;
    change: number;
    reason: string;
    source: string;
  },
): Promise<{ awarded: boolean; points: number }> {
  const customerEmail = normalizeEmail(input.customerEmail);
  const change = Math.max(0, Math.round(Number(input.change || 0)));
  if (!customerEmail || change <= 0) {
    return { awarded: false, points: 0 };
  }

  await ensureBookingRewardPointsInfrastructure(prisma);

  const inserted = await prisma.$executeRawUnsafe(
    `
      INSERT INTO "BookingRewardPointAdjustment" (
        "id",
        "bookingId",
        "customerEmail",
        "change",
        "reason",
        "source",
        "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT ("bookingId") DO NOTHING
    `,
    crypto.randomUUID(),
    input.bookingId,
    customerEmail,
    change,
    input.reason.trim(),
    String(input.source || "PORTAL").trim().toUpperCase() || "PORTAL",
  );

  return { awarded: inserted > 0, points: inserted > 0 ? change : 0 };
}

export async function listBookingRewardPointAdjustments(
  prisma: PrismaBookingRewardPointSource,
  customerEmail: string,
): Promise<BookingRewardPointAdjustmentRow[]> {
  const normalizedEmail = normalizeEmail(customerEmail);
  if (!normalizedEmail) return [];

  await ensureBookingRewardPointsInfrastructure(prisma);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "bookingId",
        "customerEmail",
        "change",
        "reason",
        "source",
        "createdAt"
      FROM "BookingRewardPointAdjustment"
      WHERE LOWER("customerEmail") = $1
      ORDER BY "createdAt" DESC
    `,
    normalizedEmail,
  )) as Array<{
    id: string;
    bookingId: string;
    customerEmail: string;
    change: number | string;
    reason: string;
    source: string;
    createdAt: Date | string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    bookingId: row.bookingId,
    customerEmail: normalizeEmail(row.customerEmail),
    change: Math.max(0, Math.round(Number(row.change || 0))),
    reason: row.reason,
    source: row.source,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
