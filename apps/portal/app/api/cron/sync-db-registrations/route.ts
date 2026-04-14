import * as admin from "firebase-admin";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getFirestore } from "../../../../lib/firebase-admin";
import {
  listMobileRegistrationInboxEntries,
  syncCanceledSessionsToFirestore,
  syncPackagesToFirestore,
  syncRegistrationRecordToFirestore,
  updateMobileRegistrationInboxEntry,
} from "../../../../lib/registrationRealtimeSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type RegistrationSyncRunResult = {
  ok: true;
  examined: number;
  synced: number;
  packagesSynced: number;
  canceledSessionsSynced: number;
  cursorAfter: string;
};

let registrationSyncRun: Promise<RegistrationSyncRunResult> | null = null;

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

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeFinalPriceJod(
  basePriceJod: number,
  discountType: string,
  discountValue: number | null,
) {
  const base = Math.max(0, Math.round(Number(basePriceJod || 0)));
  if (!discountType || discountType === "NONE" || discountValue == null) {
    return base;
  }
  if (discountType === "PERCENT") {
    return Math.max(0, base - Math.round((base * discountValue) / 100));
  }
  if (discountType === "AMOUNT") {
    return Math.max(0, base - Math.round(discountValue));
  }
  return base;
}

function billingPeriodFromDate(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    billingPeriodKey: `${y}-${String(m + 1).padStart(2, "0")}`,
    priceLockedUntil: new Date(y, m + 1, 0, 23, 59, 59, 999),
  };
}

