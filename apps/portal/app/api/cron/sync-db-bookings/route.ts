import * as admin from "firebase-admin";
import crypto from "crypto";
import type { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  bookingCourtNameFromId,
  listMobileBookingInboxEntries,
  listMobileBookingActionInboxEntries,
  syncBookingRecordToFirestore,
  updateMobileBookingInboxEntry,
  updateMobileBookingActionInboxEntry,
} from "../../../../lib/bookingRealtimeSync";
import { prisma } from "../../../../lib/db";
import { getFirestore } from "../../../../lib/firebase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOOKING_SOURCE_PATTERN = /\[SOURCE:(WEBSITE|APP|ADMIN)\]/i;

type BookingRow = {
  id: string;
  companyId: string;
  facilityArea: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  isPaid: boolean;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingPaymentMethod =
  | "CASH"
  | "CARD"
  | "ONLINE"
  | "TRANSFER"
  | "OTHER";

type BookingPaymentStatus = "PAID" | "REFUNDED";

type BookingPaymentRow = {
  bookingId: string;
  amount: number;
  method: BookingPaymentMethod;
  status: BookingPaymentStatus;
  createdAt: string;
};

type BookingFinancialSummary = {
  totalHours: number;
  totalAmount: number;
  paidAmount: number;
  refundAmount: number;
  netPaid: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PAID" | "PARTIAL" | "REFUNDED";
  latestPaymentMethod: BookingPaymentMethod | null;
};

export type BookingSyncRunResult = {
  ok: true;
  examined: number;
  synced: number;
  importedFromApp: number;
  importConflicts: number;
  importErrors: number;
  actionsProcessed: number;
  actionErrors: number;
  cursorAfter: string;
};

let bookingSyncRun: Promise<BookingSyncRunResult> | null = null;

function inferBookingSource(
  notes: string | null | undefined,
): "WEBSITE" | "APP" | "ADMIN" {
  const text = String(notes || "");
  const tagged = text.match(BOOKING_SOURCE_PATTERN)?.[1];
  if (tagged === "WEBSITE" || tagged === "APP" || tagged === "ADMIN") {
    return tagged;
  }
  const lowered = text.toLowerCase();
  if (lowered.includes("public booking")) return "WEBSITE";
  if (lowered.includes("mobile app")) return "APP";
  return "ADMIN";
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBookingStatus(value: unknown): string {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED") return "CONFIRMED";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function normalizePaymentMethod(value: unknown): BookingPaymentMethod {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CARD") return "CARD";
  if (normalized === "ONLINE") return "ONLINE";
  if (normalized === "TRANSFER") return "TRANSFER";
  if (normalized === "OTHER") return "OTHER";
  return "CASH";
}

function normalizePaymentStatus(value: unknown): BookingPaymentStatus {
  return normalizeText(value).toUpperCase() === "REFUNDED"
    ? "REFUNDED"
    : "PAID";
}

function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function getSecret(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7).trim();
  return new URL(request.url).searchParams.get("secret");
}

