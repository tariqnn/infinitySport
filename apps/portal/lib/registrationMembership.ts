import type { PrismaClient } from "@prisma/client";
import { loadPointsByRegistrationId } from "./registrationPoints";
import { loadBookingRewardPointsByEmail } from "./bookingRewardPoints";
import { loadGuestManualPointsByEmail } from "./guestPointAccounts";
import { loadCurrentCycleReceiptTotals } from "./registrationLifecycle";

type ReceiptLike = {
  amountPaid?: number | null;
};

type RegistrationLike = {
  id: string;
  packageName: string;
  customerName: string;
  customerAge?: number | null;
  customerEmail?: string | null;
  isPaid?: boolean | null;
  finalPriceJod?: number | null;
  durationMonths?: number | null;
  sessionsLeft?: number | null;
  nextPaymentDate?: string | Date | null;
  planLabel?: string | null;
  sessionsBonus?: number | null;
  status?: string | null;
  isFrozen?: boolean | null;
  periodStartsAt?: string | Date | null;
  periodEndsAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  receipts?: ReceiptLike[];
};

type PrismaMembershipSource = Pick<
  PrismaClient,
  "package" | "classSession" | "$queryRawUnsafe" | "$executeRawUnsafe"
>;

type PackageMeta = {
  durationMonths: number;
  sessionsCount: number;
  trackingType: string;
};

export type RegistrationMembershipSummary = {
  id: string;
  studentName: string;
  packageName: string;
  customerAge: number | null;
  pointsBalance: number;
  isPaid: boolean;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  finalPriceJod: number;
  collectedJod: number;
  remainingJod: number;
  status: string;
  daysLeft: number;
  nextPaymentDate: string | null;
  planLabel: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  sessionsBonus: number;
  sessionsRemaining: number | null;
  createdAt: string;
  updatedAt: string;
};

function buildMembershipChildKey(name: string, age?: number | null): string {
  return `${String(name || "").trim().toLowerCase()}|${age ?? ""}`;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toIsoDateString(value: string | Date | null | undefined): string | null {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

function addCalendarMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Math.max(1, Math.round(months || 1)));
  return next;
}

function computePaymentStatus(
  finalPriceJod: number,
  collectedJod: number,
  isPaidFlag: boolean,
): "UNPAID" | "PARTIAL" | "PAID" {
  if (finalPriceJod <= 0) return isPaidFlag || collectedJod > 0 ? "PAID" : "UNPAID";
  if (isPaidFlag || collectedJod >= finalPriceJod) return "PAID";
  if (collectedJod > 0) return "PARTIAL";
  return "UNPAID";
}

function computeDaysLeft(params: {
  periodEndsAt: string | Date | null | undefined;
  periodStartsAt: string | Date | null | undefined;
  createdAt: string | Date;
  durationMonths: number;
}): number {
  const endsAt = params.periodEndsAt
    ? new Date(params.periodEndsAt)
    : addCalendarMonths(
        params.periodStartsAt ? new Date(params.periodStartsAt) : new Date(params.createdAt),
        params.durationMonths,
      );
  if (!endsAt || Number.isNaN(endsAt.getTime())) return 0;
  return Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
}

function computeDisplayStatus(
  row: RegistrationLike,
  daysLeft: number,
): string {
  const raw = String(row.status || "ACTIVE").toUpperCase();
  if (raw !== "ACTIVE") return raw;
  if (row.isFrozen) return "FROZEN";
  if (daysLeft <= 0) return "EXPIRED";
  if (daysLeft <= 7) return "EXPIRING_SOON";
  return "ACTIVE";
}