export async function runRegistrationDbSync(): Promise<RegistrationSyncRunResult> {
  if (registrationSyncRun) {
    return registrationSyncRun;
  }

  registrationSyncRun = (async () => {
    const firestore = getFirestore();
    const cursorRef = firestore.collection("bookingNotifierSync").doc("registrationDbCursor");
    const cursorSnap = await cursorRef.get();
    const appImportedRegistrationIds = new Set<string>();

    const inboxEntries = await listMobileRegistrationInboxEntries({
      firestore,
      limit: 200,
    });
    for (const entry of inboxEntries) {
      const status = normalizeText(entry.data.status).toUpperCase();
      const imported = entry.data.dbImported === true;
      if (imported || ["SYNCED", "CANCELLED"].includes(status)) {
        continue;
      }

      const packageName = normalizeText(entry.data.packageName);
      const customerName = normalizeText(entry.data.customerName);
      const customerPhone = normalizeText(entry.data.customerPhone);
      if (!packageName || !customerName || !customerPhone) {
        await updateMobileRegistrationInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "ERROR",
            syncError: "Missing packageName, customerName, or customerPhone.",
            dbImported: false,
          },
        });
        continue;
      }

      const duplicate = await prisma.packageRegistration.findFirst({
        where: {
          packageName,
          customerPhone,
        },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      });
      if (duplicate) {
        await updateMobileRegistrationInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "CONFLICT",
            syncError: "Registration already exists for this package and phone.",
            dbImported: false,
            dbRegistrationId: duplicate.id,
          },
        });
        continue;
      }

      const pkg = await prisma.package.findFirst({
        where: { name: packageName },
        select: { currentPriceJod: true, sessionsCount: true },
      });
      const basePriceJod = Math.max(
        0,
        Math.round(
          Number(
            entry.data.basePriceJod ?? pkg?.currentPriceJod ?? 0,
          ) || 0,
        ),
      );
      const discountType = normalizeText(entry.data.discountType || "NONE").toUpperCase() || "NONE";
      const discountValue =
        entry.data.discountValue == null ? null : Number(entry.data.discountValue);
      const now = new Date();
      const periodStartsAt = parseOptionalDate(
        entry.data.periodStartsAt ?? entry.data.periodStartsAtIso,
      );
      const periodEndsAt = periodStartsAt
        ? new Date(periodStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(now);
      const sessionsLeft =
        entry.data.sessionsLeft == null
          ? Number(pkg?.sessionsCount || 0) > 0
            ? Math.round(Number(pkg?.sessionsCount || 0))
            : null
          : Math.max(0, Math.round(Number(entry.data.sessionsLeft || 0)));

      try {
        const row = await prisma.packageRegistration.create({
          data: {
            packageName,
            customerName,
            customerPhone,
            customerEmail: normalizeText(entry.data.customerEmail) || null,
            customerAge:
              entry.data.customerAge == null
                ? null
                : Math.max(0, Math.round(Number(entry.data.customerAge || 0))),
            isPaid: false,
            basePriceJod,
            discountType,
            discountValue:
              discountType === "NONE" || discountValue == null
                ? null
                : Math.round(discountValue),
            discountReason:
              discountType === "NONE"
                ? null
                : normalizeText(entry.data.discountReason) || null,
            finalPriceJod: computeFinalPriceJod(basePriceJod, discountType, discountValue),
            billingPeriodKey,
            priceLockedUntil,
            periodStartsAt,
            periodEndsAt,
            sessionsLeft,
            nextPaymentDate: periodEndsAt,
            planLabel: normalizeText(entry.data.planLabel) || packageName,
            status: "ACTIVE",
          },
        });

        await updateMobileRegistrationInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "SYNCED",
            dbImported: true,
            dbRegistrationId: row.id,
            syncError: null,
          },
        });
        appImportedRegistrationIds.add(row.id);
      } catch (error) {
        await updateMobileRegistrationInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "ERROR",
            dbImported: false,
            syncError: error instanceof Error ? error.message : "Registration import failed",
          },
        });
      }
    }

    let since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingCursor =
      cursorSnap.data()?.lastSyncedUpdatedAt ?? cursorSnap.data()?.lastSyncedCreatedAt ?? null;
    if (cursorSnap.exists && existingCursor != null) {
      since =
        existingCursor &&
        typeof existingCursor === "object" &&
        "toDate" in existingCursor &&
        typeof (existingCursor as { toDate: () => Date }).toDate === "function"
          ? (existingCursor as admin.firestore.Timestamp).toDate()
          : new Date(String(existingCursor));
    }

    const [rows, packages, canceledSessions] = await Promise.all([
      prisma.packageRegistration.findMany({
        where: { updatedAt: { gt: since } },
        orderBy: { updatedAt: "asc" },
        take: 500,
        include: { receipts: { where: { status: "ACTIVE", voidedAt: null } } },
      }),
      prisma.package.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          sportType: true,
          name: true,
          description: true,
          sessionsCount: true,
          trackingType: true,
          pricingType: true,
          currentPriceJod: true,
          isActive: true,
          sortOrder: true,
        },
      }),
      prisma.packageSessionCanceled.findMany({
        orderBy: [{ packageName: "asc" }, { sessionDate: "desc" }],
        select: {
          id: true,
          packageName: true,
          sessionDate: true,
          reason: true,
          reasonDetail: true,
          createdAt: true,
        },
      }),
    ]);

    let maxUpdated = since;
    let synced = 0;

    await Promise.all([
      syncPackagesToFirestore({ firestore, packages }),
      syncCanceledSessionsToFirestore({ firestore, sessions: canceledSessions }),
    ]);

    for (const row of rows) {
      if (row.updatedAt > maxUpdated) maxUpdated = row.updatedAt;
      try {
        const collected = (row.receipts || []).reduce(
          (sum, receipt) => sum + Number(receipt.amountPaid || 0),
          0,
        );

        await syncRegistrationRecordToFirestore({
          firestore,
          registration: {
            id: row.id,
            packageName: row.packageName,
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            customerEmail: row.customerEmail,
            customerAge: row.customerAge,
            playerCode: null,
            currentCycle: 1,
            sessionsLeft: row.sessionsLeft,
            nextPaymentDate: row.nextPaymentDate,
            planLabel: row.planLabel,
            isPaid: row.isPaid,
            basePriceJod: row.basePriceJod,
            discountType: row.discountType,
            discountValue: row.discountValue,
            discountReason: row.discountReason,
            finalPriceJod: row.finalPriceJod,
            periodStartsAt: row.periodStartsAt,
            periodEndsAt: row.periodEndsAt,
            isFrozen: row.isFrozen,
            frozenAt: row.frozenAt,
            sessionsBonus: row.sessionsBonus,
            collected,
            status: row.status,
            source: appImportedRegistrationIds.has(row.id) ? "APP" : "PORTAL_DB",
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deleted: false,
          },
        });
        synced += 1;
      } catch (error) {
        console.warn("[cron/sync-db-registrations] sync failed", row.id, error);
      }
    }

    await cursorRef.set(
      {
        lastSyncedUpdatedAt: admin.firestore.Timestamp.fromDate(maxUpdated),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true,
      examined: rows.length,
      synced,
      packagesSynced: packages.length,
      canceledSessionsSynced: canceledSessions.length,
      cursorAfter: maxUpdated.toISOString(),
    };
  })();

  try {
    return await registrationSyncRun;
  } finally {
    registrationSyncRun = null;
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

  return NextResponse.json(await runRegistrationDbSync());
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