function isInternalLoopRequest(request: Request) {
  if (request.headers.get("x-portal-internal-sync") !== "1") {
    return false;
  }
  const hostname = new URL(request.url).hostname.trim().toLowerCase();
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function withSourceTag(
  notes: string | null | undefined,
  source: "WEBSITE" | "APP" | "ADMIN",
): string {
  const text = String(notes || "").trim();
  if (!text) return `[SOURCE:${source}]`;
  if (BOOKING_SOURCE_PATTERN.test(text)) {
    return text.replace(BOOKING_SOURCE_PATTERN, `[SOURCE:${source}]`);
  }
  return `[SOURCE:${source}] ${text}`;
}

function parseFirestoreDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveBookingCourtNameFromPayload(
  payload: Record<string, unknown>,
): string | null {
  const direct =
    normalizeText(payload.facilityArea) ||
    normalizeText(payload.courtName) ||
    normalizeText(payload.courtType) ||
    normalizeText(payload.court);
  if (direct) return direct;

  const courtRecord =
    payload.court && typeof payload.court === "object"
      ? (payload.court as Record<string, unknown>)
      : null;
  const nestedName =
    normalizeText(courtRecord?.name) ||
    normalizeText(courtRecord?.facilityArea);
  if (nestedName) return nestedName;

  const courtId =
    normalizeText(payload.courtId) ||
    normalizeText(courtRecord?.id) ||
    normalizeText(courtRecord?.courtId);
  return bookingCourtNameFromId(courtId) || null;
}

async function resolveActiveCompanyId(): Promise<string> {
  const existing = await prisma.company.findFirst({
    where: { status: "ACTIVE" as any },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing?.id) return existing.id;

  const created = await prisma.company.create({
    data: {
      name: "Infinity Sport",
      contactName: "Infinity Sport",
      contactEmail: "infinitysportsacademyjo@gmail.com",
      status: "ACTIVE" as any,
    },
    select: { id: true },
  });
  return created.id;
}

async function processMobileBookingsFromFirestore(params: {
  firestore: admin.firestore.Firestore;
}) {
  const { firestore } = params;
  const entries = await listMobileBookingInboxEntries({
    firestore,
    limit: 200,
  });

  const pendingEntries = entries.filter((entry) => {
    const status = normalizeText(entry.data.status).toUpperCase();
    const imported = entry.data.dbImported === true;
    if (imported) return false;
    return !["SYNCED", "CANCELLED"].includes(status);
  });

  if (!pendingEntries.length) {
    return {
      processed: 0,
      errors: 0,
      conflicts: 0,
      touchedBookingIds: [] as string[],
    };
  }

  const defaultCompanyId = await resolveActiveCompanyId();
  const touchedBookingIds = new Set<string>();
  let processed = 0;
  let errors = 0;
  let conflicts = 0;

  for (const entry of pendingEntries) {
    const payload = entry.data;
    const bookingId = normalizeText(payload.bookingId) || entry.id;
    const facilityArea = resolveBookingCourtNameFromPayload(payload);
    const startTime = parseFirestoreDateValue(
      payload.startTime ?? payload.startTimeIso,
    );
    const endTime = parseFirestoreDateValue(
      payload.endTime ?? payload.endTimeIso,
    );
    const customerName = normalizeText(payload.customerName);
    const customerPhone = normalizeText(payload.customerPhone);
    const customerEmail = normalizeText(payload.customerEmail) || null;
    const status = normalizeBookingStatus(payload.status);
    const notes = normalizeText(payload.notes);
    const companyId = normalizeText(payload.companyId) || defaultCompanyId;

    if (
      !facilityArea ||
      !startTime ||
      !endTime ||
      !customerName ||
      !customerPhone ||
      endTime.getTime() <= startTime.getTime()
    ) {
      await updateMobileBookingInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "ERROR",
          syncError: "Missing or invalid booking fields.",
          dbImported: false,
        },
      });
      errors += 1;
      continue;
    }

    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });
    if (existing) {
      touchedBookingIds.add(bookingId);
      await updateMobileBookingInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "SYNCED",
          dbImported: true,
          dbBookingId: bookingId,
          syncError: null,
        },
      });
      processed += 1;
      continue;
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        facilityArea,
        status: { not: "CANCELLED" as BookingStatus },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: {
        id: true,
        customerName: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (overlap) {
      await updateMobileBookingInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "CONFLICT",
          dbImported: false,
          syncError: "Time conflicts with an existing booking.",
          conflict: {
            type: "BOOKING_OVERLAP",
            bookingId: overlap.id,
            customerName: overlap.customerName ?? null,
            startTime: overlap.startTime.toISOString(),
            endTime: overlap.endTime.toISOString(),
          },
        },
      });
      conflicts += 1;
      continue;
    }

    const row = await prisma.booking.create({
      data: {
        id: bookingId,
        companyId,
        facilityArea,
        startTime,
        endTime,
        status: status as BookingStatus,
        isPaid: Boolean(payload.isPaid),
        customerName,
        customerPhone,
        customerEmail,
        notes: withSourceTag(notes || "Mobile app booking", "APP"),
      },
      select: {
        id: true,
      },
    });

    touchedBookingIds.add(row.id);
    await updateMobileBookingInboxEntry({
      firestore,
      id: entry.id,
      data: {
        status: "SYNCED",
        dbImported: true,
        dbBookingId: row.id,
        syncError: null,
        conflict: null,
      },
    });
    processed += 1;
  }

  return {
    processed,
    errors,
    conflicts,
    touchedBookingIds: Array.from(touchedBookingIds),
  };
}