export async function buildRegistrationMembershipSummaries(
  prisma: PrismaMembershipSource,
  rows: RegistrationLike[],
): Promise<RegistrationMembershipSummary[]> {
  if (rows.length === 0) return [];

  const packageNames = Array.from(
    new Set(rows.map((row) => String(row.packageName || "").trim()).filter(Boolean)),
  );
  const registrationIds = rows.map((row) => row.id);

  const [packages, classSessionCounts, pointsByRegistrationId, currentCycleCollectedByRegistrationId, bookingRewardPointsByEmail, guestManualPointsByEmail] = await Promise.all([
    prisma.package
      .findMany({
        where: { name: { in: packageNames } },
        select: { name: true, durationMonths: true, sessionsCount: true, trackingType: true },
      })
      .catch(
        () =>
          [] as Array<{
            name: string;
            durationMonths: number;
            sessionsCount: number;
            trackingType: string;
          }>,
      ),
    prisma.classSession
      .groupBy({
        by: ["packageName"],
        where: {
          packageName: { in: packageNames },
          status: "HELD",
        },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ packageName: string; _count: { _all: number } }>,
      ),
    loadPointsByRegistrationId(prisma, registrationIds).catch(
      () => new Map<string, number>(),
    ),
    loadCurrentCycleReceiptTotals(prisma, registrationIds).catch(
      () => new Map<string, number>(),
    ),
    loadBookingRewardPointsByEmail(
      prisma,
      rows.map((row) => normalizeEmail(row.customerEmail)),
    ).catch(() => new Map<string, number>()),
    loadGuestManualPointsByEmail(
      prisma,
      rows.map((row) => normalizeEmail(row.customerEmail)),
    ).catch(() => new Map<string, number>()),
  ]);

  const packageMeta = new Map<string, PackageMeta>(
    packages.map((pkg) => [
      pkg.name,
      {
        durationMonths: Math.max(1, toNumber(pkg.durationMonths, 1)),
        sessionsCount: toNumber(pkg.sessionsCount, 0),
        trackingType: String(pkg.trackingType || "").toUpperCase(),
      },
    ]),
  );
  const consumedByPackage = new Map<string, number>(
    classSessionCounts.map((row) => [
      row.packageName,
      toNumber(row._count?._all, 0),
    ]),
  );
  const childPoints = new Map<string, number>();
  for (const row of rows) {
    const childKey = buildMembershipChildKey(row.customerName, row.customerAge ?? null);
    childPoints.set(
      childKey,
      Math.max(
        0,
        (childPoints.get(childKey) ?? 0) + (pointsByRegistrationId.get(row.id) ?? 0),
      ),
    );
  }

  return rows.map((row) => {
    const finalPriceJod = Math.max(0, Math.round(toNumber(row.finalPriceJod, 0)));
    const collectedJod = Math.max(
      0,
      Math.round(currentCycleCollectedByRegistrationId.get(row.id) ?? 0),
    );
    const paymentStatus = computePaymentStatus(
      finalPriceJod,
      collectedJod,
      Boolean(row.isPaid),
    );
    const remainingJod = Math.max(0, finalPriceJod - collectedJod);
    const meta = packageMeta.get(String(row.packageName || "").trim());
    const durationMonths = Math.max(
      1,
      Math.round(toNumber(row.durationMonths, meta?.durationMonths ?? 1)),
    );
    const daysLeft = computeDaysLeft({
      periodEndsAt: row.periodEndsAt,
      periodStartsAt: row.periodStartsAt,
      createdAt: row.createdAt,
      durationMonths,
    });
    const displayStatus = computeDisplayStatus(row, daysLeft);
    const trackingType = meta?.trackingType || "";
    const isSessionTracked =
      row.sessionsLeft != null ||
      trackingType === "SESSIONS" ||
      trackingType === "BOTH";
    const baseSessions =
      row.sessionsLeft != null
        ? Math.max(0, Math.round(toNumber(row.sessionsLeft, 0)))
        : meta && meta.sessionsCount > 0
          ? Math.max(0, Math.round(toNumber(meta.sessionsCount, 0)))
          : null;
    const sessionsBonus = Math.max(0, Math.round(toNumber(row.sessionsBonus, 0)));
    const consumed = consumedByPackage.get(String(row.packageName || "").trim()) || 0;
    const sessionsRemaining =
      isSessionTracked && baseSessions != null
        ? Math.max(0, baseSessions + sessionsBonus - consumed)
        : null;
    const pointsBalance = Math.max(
      0,
      (childPoints.get(buildMembershipChildKey(row.customerName, row.customerAge ?? null)) ?? 0) +
        (bookingRewardPointsByEmail.get(normalizeEmail(row.customerEmail)) ?? 0) +
        (guestManualPointsByEmail.get(normalizeEmail(row.customerEmail)) ?? 0),
    );

    return {
      id: row.id,
      studentName: String(row.customerName || "").trim(),
      packageName: String(row.packageName || "").trim(),
      customerAge:
        row.customerAge == null ? null : Math.max(0, Math.round(toNumber(row.customerAge, 0))),
      pointsBalance,
      isPaid: paymentStatus === "PAID",
      paymentStatus,
      finalPriceJod,
      collectedJod,
      remainingJod,
      status: displayStatus,
      daysLeft,
      nextPaymentDate: toIsoDateString(row.nextPaymentDate),
      planLabel: String(row.planLabel || "").trim() || null,
      periodStartsAt: toIsoString(row.periodStartsAt),
      periodEndsAt: toIsoString(row.periodEndsAt),
      sessionsBonus,
      sessionsRemaining,
      createdAt: toIsoString(row.createdAt) || new Date(0).toISOString(),
      updatedAt: toIsoString(row.updatedAt) || new Date(0).toISOString(),
    };
  });
}