async function ensureBookingInfrastructure() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookingPayment" (
      "id" TEXT PRIMARY KEY,
      "bookingId" TEXT NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
      "customerId" TEXT NULL,
      "amount" INTEGER NOT NULL CHECK ("amount" >= 0),
      "method" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PAID',
      "transactionRef" TEXT NULL,
      "createdByAdminId" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BookingPayment_bookingId_idx"
    ON "BookingPayment" ("bookingId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BookingPayment_createdAt_idx"
    ON "BookingPayment" ("createdAt");
  `);
}

async function loadCourtRates(): Promise<Record<string, number>> {
  try {
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT "courtType", "hourlyRate"
      FROM "CourtRate"
    `)) as Array<{ courtType: string; hourlyRate: number }>;

    return Object.fromEntries(
      rows
        .map((row) => [
          normalizeText(row.courtType),
          Math.max(0, Math.round(Number(row.hourlyRate || 0))),
        ] as const)
        .filter(([courtType]) => Boolean(courtType)),
    );
  } catch (error) {
    console.warn("[cron/sync-db-bookings] CourtRate lookup skipped", error);
    return {};
  }
}

function getCourtRate(
  facilityArea: string | null | undefined,
  courtRates: Record<string, number>,
): number {
  const key = normalizeText(facilityArea);
  return key ? Number(courtRates[key] || 0) : 0;
}

async function loadBookingPayments(
  bookingIds: string[],
): Promise<BookingPaymentRow[]> {
  if (!bookingIds.length) return [];
  await ensureBookingInfrastructure();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "bookingId",
        "amount",
        "method",
        "status",
        "createdAt"
      FROM "BookingPayment"
      WHERE "bookingId" = ANY($1::text[])
      ORDER BY "createdAt" DESC
    `,
    bookingIds,
  )) as Array<{
    bookingId: string;
    amount: number;
    method: string;
    status: string;
    createdAt: Date | string;
  }>;

  return rows.map((row) => ({
    bookingId: row.bookingId,
    amount: Number(row.amount || 0),
    method: normalizePaymentMethod(row.method),
    status: normalizePaymentStatus(row.status),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

function computeBookingFinancials(
  booking: Pick<BookingRow, "startTime" | "endTime" | "facilityArea">,
  payments: BookingPaymentRow[],
  courtRates: Record<string, number>,
): BookingFinancialSummary {
  const totalHours = hoursBetween(booking.startTime, booking.endTime);
  const totalAmount = Math.max(
    0,
    Math.round(totalHours * getCourtRate(booking.facilityArea, courtRates)),
  );
  const paidAmount = payments
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const refundAmount = payments
    .filter((row) => row.status === "REFUNDED")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const netPaid = paidAmount - refundAmount;
  const remainingAmount = Math.max(0, totalAmount - netPaid);
  const latestPaymentMethod = payments.length ? payments[0]?.method ?? null : null;

  let paymentStatus: BookingFinancialSummary["paymentStatus"] = "UNPAID";
  if (netPaid <= 0 && refundAmount > 0) paymentStatus = "REFUNDED";
  else if (netPaid <= 0) paymentStatus = "UNPAID";
  else if (totalAmount > 0 && netPaid >= totalAmount) paymentStatus = "PAID";
  else paymentStatus = "PARTIAL";

  return {
    totalHours,
    totalAmount,
    paidAmount,
    refundAmount,
    netPaid,
    remainingAmount,
    paymentStatus,
    latestPaymentMethod,
  };
}

async function processMobileBookingActionsFromFirestore(params: {
  firestore: admin.firestore.Firestore;
  courtRates: Record<string, number>;
}) {
  const { firestore, courtRates } = params;
  const entries = await listMobileBookingActionInboxEntries({
    firestore,
    limit: 200,
  });

  const pendingEntries = entries.filter((entry) => {
    const status = normalizeText(entry.data.status).toUpperCase();
    const imported = entry.data.dbImported === true;
    if (imported) return false;
    return !["SYNCED", "CANCELLED"].includes(status);
  });

  const touchedBookingIds = new Set<string>();
  let processed = 0;
  let errors = 0;

  for (const entry of pendingEntries) {
    const payload = entry.data;
    const bookingId = normalizeText(payload.bookingId);
    const actionType = normalizeText(payload.actionType).toUpperCase();
    const confirmBooking = payload.confirmBooking === true;
    const requestedAmount = Math.max(
      0,
      Math.round(Number(payload.paymentAmount || 0)),
    );
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

    if (!bookingId || !["CONFIRM_BOOKING", "COLLECT_PAYMENT"].includes(actionType)) {
      await updateMobileBookingActionInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "ERROR",
          syncError: "Missing or invalid booking action fields.",
          dbImported: false,
        },
      });
      errors += 1;
      continue;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        companyId: true,
        facilityArea: true,
        startTime: true,
        endTime: true,
        status: true,
        isPaid: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!booking) {
      const realtimeBookingSnap = await firestore
        .collection("portalBookings")
        .doc(bookingId)
        .get()
        .catch(() => null);
      const realtimeBooking =
        realtimeBookingSnap?.exists
          ? ((realtimeBookingSnap.data() as Record<string, unknown> | undefined) ?? {})
          : null;
      const realtimeStatus = normalizeBookingStatus(realtimeBooking?.status);
      const wasDeleted = realtimeBooking?.deleted === true;
      const syncError =
        wasDeleted || realtimeStatus === "CANCELLED"
          ? "This booking is already cancelled and cannot be updated."
          : "Booking not found in portal.";

      await updateMobileBookingActionInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "ERROR",
          syncError,
          dbImported: false,
        },
      });
      errors += 1;
      continue;
    }

    const currentStatus = normalizeBookingStatus(booking.status);
    if (currentStatus === "CANCELLED") {
      await updateMobileBookingActionInboxEntry({
        firestore,
        id: entry.id,
        data: {
          status: "ERROR",
          syncError: "Cancelled bookings cannot be updated from mobile.",
          dbImported: false,
          dbBookingId: bookingId,
        },
      });
      errors += 1;
      continue;
    }

    const currentPayments = await loadBookingPayments([bookingId]);
    const currentFinancials = computeBookingFinancials(
      booking,
      currentPayments,
      courtRates,
    );

    let nextStatus = currentStatus;
    if ((confirmBooking || actionType === "CONFIRM_BOOKING") && currentStatus === "PENDING") {
      nextStatus = "CONFIRMED";
    }

    let recordedAmount = 0;
    let syncNote: string | null = null;

    if (actionType === "COLLECT_PAYMENT") {
      if (requestedAmount <= 0) {
        await updateMobileBookingActionInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "ERROR",
            syncError: "Payment amount must be greater than 0.",
            dbImported: false,
            dbBookingId: bookingId,
          },
        });
        errors += 1;
        continue;
      }

      recordedAmount = Math.min(
        requestedAmount,
        Math.max(0, Math.round(currentFinancials.remainingAmount)),
      );

      if (recordedAmount > 0) {
        await prisma.$executeRawUnsafe(
          `
            INSERT INTO "BookingPayment"
            ("id", "bookingId", "customerId", "amount", "method", "status", "transactionRef", "createdByAdminId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `,
          crypto.randomUUID(),
          bookingId,
          null,
          recordedAmount,
          paymentMethod,
          "PAID",
          null,
          null,
        );
      } else {
        syncNote = "Booking already has no remaining balance.";
      }
    }

    const finalPayments =
      actionType === "COLLECT_PAYMENT" && recordedAmount > 0
        ? await loadBookingPayments([bookingId])
        : currentPayments;
    const finalFinancials = computeBookingFinancials(
      booking,
      finalPayments,
      courtRates,
    );
    const nextIsPaid = finalFinancials.paymentStatus === "PAID";

    if (
      nextStatus !== booking.status ||
      nextIsPaid !== booking.isPaid ||
      recordedAmount > 0
    ) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: nextStatus as BookingStatus,
          isPaid: nextIsPaid,
        },
      });
      touchedBookingIds.add(bookingId);
    }

    await updateMobileBookingActionInboxEntry({
      firestore,
      id: entry.id,
      data: {
        status: "SYNCED",
        dbImported: true,
        dbBookingId: bookingId,
        syncError: null,
        syncNote,
        recordedAmount: recordedAmount || null,
        paymentMethod: actionType === "COLLECT_PAYMENT" ? paymentMethod : null,
      },
    });
    processed += 1;
  }

  return {
    processed,
    errors,
    touchedBookingIds: Array.from(touchedBookingIds),
  };
}

async function loadBookingsToSync(since: Date, forcedBookingIds: string[]) {
  const where =
    forcedBookingIds.length > 0
      ? {
          OR: [
            { updatedAt: { gt: since } },
            { id: { in: forcedBookingIds } },
          ],
        }
      : { updatedAt: { gt: since } };

  return prisma.booking.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    take: 500,
    select: {
      id: true,
      companyId: true,
      facilityArea: true,
      startTime: true,
      endTime: true,
      status: true,
      isPaid: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Picks up new or updated rows in Postgres `Booking` and mirrors them to Firestore `portalBookings`,
 * so WhatsApp Cloud Functions run without changing the public landing (Hostinger).
 *
 * Call every 1-5 minutes from an external cron or Firebase Cloud Scheduler:
 *   GET https://YOUR-PORTAL/api/cron/sync-db-bookings?secret=YOUR_SECRET
 * or  Authorization: Bearer YOUR_SECRET
 */
export async function runBookingDbSync(): Promise<BookingSyncRunResult> {
  if (bookingSyncRun) {
    return bookingSyncRun;
  }

  bookingSyncRun = (async () => {
    await ensureBookingInfrastructure();

    const firestore = getFirestore();
    const cursorRef = firestore.collection("bookingNotifierSync").doc("dbCursor");
    const cursorSnap = await cursorRef.get();

    let since: Date;
    const existingCursor =
      cursorSnap.data()?.lastSyncedUpdatedAt ?? cursorSnap.data()?.lastSyncedCreatedAt ?? null;
    if (cursorSnap.exists && existingCursor != null) {
      const raw = existingCursor;
      since =
        raw &&
        typeof raw === "object" &&
        "toDate" in raw &&
        typeof (raw as { toDate: () => Date }).toDate === "function"
          ? (raw as admin.firestore.Timestamp).toDate()
          : new Date(String(raw));
    } else {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    const courtRates = await loadCourtRates();
    const importResult = await processMobileBookingsFromFirestore({
      firestore,
    });
    const actionResult = await processMobileBookingActionsFromFirestore({
      firestore,
      courtRates,
    });

    const forcedBookingIds = Array.from(
      new Set([
        ...importResult.touchedBookingIds,
        ...actionResult.touchedBookingIds,
      ]),
    );

    const rows = await loadBookingsToSync(since, forcedBookingIds);
    const payments = await loadBookingPayments(rows.map((row) => row.id));
    const paymentsByBooking = new Map<string, BookingPaymentRow[]>();
    for (const payment of payments) {
      const current = paymentsByBooking.get(payment.bookingId) || [];
      current.push(payment);
      paymentsByBooking.set(payment.bookingId, current);
    }

    let maxUpdated = since;
    let synced = 0;
    for (const row of rows) {
      if (row.updatedAt > maxUpdated) maxUpdated = row.updatedAt;
      try {
        const financials = computeBookingFinancials(
          row,
          paymentsByBooking.get(row.id) || [],
          courtRates,
        );

        await syncBookingRecordToFirestore({
          firestore,
          booking: {
            id: row.id,
            companyId: row.companyId,
            facilityArea: row.facilityArea,
            startTime: row.startTime,
            endTime: row.endTime,
            status: row.status,
            source: inferBookingSource(row.notes),
            isPaid: row.isPaid,
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            customerEmail: row.customerEmail,
            notes: row.notes,
            totalHours: financials.totalHours,
            totalAmount: financials.totalAmount,
            paidAmount: financials.paidAmount,
            refundAmount: financials.refundAmount,
            netPaid: financials.netPaid,
            remainingAmount: financials.remainingAmount,
            paymentStatus: financials.paymentStatus,
            latestPaymentMethod: financials.latestPaymentMethod,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deleted: false,
          },
        });
        synced += 1;
      } catch (error) {
        console.warn("[cron/sync-db-bookings] sync failed", row.id, error);
      }
    }

    if (rows.length > 0) {
      await cursorRef.set(
        {
          lastSyncedUpdatedAt: admin.firestore.Timestamp.fromDate(maxUpdated),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return {
      ok: true,
      examined: rows.length,
      synced,
      importedFromApp: importResult.processed,
      importConflicts: importResult.conflicts,
      importErrors: importResult.errors,
      actionsProcessed: actionResult.processed,
      actionErrors: actionResult.errors,
      cursorAfter: maxUpdated.toISOString(),
    };
  })();

  try {
    return await bookingSyncRun;
  } finally {
    bookingSyncRun = null;
  }
}

async function handle(request: Request) {
  const expected = process.env.CRON_SYNC_BOOKINGS_SECRET?.trim();
  const got = getSecret(request);
  const authorized =
    (expected && got === expected) ||
    (!expected && isInternalLoopRequest(request));
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runBookingDbSync());
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
