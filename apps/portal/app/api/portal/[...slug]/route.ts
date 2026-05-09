import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getFirebaseAuth, getFirestore } from "../../../../lib/firebase-admin";
import { loadTrackerReceiptSyncInputsForContact } from "../../../../lib/registrationReceiptSync";
import {
  buildRegistrationMembershipSummaries,
  type RegistrationMembershipSummary,
} from "../../../../lib/registrationMembership";
import {
  buildTrackerChildKey,
  syncGuestAccessSnapshot,
  syncTrackerPlayerProfile,
  syncTrackerUserReceipts,
  syncTrackerUserAndPlayers,
  type TrackerPlayerSyncInput,
} from "../../../../lib/trackerAccountSync";
import {
  bookingCourtNameFromId,
  listMobileBookingInboxEntries,
  markBookingDeletedInFirestore,
  syncBookingCourtsToFirestore,
  syncBookingRecordToFirestore,
  syncBookingRecordsToFirestore,
  updateMobileBookingInboxEntry,
} from "../../../../lib/bookingRealtimeSync";
import { syncTrackerShopCatalog } from "../../../../lib/shopCatalogSync";
import {
  addRegistrationPointAdjustment,
  listRegistrationPointAdjustments,
} from "../../../../lib/registrationPoints";
import {
  markRegistrationDeletedInFirestore,
  syncPackagesToFirestore,
  syncRegistrationRecordToFirestore,
} from "../../../../lib/registrationRealtimeSync";
import {
  markCompetitionDeletedInFirestore,
  syncCompetitionRecordToFirestore,
} from "../../../../lib/competitionRealtimeSync";
import {
  addBookingRewardPointAdjustment,
  calculateBookingRewardPoints,
} from "../../../../lib/bookingRewardPoints";
import {
  addGuestPointAdjustment,
  listDeletedGuestAccountEmails,
  listGuestPointAdjustments,
  loadGuestTotalPointsByEmail,
  markGuestAccountDeleted,
  restoreGuestAccount,
} from "../../../../lib/guestPointAccounts";
import {
  addRegistrationRenewalHistory,
  ensureRegistrationProfile,
  loadCurrentCycleReceiptTotals,
  listRegistrationRenewalHistory,
  loadCurrentCycleReceiptIds,
  loadRegistrationProfiles,
  searchRegistrationIds,
  stampReceiptCycle,
  stampSessionAdjustmentCycle,
  updateRegistrationCurrentCycle,
} from "../../../../lib/registrationLifecycle";
import crypto from "crypto";

const ACTIVE_RECEIPT_WHERE = {
  status: "ACTIVE" as const,
  voidedAt: null,
};

type Params = { slug: string[] };

type RegistrationInput = {
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
  durationMonths?: number | null;
  sessionsLeft?: number | null;
  sessionsUsedOverride?: number | null;
  nextPaymentDate?: string | null;
  planLabel?: string | null;
  basePriceJod?: number;
  discountType?: string;
  discountValue?: number | null;
  discountReason?: string | null;
  periodStartsAt?: string | null;
  createdBy?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

async function resolveRouteParams(params: Promise<Params>): Promise<Params> {
  return await params;
}

function clampNonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function coerceOptionalInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

function extractConnectId(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  if (typeof record[key] === "string" && record[key]) {
    return record[key] as string;
  }

  const nested = record[key] as { connect?: { id?: string } } | undefined;
  if (nested?.connect?.id) return nested.connect.id;

  return null;
}

function computeFinalPriceJod(
  basePriceJod: number,
  discountType: string,
  discountValue: number | null | undefined,
) {
  const base = clampNonNegative(basePriceJod);
  if (!discountType || discountType === "NONE" || discountValue == null)
    return base;
  if (discountType === "PERCENT")
    return Math.max(0, base - Math.round((base * Number(discountValue)) / 100));
  if (discountType === "AMOUNT")
    return Math.max(0, base - Number(discountValue));
  return base;
}

function billingPeriodFromDate(date: Date): {
  billingPeriodKey: string;
  priceLockedUntil: Date;
} {
  const y = date.getFullYear();
  const m = date.getMonth();
  const billingPeriodKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const priceLockedUntil = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { billingPeriodKey, priceLockedUntil };
}

function hasUnknownArgument(error: unknown, argName: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Unknown argument \`${argName}\``);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected server error";
  }
}

function withoutPeriodStartsAt<T extends { periodStartsAt?: unknown }>(
  data: T,
): Omit<T, "periodStartsAt"> {
  const next = { ...data } as T;
  delete next.periodStartsAt;
  return next;
}

function withoutSessionsUsedOverride<
  T extends { sessionsUsedOverride?: unknown },
>(data: T): Omit<T, "sessionsUsedOverride"> {
  const next = { ...data } as T;
  delete next.sessionsUsedOverride;
  return next;
}

const PASSWORD_SCHEME = "scrypt-v1";
const MEMBER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type MemberTokenPayload = {
  uid: string;
  email: string;
  exp: number;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

/** True when the string looks like a normal email (used for Prisma / points, not for Firestore doc ids). */
function isValidGuestEmail(value: string): boolean {
  const s = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Firestore collection for guest snapshots (default: `guestAccess`).
 * Override with env: FIRESTORE_GUEST_ACCESS_COLLECTIONS=guestAccess,otherCollection
 */
function guestAccessCollectionIds(): string[] {
  const env = process.env.FIRESTORE_GUEST_ACCESS_COLLECTIONS?.trim();
  if (env) {
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["guestAccess"];
}

/** Primary email stored on guest documents (field name variants from app / console). */
function guestDocPrimaryEmail(guestDoc: Record<string, unknown>): string {
  const candidates: unknown[] = [
    guestDoc.email,
    guestDoc.Email,
    guestDoc.userEmail,
    guestDoc.contactEmail,
    guestDoc.customerEmail,
  ];
  for (const raw of candidates) {
    const n = normalizeEmail(raw);
    if (n && isValidGuestEmail(n)) return n;
  }
  return "";
}

function guestDocDisplayName(guestDoc: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    guestDoc.name,
    guestDoc.Name,
    guestDoc.displayName,
    guestDoc.fullName,
    guestDoc.customerName,
  ];
  for (const raw of candidates) {
    const t = normalizeText(raw);
    if (t) return t;
  }
  return null;
}

/** Contact email from guestAccess document data, or from doc id when the id itself is an email. */
function resolveGuestContactEmail(
  docId: string,
  guestDoc: Record<string, unknown>,
): string {
  const fromField = guestDocPrimaryEmail(guestDoc);
  if (fromField) return fromField;
  const fromId = normalizeEmail(docId);
  if (fromId && isValidGuestEmail(fromId)) return fromId;
  return "";
}

function parseGuestAccessDeleteTarget(raw: string): {
  collectionId: string;
  docId: string;
} {
  const decoded = decodeURIComponent(raw || "").trim();
  const idx = decoded.indexOf("::");
  if (idx > 0) {
    const collectionId = decoded.slice(0, idx).trim();
    const docId = decoded.slice(idx + 2).trim();
    if (collectionId && docId) return { collectionId, docId };
  }
  return { collectionId: "guestAccess", docId: decoded };
}

function normalizePhoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function phoneLooksSame(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.endsWith(right) || right.endsWith(left);
}

function sanitizeMemberUser(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
}

function validateNewPassword(password: string): string | null {
  const p = password.trim();
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_SCHEME}$${salt}$${derived}`;
}

function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  const [scheme, salt, expectedHex] = storedHash.split("$");
  if (scheme !== PASSWORD_SCHEME || !salt || !expectedHex) return false;
  try {
    const derived = crypto
      .scryptSync(password, salt, expectedHex.length / 2)
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(derived, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    return false;
  }
}

function getMemberAuthSecret(): string {
  return (
    process.env.MEMBER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "infinity-member-dev-secret-change-me"
  );
}

function signMemberToken(payload: MemberTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getMemberAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyMemberToken(token: string): MemberTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getMemberAuthSecret())
    .update(encoded)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as MemberTokenPayload;
    if (!parsed?.uid || !parsed?.email || !parsed?.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function createPackageRegistrationCompat(
  delegate: { create: (args: any) => Promise<any> },
  args: { data: Record<string, unknown>; include?: Record<string, unknown> },
) {
  try {
    return await delegate.create(args as any);
  } catch (error) {
    if (
      hasUnknownArgument(error, "sessionsUsedOverride") &&
      "sessionsUsedOverride" in args.data
    ) {
      return delegate.create({
        ...args,
        data: withoutSessionsUsedOverride(args.data),
      } as any);
    }
    if (
      hasUnknownArgument(error, "periodStartsAt") &&
      "periodStartsAt" in args.data
    ) {
      return delegate.create({
        ...args,
        data: withoutPeriodStartsAt(args.data),
      } as any);
    }
    throw error;
  }
}

async function updatePackageRegistrationCompat(args: {
  where: { id: string };
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}) {
  try {
    return await prisma.packageRegistration.update(args as any);
  } catch (error) {
    if (
      hasUnknownArgument(error, "sessionsUsedOverride") &&
      "sessionsUsedOverride" in args.data
    ) {
      return prisma.packageRegistration.update({
        ...args,
        data: withoutSessionsUsedOverride(args.data),
      } as any);
    }
    if (
      hasUnknownArgument(error, "periodStartsAt") &&
      "periodStartsAt" in args.data
    ) {
      return prisma.packageRegistration.update({
        ...args,
        data: withoutPeriodStartsAt(args.data),
      } as any);
    }
    throw error;
  }
}

type PackageConfig = {
  id: string;
  sportType: string;
  name: string;
  description: string | null;
  durationMonths: number;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  isActive: boolean;
  showOnWebsite: boolean;
  sortOrder: number;
};

type PackageDefaults = {
  basePriceJod: number;
  defaultSessionsLeft: number | null;
  durationMonths: number;
  packageConfig: PackageConfig | null;
};

function normalizeDurationMonths(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(1, fallback);
  return Math.max(1, Math.round(parsed));
}

async function getPackageConfigByName(
  packageName: string,
): Promise<PackageConfig | null> {
  const pkg = await prisma.package
    .findUnique({
      where: { name: packageName },
      select: {
        id: true,
        sportType: true,
        name: true,
        description: true,
        durationMonths: true,
        sessionsCount: true,
        trackingType: true,
        pricingType: true,
        currentPriceJod: true,
        isActive: true,
        showOnWebsite: true,
        sortOrder: true,
      },
    })
    .catch(() => null);
  if (!pkg) return null;
  return {
    ...pkg,
    durationMonths: normalizeDurationMonths(pkg.durationMonths, 1),
    sessionsCount: Math.max(0, Math.round(Number(pkg.sessionsCount || 0))),
  };
}

async function getPackageDefaults(
  packageName: string,
): Promise<PackageDefaults> {
  const pkg = await getPackageConfigByName(packageName);
  const pricing = await prisma.packagePricing
    .findUnique({ where: { packageName } })
    .catch(() => null);
  if (pkg) {
    return {
      basePriceJod:
        pkg.currentPriceJod != null
          ? clampNonNegative(pkg.currentPriceJod)
          : clampNonNegative(pricing?.basePriceJod ?? 0),
      defaultSessionsLeft: pkg.sessionsCount > 0 ? pkg.sessionsCount : null,
      durationMonths: pkg.durationMonths,
      packageConfig: pkg,
    };
  }
  return {
    basePriceJod: clampNonNegative(pricing?.basePriceJod ?? 0),
    defaultSessionsLeft: null,
    durationMonths: 1,
    packageConfig: null,
  };
}

function addCalendarMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + normalizeDurationMonths(months, 1));
  return next;
}

function computeCyclePeriodEnd(
  cycleAnchor: Date,
  durationMonths: number,
): Date {
  return addCalendarMonths(cycleAnchor, durationMonths);
}

function getCycleAnchorDate(params: {
  periodStartsAt?: string | Date | null;
  createdAt?: string | Date | null;
  fallback?: Date;
}): Date {
  const periodStart = params.periodStartsAt
    ? new Date(params.periodStartsAt)
    : null;
  if (periodStart && !Number.isNaN(periodStart.getTime())) {
    return periodStart;
  }
  const createdAt = params.createdAt ? new Date(params.createdAt) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return createdAt;
  }
  return params.fallback ? new Date(params.fallback) : new Date();
}

async function syncActivePackagesToFirestore() {
  try {
    const firestore = getFirestore();
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        sportType: true,
        name: true,
        description: true,
        durationMonths: true,
        sessionsCount: true,
        trackingType: true,
        pricingType: true,
        currentPriceJod: true,
        isActive: true,
        showOnWebsite: true,
        sortOrder: true,
      },
    });

    await syncPackagesToFirestore({
      firestore,
      packages,
    });
  } catch (error) {
    console.warn("[portal-db-api] package config sync skipped", error);
  }
}

function parseOptionalMembershipDate(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function mapRegistrationRow(row: any) {
  const finalPriceJod = Number(row.finalPriceJod) || 0;
  const collected =
    row.collected != null
      ? Number(row.collected || 0)
      : (row.receipts || []).reduce(
          (sum: number, rec: any) => sum + (rec.amountPaid || 0),
          0,
        );
  const isPaid = isRegistrationPaid(
    finalPriceJod,
    collected,
    Boolean(row.isPaid),
  );
  return {
    id: row.id,
    packageName: row.packageName,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail ?? null,
    customerAge: row.customerAge ?? null,
    status: String(row.status || "ACTIVE").trim().toUpperCase() || "ACTIVE",
    playerCode: row.playerCode ?? null,
    currentCycle: row.currentCycle ?? 1,
    sessionsLeft: row.sessionsLeft ?? null,
    sessionsUsedOverride: row.sessionsUsedOverride ?? null,
    nextPaymentDate: row.nextPaymentDate ?? null,
    planLabel: row.planLabel ?? null,
    pointsBalance: Math.max(0, Number(row.pointsBalance ?? 0) || 0),
    isPaid,
    basePriceJod: Number(row.basePriceJod) || 0,
    discountType: row.discountType ?? "NONE",
    discountValue: row.discountValue ?? null,
    discountReason: row.discountReason ?? null,
    finalPriceJod,
    durationMonths: normalizeDurationMonths(row.durationMonths, 1),
    collected,
    periodStartsAt: row.periodStartsAt ?? null,
    periodEndsAt: row.periodEndsAt ?? null,
    isFrozen: row.isFrozen ?? false,
    frozenAt: row.frozenAt ?? null,
    sessionsBonus: row.sessionsBonus ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isRegistrationPaid(
  finalPriceJod: number,
  collectedJod: number,
  isPaidFlag: boolean,
) {
  const finalPrice = Math.max(0, Math.round(Number(finalPriceJod) || 0));
  const collected = Math.max(0, Math.round(Number(collectedJod) || 0));
  if (finalPrice <= 0) return isPaidFlag || collected > 0;
  return isPaidFlag || collected >= finalPrice;
}

function getRegistrationPaymentStatus(
  finalPriceJod: number,
  collectedJod: number,
  isPaidFlag: boolean,
): "PAID" | "PARTIAL" | "UNPAID" {
  if (isRegistrationPaid(finalPriceJod, collectedJod, isPaidFlag))
    return "PAID";
  return collectedJod > 0 ? "PARTIAL" : "UNPAID";
}

function paymentPeriodKeyFromDate(
  value: Date | string | null | undefined,
): string {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizePaymentPeriodKey(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : null;
}

async function cancelMatchingRegistrationInboxEntries(params: {
  registrationId: string;
  packageName: string;
  customerPhone: string;
}) {
  const packageName = normalizeText(params.packageName);
  const customerPhone = normalizeText(params.customerPhone);
  if (!packageName || !customerPhone) return;

  try {
    const firestore = getFirestore();
    let docs: QueryDocumentSnapshot[] = [];
    try {
      const snapshot = await firestore
        .collection("portalRegistrationInbox")
        .where("packageName", "==", packageName)
        .where("customerPhone", "==", customerPhone)
        .limit(50)
        .get();
      docs = snapshot.docs;
    } catch {
      const snapshot = await firestore
        .collection("portalRegistrationInbox")
        .limit(200)
        .get();
      docs = snapshot.docs.filter((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return (
          normalizeText(data.packageName) === packageName &&
          normalizeText(data.customerPhone) === customerPhone
        );
      });
    }

    if (!docs.length) return;
    const batch = firestore.batch();
    for (const doc of docs) {
      batch.set(
        doc.ref,
        {
          status: "CANCELLED",
          dbImported: true,
          dbDeleted: true,
          dbRegistrationId: params.registrationId,
          syncError: null,
          deletedAtIso: new Date().toISOString(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  } catch (error) {
    console.warn(
      "[portal-db-api] registration inbox delete guard skipped",
      error,
    );
  }
}

async function enrichRegistrationRowsWithProfile(rows: any[]) {
  if (rows.length === 0) return [];

  const existingProfiles = await loadRegistrationProfiles(
    prisma,
    rows.map((row) => row.id),
  );

  for (const row of rows) {
    if (existingProfiles.has(row.id)) continue;
    await ensureRegistrationProfile(prisma, {
      registrationId: row.id,
      customerName: row.customerName,
      customerAge: row.customerAge ?? null,
      customerPhone: row.customerPhone ?? null,
      customerEmail: row.customerEmail ?? null,
    });
  }

  const profiles = await loadRegistrationProfiles(
    prisma,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const profile = profiles.get(row.id);
    return {
      ...row,
      playerCode: profile?.playerCode ?? null,
      currentCycle: profile?.currentCycle ?? 1,
    };
  });
}

async function serializeRegistrationRows(rows: any[]) {
  const profiledRows = await enrichRegistrationRowsWithProfile(rows);
  const summaries = await buildRegistrationMembershipSummaries(
    prisma,
    profiledRows,
  );
  const summaryById = new Map(
    summaries.map((summary) => [summary.id, summary]),
  );

  return profiledRows.map((row) => {
    const summary = summaryById.get(row.id);
    return mapRegistrationRow({
      ...row,
      pointsBalance: summary?.pointsBalance ?? 0,
      collected: summary?.collectedJod ?? 0,
      isPaid: summary?.isPaid ?? row.isPaid,
    });
  });
}

async function syncRegistrationRealtimeById(
  registrationId: string,
  source: "ADMIN" | "WEBSITE" | "PORTAL_DB" = "ADMIN",
) {
  try {
    const firestore = getFirestore();
    const row = await prisma.packageRegistration.findUnique({
      where: { id: registrationId },
      include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    });

    if (!row) {
      await markRegistrationDeletedInFirestore({
        firestore,
        registrationId,
      });
      return;
    }

    const [serialized] = await serializeRegistrationRows([row]);
    if (!serialized) return;

    await syncRegistrationRecordToFirestore({
      firestore,
      registration: {
        id: serialized.id,
        packageName: serialized.packageName,
        customerName: serialized.customerName,
        customerPhone: serialized.customerPhone,
        customerEmail: serialized.customerEmail,
        customerAge: serialized.customerAge,
        playerCode: serialized.playerCode,
        currentCycle: serialized.currentCycle,
        sessionsLeft: serialized.sessionsLeft,
        sessionsUsedOverride: serialized.sessionsUsedOverride,
        nextPaymentDate: serialized.nextPaymentDate,
        planLabel: serialized.planLabel,
        isPaid: serialized.isPaid,
        basePriceJod: serialized.basePriceJod,
        discountType: serialized.discountType,
        discountValue: serialized.discountValue,
        discountReason: serialized.discountReason,
        finalPriceJod: serialized.finalPriceJod,
        durationMonths: serialized.durationMonths,
        periodStartsAt: serialized.periodStartsAt,
        periodEndsAt: serialized.periodEndsAt,
        isFrozen: serialized.isFrozen,
        frozenAt: serialized.frozenAt,
        sessionsBonus: serialized.sessionsBonus,
        collected: serialized.collected,
        status: row.status,
        source,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt,
        deleted: false,
      },
    });
  } catch (error) {
    console.warn("[portal-db-api] registration realtime sync skipped", error);
  }
}

function mapRegistrationSummaryToTrackerPlayer(
  row: RegistrationMembershipSummary,
): TrackerPlayerSyncInput {
  return {
    childKey: buildTrackerChildKey(row.studentName, row.customerAge ?? null),
    registrationId: row.id,
    name: row.studentName,
    age: row.customerAge ?? null,
    primaryPosition: null,
    sessionsLeft: row.sessionsRemaining,
    nextPaymentDate: row.nextPaymentDate ?? null,
    planLabel: row.planLabel ?? row.packageName ?? null,
    pointsBalance: row.pointsBalance,
    isPaid: row.isPaid,
    paymentStatus: row.paymentStatus,
    finalPriceJod: row.finalPriceJod,
    collectedJod: row.collectedJod,
    remainingJod: row.remainingJod,
    registrationStatus: row.status,
  };
}

async function syncStandaloneTrackerPlayers(
  summaries: RegistrationMembershipSummary[],
) {
  if (summaries.length === 0) return [];

  const firestore = getFirestore();
  const latestByChild = new Map<string, RegistrationMembershipSummary>();
  for (const row of summaries) {
    const childKey = buildTrackerChildKey(
      row.studentName,
      row.customerAge ?? null,
    );
    if (!latestByChild.has(childKey)) {
      latestByChild.set(childKey, row);
    }
  }

  const syncedPlayers = [];
  for (const row of latestByChild.values()) {
    const syncedPlayer = await syncTrackerPlayerProfile({
      firestore,
      player: mapRegistrationSummaryToTrackerPlayer(row),
    });
    syncedPlayers.push(syncedPlayer);
  }
  return syncedPlayers;
}

async function ensureTrackerPlayerForRegistration(
  registrationId: string,
): Promise<string | null> {
  const registration = await prisma.packageRegistration.findUnique({
    where: { id: registrationId },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });
  if (!registration) return null;

  const summaries = await buildRegistrationMembershipSummaries(prisma, [
    registration,
  ]);
  const summary = summaries.find((row) => row.id === registrationId);
  if (!summary) return null;

  const [syncedPlayer] = await syncStandaloneTrackerPlayers([summary]);
  return syncedPlayer?.id ?? null;
}

async function syncTrackerForRegistrationContact(input: {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}) {
  const customerEmail = normalizeEmail(input.customerEmail);
  const customerPhone = normalizeText(input.customerPhone);

  if (!customerEmail && !customerPhone) return;

  try {
    const firestore = getFirestore();

    const relatedRegistrations = await prisma.packageRegistration.findMany({
      where: {
        OR: [
          ...(customerEmail ? [{ customerEmail }] : []),
          ...(customerPhone ? [{ customerPhone }] : []),
        ],
      },
      include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const summaries = await buildRegistrationMembershipSummaries(
      prisma,
      relatedRegistrations,
    );

    const latestByChild = new Map<string, RegistrationMembershipSummary>();
    for (const row of summaries) {
      const childKey = buildTrackerChildKey(
        row.studentName,
        row.customerAge ?? null,
      );
      if (!latestByChild.has(childKey)) {
        latestByChild.set(childKey, row);
      }
    }

    const players = Array.from(latestByChild.values()).map(
      mapRegistrationSummaryToTrackerPlayer,
    );
    if (players.length === 0) return;

    await syncStandaloneTrackerPlayers(summaries);

    if (!customerEmail) return;

    const auth = getFirebaseAuth();
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(customerEmail);
    } catch (error: unknown) {
      const fbError = error as { code?: string };
      if (fbError.code === "auth/user-not-found") return;
      throw error;
    }

    const userRef = firestore.collection("users").doc(userRecord.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists
      ? ((userSnap.data() as Record<string, unknown>) ?? {})
      : {};
    const existingRole = normalizeText(userData.role).toLowerCase();
    if (existingRole && existingRole !== "parent") return;

    await syncTrackerUserAndPlayers({
      firestore,
      uid: userRecord.uid,
      email: customerEmail,
      name:
        normalizeText(userData.name) ||
        normalizeText(userRecord.displayName) ||
        normalizeText(input.customerName),
      role: "parent",
      players,
    });

    const receipts = await loadTrackerReceiptSyncInputsForContact({
      customerEmail,
      customerPhone,
    });

    await syncTrackerUserReceipts({
      firestore,
      uid: userRecord.uid,
      receipts,
    });
  } catch (error) {
    console.warn("[portal-db-api] tracker membership sync skipped", error);
  }
}

async function syncGuestAccessForEmail(input: {
  customerEmail?: string | null;
  customerName?: string | null;
}) {
  const customerEmail = normalizeEmail(input.customerEmail);
  if (!customerEmail) return;

  try {
    await restoreGuestAccount(prisma, customerEmail);
    const firestore = getFirestore();
    const totals = (
      await loadGuestTotalPointsByEmail(prisma, [customerEmail])
    ).get(customerEmail) ?? {
      rewardPoints: 0,
      manualPoints: 0,
      totalPoints: 0,
    };

    let uid: string | null = null;
    let accountName: string | null = normalizeText(input.customerName) || null;
    let photoUrl: string | null = null;

    try {
      const auth = getFirebaseAuth();
      const userRecord = await auth.getUserByEmail(customerEmail);
      uid = userRecord.uid;
      accountName = normalizeText(userRecord.displayName) || accountName;

      const userSnap = await firestore
        .collection("users")
        .doc(userRecord.uid)
        .get();
      const userData = userSnap.exists
        ? ((userSnap.data() as Record<string, unknown>) ?? {})
        : {};
      accountName = normalizeText(userData.name) || accountName;
      photoUrl = normalizeText(userData.photoUrl) || null;
    } catch (error: unknown) {
      const fbError = error as { code?: string };
      if (fbError.code !== "auth/user-not-found") {
        throw error;
      }
    }

    await syncGuestAccessSnapshot({
      firestore,
      uid,
      email: customerEmail,
      name: accountName,
      photoUrl,
      pointsBalance: totals.totalPoints,
      bookingPointsBalance: totals.rewardPoints,
      manualPointsBalance: totals.manualPoints,
      source: "portal",
    });
  } catch (error) {
    console.warn("[portal-db-api] guest access sync skipped", error);
  }
}

type BookingPaymentMethod = "CASH" | "CARD" | "ONLINE" | "TRANSFER" | "OTHER";
type BookingPaymentStatus = "PAID" | "REFUNDED";

type BookingPaymentRow = {
  id: string;
  bookingId: string;
  customerId: string | null;
  amount: number;
  method: BookingPaymentMethod;
  status: BookingPaymentStatus;
  transactionRef: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BookingFinancialSummary = {
  totalHours: number;
  totalAmount: number;
  paidAmount: number;
  refundAmount: number;
  netPaid: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
  latestPaymentMethod: BookingPaymentMethod | null;
};

type BookingOverviewItem = {
  id: string;
  companyId: string;
  startTime: string;
  endTime: string;
  facilityArea: string | null;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  source: "WEBSITE" | "APP" | "ADMIN";
  member: { id: string; firstName: string; lastName: string } | null;
  class: { id: string; name: string } | null;
  coach: { id: string; firstName: string; lastName: string } | null;
  financials: BookingFinancialSummary;
};

const DEFAULT_BOOKING_COURTS = [
  "Basketball AC",
  "Basketball 3x3",
  "Padel",
  "Volleyball",
];

const HOURLY_RATE_BY_COURT: Record<string, number> = {
  "Basketball AC": 40,
  "Basketball 3x3": 30,
  Padel: 35,
  Volleyball: 35,
};

type CourtRateMap = Record<string, number>;
type CourtRewardPointMap = Record<string, number>;

const REWARD_POINTS_BY_COURT: Record<string, number> = {
  "Basketball AC": 10,
  "Basketball 3x3": 10,
  Padel: 10,
  Volleyball: 10,
};

const BOOKING_SOURCE_PATTERN = /\[SOURCE:(WEBSITE|APP|ADMIN)\]/i;

const bookingInfraState = globalThis as unknown as {
  __portalBookingInfraReady?: boolean;
  __portalBookingInfraVersion?: number;
  __portalMobileBookingImportAt?: number;
  __portalBookingRealtimeFullSyncAt?: number;
};
const BOOKING_INFRA_VERSION = 3;
const MOBILE_BOOKING_IMPORT_INTERVAL_MS = 8_000;
const BOOKING_REALTIME_FULL_SYNC_INTERVAL_MS = 5 * 60 * 1000;

const shopInfraState = globalThis as unknown as {
  __portalShopInfraReady?: boolean;
  __portalShopInfraVersion?: number;
};
const SHOP_INFRA_VERSION = 1;

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDayStart(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDayEnd(value: Date): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function dayOfWeekUpper(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

function hoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function getCourtRate(
  court: string | null | undefined,
  rates?: CourtRateMap,
): number {
  if (!court) return 30;
  if (rates && Number.isFinite(rates[court])) return Number(rates[court]);
  return HOURLY_RATE_BY_COURT[court] ?? 30;
}

async function listStoredCourtRates(): Promise<
  Array<{ courtType: string; hourlyRate: number; rewardPointsPerHour: number }>
> {
  await ensureBookingInfrastructure();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "courtType", "hourlyRate", "rewardPointsPerHour"
      FROM "CourtRate"
      ORDER BY "courtType" ASC
    `,
  )) as Array<{
    courtType: string;
    hourlyRate: number;
    rewardPointsPerHour: number;
  }>;
  return rows
    .map((row) => ({
      courtType: String(row.courtType || "").trim(),
      hourlyRate: Number(row.hourlyRate || 0),
      rewardPointsPerHour: Number(row.rewardPointsPerHour || 0),
    }))
    .filter(
      (row) =>
        !!row.courtType &&
        Number.isFinite(row.hourlyRate) &&
        row.hourlyRate > 0,
    );
}

async function getEffectiveCourtRates(): Promise<CourtRateMap> {
  const defaults: CourtRateMap = { ...HOURLY_RATE_BY_COURT };
  const stored = await listStoredCourtRates();
  for (const row of stored) {
    defaults[row.courtType] = row.hourlyRate;
  }
  return defaults;
}

function getCourtRewardPoints(
  court: string | null | undefined,
  rewards?: CourtRewardPointMap,
): number {
  if (!court) return 0;
  if (rewards && Number.isFinite(rewards[court]))
    return Math.max(0, Number(rewards[court]));
  return Math.max(0, REWARD_POINTS_BY_COURT[court] ?? 0);
}

async function getEffectiveCourtRewardPoints(): Promise<CourtRewardPointMap> {
  const defaults: CourtRewardPointMap = { ...REWARD_POINTS_BY_COURT };
  const stored = await listStoredCourtRates();
  for (const row of stored) {
    defaults[row.courtType] = Math.max(
      0,
      Math.round(
        Number(row.rewardPointsPerHour || defaults[row.courtType] || 0),
      ),
    );
  }
  return defaults;
}

function inferBookingSource(
  notes: string | null | undefined,
): "WEBSITE" | "APP" | "ADMIN" {
  const text = String(notes || "");
  const tagged = text.match(BOOKING_SOURCE_PATTERN)?.[1];
  if (tagged === "WEBSITE" || tagged === "APP" || tagged === "ADMIN")
    return tagged;
  const lowered = text.toLowerCase();
  if (lowered.includes("public booking")) return "WEBSITE";
  if (lowered.includes("mobile app")) return "APP";
  return "ADMIN";
}

function normalizePaymentMethod(value: unknown): BookingPaymentMethod {
  const candidate = String(value || "")
    .trim()
    .toUpperCase();
  if (candidate === "CASH") return "CASH";
  if (candidate === "CARD") return "CARD";
  if (candidate === "ONLINE") return "ONLINE";
  if (candidate === "TRANSFER") return "TRANSFER";
  return "OTHER";
}

function normalizePaymentStatus(value: unknown): BookingPaymentStatus {
  return String(value || "")
    .trim()
    .toUpperCase() === "REFUNDED"
    ? "REFUNDED"
    : "PAID";
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

function normalizeSource(value: unknown): "WEBSITE" | "APP" | "ADMIN" | null {
  const candidate = String(value || "")
    .trim()
    .toUpperCase();
  if (candidate === "WEBSITE") return "WEBSITE";
  if (candidate === "APP") return "APP";
  if (candidate === "ADMIN") return "ADMIN";
  return null;
}

function normalizeBookingStatusValue(
  value: unknown,
): "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" {
  const candidate = String(value || "")
    .trim()
    .toUpperCase();
  if (candidate === "CONFIRMED") return "CONFIRMED";
  if (candidate === "CANCELLED") return "CANCELLED";
  if (candidate === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function parseFirestoreDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
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

function buildRealtimeBookingSyncPayload(
  row: {
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
  },
  financials?: BookingFinancialSummary | null,
) {
  return {
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
    totalHours: financials?.totalHours ?? null,
    totalAmount: financials?.totalAmount ?? null,
    paidAmount: financials?.paidAmount ?? null,
    refundAmount: financials?.refundAmount ?? null,
    netPaid: financials?.netPaid ?? null,
    remainingAmount: financials?.remainingAmount ?? null,
    paymentStatus: financials?.paymentStatus ?? null,
    latestPaymentMethod: financials?.latestPaymentMethod ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deleted: false,
  };
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

async function syncBookingRealtimeCourts(
  courtRates?: CourtRateMap,
  rewardPoints?: CourtRewardPointMap,
) {
  try {
    const firestore = getFirestore();
    const rates = courtRates ?? (await getEffectiveCourtRates());
    const rewardMap = rewardPoints ?? (await getEffectiveCourtRewardPoints());
    const knownCourts = Array.from(
      new Set([...DEFAULT_BOOKING_COURTS, ...Object.keys(rates)]),
    ).sort((a, b) => a.localeCompare(b));
    await syncBookingCourtsToFirestore({
      firestore,
      courts: knownCourts.map((name) => ({
        name,
        hourlyRate: getCourtRate(name, rates),
        rewardPointsPerHour: getCourtRewardPoints(name, rewardMap),
      })),
    });
  } catch (error) {
    console.warn("[portal-db-api] booking court sync skipped", error);
  }
}

async function syncBookingRealtimeById(
  bookingId: string,
  courtRates?: CourtRateMap,
) {
  try {
    const firestore = getFirestore();
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
      await markBookingDeletedInFirestore({ firestore, bookingId });
      return;
    }

    const rates = courtRates ?? (await getEffectiveCourtRates());
    const payments = await listPaymentsForBookingIds([bookingId]);
    const financials = computeBookingFinancials(
      {
        startTime: booking.startTime,
        endTime: booking.endTime,
        facilityArea: booking.facilityArea,
      },
      payments,
      rates,
    );
    await syncBookingRecordToFirestore({
      firestore,
      booking: buildRealtimeBookingSyncPayload(booking, financials),
    });
  } catch (error) {
    console.warn("[portal-db-api] booking sync skipped", error);
  }
}

async function maybeSyncAllBookingsToRealtime(force = false) {
  const now = Date.now();
  if (
    !force &&
    bookingInfraState.__portalBookingRealtimeFullSyncAt &&
    now - bookingInfraState.__portalBookingRealtimeFullSyncAt <
      BOOKING_REALTIME_FULL_SYNC_INTERVAL_MS
  ) {
    return;
  }

  bookingInfraState.__portalBookingRealtimeFullSyncAt = now;

  try {
    const firestore = getFirestore();
    const courtRates = await getEffectiveCourtRates();
    const rewardPoints = await getEffectiveCourtRewardPoints();
    await syncBookingRealtimeCourts(courtRates, rewardPoints);

    const bookings = await prisma.booking.findMany({
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
      orderBy: { updatedAt: "desc" },
    });
    const payments = await listPaymentsForBookingIds(
      bookings.map((row) => row.id),
    );
    const paymentsByBooking = new Map<string, BookingPaymentRow[]>();
    for (const payment of payments) {
      const current = paymentsByBooking.get(payment.bookingId) || [];
      current.push(payment);
      paymentsByBooking.set(payment.bookingId, current);
    }

    await syncBookingRecordsToFirestore({
      firestore,
      bookings: bookings.map((row) => {
        const financials = computeBookingFinancials(
          {
            startTime: row.startTime,
            endTime: row.endTime,
            facilityArea: row.facilityArea,
          },
          paymentsByBooking.get(row.id) || [],
          courtRates,
        );
        return buildRealtimeBookingSyncPayload(row, financials);
      }),
    });
  } catch (error) {
    console.warn("[portal-db-api] booking full realtime sync skipped", error);
  }
}

async function importPendingMobileBookingsFromFirestore(force = false) {
  const now = Date.now();
  if (
    !force &&
    bookingInfraState.__portalMobileBookingImportAt &&
    now - bookingInfraState.__portalMobileBookingImportAt <
      MOBILE_BOOKING_IMPORT_INTERVAL_MS
  ) {
    return;
  }
  bookingInfraState.__portalMobileBookingImportAt = now;

  try {
    const firestore = getFirestore();
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
    if (!pendingEntries.length) return;

    const defaultCompanyId = await resolveActiveCompanyId();

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
      const status = normalizeBookingStatusValue(payload.status);
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
        continue;
      }

      const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      });
      if (existing) {
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
        await syncBookingRealtimeById(bookingId);
        continue;
      }

      const availability = await validateBookingAvailability({
        bookingId: null,
        startTime,
        endTime,
        facilityArea,
        adminOverride: false,
      });
      if (availability.conflict) {
        await updateMobileBookingInboxEntry({
          firestore,
          id: entry.id,
          data: {
            status: "CONFLICT",
            dbImported: false,
            syncError: availability.conflict,
            conflict: availability.conflictMeta ?? null,
          },
        });
        continue;
      }

      const row = await prisma.booking.create({
        data: {
          id: bookingId,
          companyId,
          facilityArea,
          startTime,
          endTime,
          status,
          isPaid: Boolean(payload.isPaid),
          customerName,
          customerPhone,
          customerEmail,
          notes: withSourceTag(notes || "Mobile app booking", "APP"),
        },
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

      await addBookingAuditLog({
        bookingId: row.id,
        action: "BOOKING_IMPORTED_FROM_APP",
        payload: {
          inboxId: entry.id,
          source: "APP",
        },
      });

      await maybeAwardBookingRewardPoints({
        bookingId: row.id,
        startTime: row.startTime,
        endTime: row.endTime,
        facilityArea: row.facilityArea,
        status: row.status,
        source: "APP",
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
      });

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

      await syncBookingRealtimeById(row.id);
    }
  } catch (error) {
    console.warn("[portal-db-api] mobile booking import skipped", error);
  }
}

function normalizeDayOfWeek(value: unknown): string | null {
  const candidate = String(value || "")
    .trim()
    .toUpperCase();
  const valid = new Set([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]);
  return valid.has(candidate) ? candidate : null;
}

function computeBookingFinancials(
  booking: {
    startTime: Date;
    endTime: Date;
    facilityArea: string | null;
  },
  payments: BookingPaymentRow[],
  courtRates?: CourtRateMap,
): BookingFinancialSummary {
  const totalHours = hoursBetween(
    new Date(booking.startTime),
    new Date(booking.endTime),
  );
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
  const latestPaymentMethod = payments.length
    ? (payments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]?.method ?? null)
    : null;

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

async function maybeAwardBookingRewardPoints(input: {
  bookingId: string;
  startTime: Date;
  endTime: Date;
  facilityArea: string | null;
  status: string | null | undefined;
  source: "WEBSITE" | "APP" | "ADMIN";
  customerName: string | null | undefined;
  customerEmail: string | null | undefined;
  customerPhone: string | null | undefined;
}) {
  const customerEmail = normalizeEmail(input.customerEmail);
  if (!customerEmail) return { awarded: false, points: 0 };

  const normalizedStatus = normalizeBookingStatusValue(input.status);
  const eligible =
    normalizedStatus !== "CANCELLED" &&
    (input.source === "APP" ||
      normalizedStatus === "CONFIRMED" ||
      normalizedStatus === "COMPLETED");
  if (!eligible) return { awarded: false, points: 0 };

  const totalHours = hoursBetween(
    new Date(input.startTime),
    new Date(input.endTime),
  );
  const rewardPointsPerHour = getCourtRewardPoints(
    input.facilityArea,
    await getEffectiveCourtRewardPoints(),
  );
  const points = calculateBookingRewardPoints({
    totalHours,
    rewardPointsPerHour,
  });
  if (points <= 0) return { awarded: false, points: 0 };

  const reason =
    input.source === "APP"
      ? `Booking reward - mobile app import (${input.bookingId})`
      : `Booking reward - ${normalizedStatus.toLowerCase()} (${input.bookingId})`;

  const result = await addBookingRewardPointAdjustment(prisma, {
    bookingId: input.bookingId,
    customerEmail,
    change: points,
    reason,
    source: input.source,
  });

  if (!result.awarded) return result;

  await syncTrackerForRegistrationContact({
    customerName: normalizeText(input.customerName) || "Booking customer",
    customerEmail,
    customerPhone: input.customerPhone ?? null,
  });
  await syncGuestAccessForEmail({
    customerEmail,
    customerName: input.customerName ?? null,
  });

  return result;
}

async function ensureBookingInfrastructure() {
  if (
    bookingInfraState.__portalBookingInfraReady &&
    (bookingInfraState.__portalBookingInfraVersion || 0) >=
      BOOKING_INFRA_VERSION
  ) {
    return;
  }
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

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BookingAuditLog" (
      "id" TEXT PRIMARY KEY,
      "bookingId" TEXT NULL,
      "action" TEXT NOT NULL,
      "payload" JSONB NULL,
      "createdByAdminId" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BookingAuditLog_bookingId_idx"
    ON "BookingAuditLog" ("bookingId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkingHours" (
      "id" TEXT PRIMARY KEY,
      "courtType" TEXT NOT NULL,
      "dayOfWeek" INTEGER NOT NULL,
      "openTime" TEXT NOT NULL DEFAULT '07:00',
      "closeTime" TEXT NOT NULL DEFAULT '23:59',
      "isClosed" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("courtType", "dayOfWeek")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AvailabilityException" (
      "id" TEXT PRIMARY KEY,
      "courtType" TEXT NOT NULL,
      "date" DATE NOT NULL,
      "openTime" TEXT NULL,
      "closeTime" TEXT NULL,
      "isClosed" BOOLEAN NOT NULL DEFAULT false,
      "reason" TEXT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AvailabilityException_court_date_idx"
    ON "AvailabilityException" ("courtType", "date");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CourtRate" (
      "courtType" TEXT PRIMARY KEY,
      "hourlyRate" INTEGER NOT NULL CHECK ("hourlyRate" > 0),
      "rewardPointsPerHour" INTEGER NOT NULL DEFAULT 10 CHECK ("rewardPointsPerHour" >= 0),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CourtRate"
    ADD COLUMN IF NOT EXISTS "rewardPointsPerHour" INTEGER NOT NULL DEFAULT 10
  `);
  for (const [courtType, hourlyRate] of Object.entries(HOURLY_RATE_BY_COURT)) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "CourtRate" ("courtType", "hourlyRate", "rewardPointsPerHour", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT ("courtType") DO NOTHING
      `,
      courtType,
      Math.max(1, Math.round(Number(hourlyRate || 0))),
      Math.max(0, Math.round(Number(REWARD_POINTS_BY_COURT[courtType] ?? 0))),
    );
  }

  bookingInfraState.__portalBookingInfraReady = true;
  bookingInfraState.__portalBookingInfraVersion = BOOKING_INFRA_VERSION;
}

async function addBookingAuditLog(input: {
  bookingId?: string | null;
  action: string;
  payload?: unknown;
  createdByAdminId?: string | null;
}) {
  await ensureBookingInfrastructure();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "BookingAuditLog" ("id", "bookingId", "action", "payload", "createdByAdminId", "createdAt")
      VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
    `,
    crypto.randomUUID(),
    input.bookingId ?? null,
    input.action,
    input.payload == null ? null : JSON.stringify(input.payload),
    input.createdByAdminId ?? null,
  );
}

async function listPaymentsForBookingIds(
  bookingIds: string[],
): Promise<BookingPaymentRow[]> {
  if (!bookingIds.length) return [];
  await ensureBookingInfrastructure();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "bookingId",
        "customerId",
        "amount",
        "method",
        "status",
        "transactionRef",
        "createdByAdminId",
        "createdAt",
        "updatedAt"
      FROM "BookingPayment"
      WHERE "bookingId" = ANY($1::text[])
      ORDER BY "createdAt" DESC
    `,
    bookingIds,
  )) as Array<{
    id: string;
    bookingId: string;
    customerId: string | null;
    amount: number;
    method: string;
    status: string;
    transactionRef: string | null;
    createdByAdminId: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    bookingId: row.bookingId,
    customerId: row.customerId,
    amount: Number(row.amount || 0),
    method: normalizePaymentMethod(row.method),
    status: normalizePaymentStatus(row.status),
    transactionRef: row.transactionRef,
    createdByAdminId: row.createdByAdminId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

function hourlySlotStringsBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    const hh = String(cursor.getHours()).padStart(2, "0");
    const mm = String(cursor.getMinutes()).padStart(2, "0");
    out.push(`${hh}:${mm}`);
    cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
  }
  return out;
}

function isBlockedSlotActiveForRange(
  slot: { startDate: Date | null; endDate: Date | null },
  start: Date,
  end: Date,
): boolean {
  if (slot.startDate && slot.startDate.getTime() > end.getTime()) return false;
  if (slot.endDate && slot.endDate.getTime() < start.getTime()) return false;
  return true;
}

async function validateBookingAvailability(input: {
  bookingId?: string | null;
  startTime: Date;
  endTime: Date;
  facilityArea: string | null | undefined;
  adminOverride?: boolean;
  createdByAdminId?: string | null;
}): Promise<{
  conflict: string | null;
  conflictMeta?: Record<string, unknown>;
}> {
  const facilityArea = (input.facilityArea || "").trim();
  if (!facilityArea) return { conflict: null };
  const dayOfWeek = dayOfWeekUpper(input.startTime);
  const slots = hourlySlotStringsBetween(input.startTime, input.endTime);

  const blocked = await prisma.blockedSlot.findMany({
    where: {
      isBlocked: true,
      dayOfWeek,
      courtType: facilityArea,
      time: { in: slots },
    },
    select: {
      id: true,
      time: true,
      label: true,
      startDate: true,
      endDate: true,
    },
  });
  const activeBlocked = blocked.find((row) =>
    isBlockedSlotActiveForRange(row, input.startTime, input.endTime),
  );
  if (activeBlocked && !input.adminOverride) {
    return {
      conflict: "Time conflicts with a recurring blocked slot",
      conflictMeta: {
        type: "RECURRING_BLOCK",
        slotId: activeBlocked.id,
        label: activeBlocked.label,
        time: activeBlocked.time,
      },
    };
  }

  await ensureBookingInfrastructure();
  const weekday = input.startTime.getDay();
  const workingRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "openTime", "closeTime", "isClosed"
      FROM "WorkingHours"
      WHERE "courtType" = $1 AND "dayOfWeek" = $2
      LIMIT 1
    `,
    facilityArea,
    weekday,
  )) as Array<{ openTime: string; closeTime: string; isClosed: boolean }>;
  const working = workingRows[0] ?? null;
  if (working?.isClosed && !input.adminOverride) {
    return {
      conflict: "Court is closed in configured working hours",
      conflictMeta: { type: "WORKING_HOURS_CLOSED" },
    };
  }
  if (working && !working.isClosed) {
    const open = parseClockToMinutes(working.openTime);
    const close = parseClockToMinutes(working.closeTime);
    const startM =
      input.startTime.getHours() * 60 + input.startTime.getMinutes();
    const endM = input.endTime.getHours() * 60 + input.endTime.getMinutes();
    const closeAdjusted =
      close != null && open != null && close > open ? close : 24 * 60;
    if (
      open != null &&
      closeAdjusted != null &&
      !input.adminOverride &&
      (startM < open || endM > closeAdjusted)
    ) {
      return {
        conflict: "Time falls outside configured working hours",
        conflictMeta: {
          type: "WORKING_HOURS_RANGE",
          openTime: working.openTime,
          closeTime: working.closeTime,
        },
      };
    }
  }

  const dateKey = toIsoDate(input.startTime);
  const exceptionRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "openTime", "closeTime", "isClosed", "reason"
      FROM "AvailabilityException"
      WHERE "courtType" = $1 AND "date" = $2::date
      LIMIT 1
    `,
    facilityArea,
    dateKey,
  )) as Array<{
    id: string;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
    reason: string | null;
  }>;
  const exception = exceptionRows[0] ?? null;
  if (exception?.isClosed && !input.adminOverride) {
    return {
      conflict: "Court is closed due to an availability exception",
      conflictMeta: {
        type: "EXCEPTION_CLOSED",
        reason: exception.reason,
      },
    };
  }
  if (
    exception &&
    !exception.isClosed &&
    exception.openTime &&
    exception.closeTime
  ) {
    const open = parseClockToMinutes(exception.openTime);
    const close = parseClockToMinutes(exception.closeTime);
    const startM =
      input.startTime.getHours() * 60 + input.startTime.getMinutes();
    const endM = input.endTime.getHours() * 60 + input.endTime.getMinutes();
    const closeAdjusted =
      close != null && open != null && close > open ? close : 24 * 60;
    if (
      open != null &&
      closeAdjusted != null &&
      !input.adminOverride &&
      (startM < open || endM > closeAdjusted)
    ) {
      return {
        conflict: "Time falls outside exception opening window",
        conflictMeta: {
          type: "EXCEPTION_WINDOW",
          openTime: exception.openTime,
          closeTime: exception.closeTime,
          reason: exception.reason,
        },
      };
    }
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      id: input.bookingId ? { not: input.bookingId } : undefined,
      facilityArea,
      status: { not: "CANCELLED" as any },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true, startTime: true, endTime: true },
  });
  if (overlap && !input.adminOverride) {
    return {
      conflict: "Time overlaps with an existing booking",
      conflictMeta: {
        type: "BOOKING_OVERLAP",
        bookingId: overlap.id,
      },
    };
  }

  if ((activeBlocked || exception || overlap) && input.adminOverride) {
    await addBookingAuditLog({
      bookingId: input.bookingId ?? null,
      action: "BOOKING_ADMIN_OVERRIDE",
      payload: {
        facilityArea,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        blockedSlotId: activeBlocked?.id ?? null,
        exceptionId: exception?.id ?? null,
        overlapBookingId: overlap?.id ?? null,
      },
      createdByAdminId: input.createdByAdminId ?? null,
    });
  }

  return { conflict: null };
}

type MemberRegistrationSummary = {
  id: string;
  studentName: string;
  packageName: string;
  customerAge: number | null;
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

async function listMemberRegistrationsByEmail(
  email: string,
): Promise<MemberRegistrationSummary[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const rows = await prisma.packageRegistration.findMany({
    where: { customerEmail: { equals: normalized, mode: "insensitive" } },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    orderBy: { createdAt: "desc" },
  });

  if (rows.length === 0) return [];
  return buildRegistrationMembershipSummaries(prisma, rows);
}

async function findOrCreateUserFromRegistration(reg: {
  customerEmail?: string | null;
  customerName: string;
  customerPhone: string;
}): Promise<{ id: string } | null> {
  const email = (reg.customerEmail ?? "").trim().toLowerCase();
  if (!email) return null;
  const customerName = reg.customerName.trim();
  const customerPhone = reg.customerPhone.trim();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(existing.name ? {} : { name: customerName || null }),
          ...(existing.phone ? {} : { phone: customerPhone || null }),
        },
      });
      return { id: existing.id };
    }

    try {
      const companyId = await resolveActiveCompanyId();
      const created = await prisma.user.create({
        data: {
          companyId,
          fullName: customerName || email,
          email,
          name: customerName || null,
          phone: customerPhone || null,
          password: crypto.randomBytes(24).toString("hex"),
          role: "MEMBER",
          isActive: true,
        },
        select: { id: true },
      });

      return created;
    } catch (error: any) {
      // Race-safe fallback: if another request created the same email first, reuse it.
      if (error?.code === "P2002") {
        const again = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (again) return again;
      }
      throw error;
    }
  } catch (error) {
    // User-linking must never block payment receipt creation.
    console.warn("[portal-db-api] user linking skipped", error);
    return null;
  }
}

async function getActiveMemberByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
  if (!user?.email) return null;
  return { ...user, email: user.email };
}

async function ensureMemberUserByRegistrationEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  let user = await getActiveMemberByEmail(normalized);
  if (user) return user;

  const reg = await prisma.packageRegistration.findFirst({
    where: { customerEmail: { equals: normalized, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      customerEmail: true,
      customerName: true,
      customerPhone: true,
    },
  });

  if (!reg) return null;

  await findOrCreateUserFromRegistration(reg);
  user = await getActiveMemberByEmail(normalized);
  return user;
}

async function resolveMemberUserFromRequest(request: NextRequest): Promise<
  | {
      user: {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        role: string;
        isActive: boolean;
        passwordHash: string | null;
      };
    }
  | { error: NextResponse }
> {
  const token = getBearerToken(request);
  if (token) {
    const payload = verifyMemberToken(token);
    if (!payload) return { error: jsonError("Invalid or expired token", 401) };

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });
    if (!user || !user.isActive)
      return { error: jsonError("Member account not found", 404) };
    const userEmail = normalizeEmail(user.email);
    if (!userEmail || userEmail !== normalizeEmail(payload.email)) {
      return { error: jsonError("Invalid token subject", 401) };
    }
    return { user: { ...user, email: userEmail } };
  }

  const memberEmail = normalizeEmail(request.headers.get("x-member-email"));
  if (!memberEmail) return { error: jsonError("Missing member identity", 401) };

  const user = await ensureMemberUserByRegistrationEmail(memberEmail);
  if (!user || !user.isActive)
    return { error: jsonError("Member account not found", 404) };
  return {
    user: { ...user, email: normalizeEmail(user.email) || memberEmail },
  };
}

async function buildMemberAuthPayload(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}) {
  const registrations = await listMemberRegistrationsByEmail(user.email);
  return {
    token: signMemberToken({
      uid: user.id,
      email: user.email,
      exp: Date.now() + MEMBER_TOKEN_TTL_MS,
    }),
    user: sanitizeMemberUser(user),
    registrations,
  };
}

async function memberSignIn(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) return jsonError("Email and password are required");

  const user = await ensureMemberUserByRegistrationEmail(email);
  if (!user || !user.isActive)
    return jsonError("Invalid email or password", 401);
  if (!verifyPassword(password, user.passwordHash)) {
    if (!user.passwordHash) {
      return jsonError(
        "Password is not set for this account. Complete first-time setup.",
        428,
      );
    }
    return jsonError("Invalid email or password", 401);
  }

  return NextResponse.json(await buildMemberAuthPayload(user));
}

async function memberSetupPassword(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    phone?: string;
    newPassword?: string;
  };

  const email = normalizeEmail(body.email);
  const phone = String(body.phone || "").trim();
  const newPassword = String(body.newPassword || "");

  if (!email || !phone || !newPassword) {
    return jsonError("Email, phone, and newPassword are required");
  }
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return jsonError(passwordError);

  const user = await ensureMemberUserByRegistrationEmail(email);
  if (!user || !user.isActive) return jsonError("Account not found", 404);

  let phoneVerified = phoneLooksSame(phone, user.phone);
  if (!phoneVerified) {
    const matchingRegistration = await prisma.packageRegistration.findFirst({
      where: {
        customerEmail: { equals: email, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      select: { customerPhone: true },
    });
    phoneVerified = phoneLooksSame(phone, matchingRegistration?.customerPhone);
  }

  if (!phoneVerified) return jsonError("Phone verification failed", 403);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      isActive: true,
      ...(user.phone ? {} : { phone }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json(
    await buildMemberAuthPayload({
      ...updated,
      email: normalizeEmail(updated.email) || email,
    }),
  );
}

async function memberChangePassword(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return jsonError("Authentication token is required", 401);

  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  if (!user.passwordHash) {
    return jsonError(
      "Password is not set for this account. Use first-time setup.",
      428,
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!currentPassword || !newPassword) {
    return jsonError("currentPassword and newPassword are required");
  }

  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return jsonError(passwordError);
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return jsonError("Current password is incorrect", 403);
  }
  if (currentPassword === newPassword) {
    return jsonError("New password must be different from current password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ success: true });
}

async function getMemberMe(request: NextRequest) {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  const registrations = await listMemberRegistrationsByEmail(user.email);
  const active = registrations.filter(
    (r) => r.status === "ACTIVE" || r.status === "EXPIRING_SOON",
  ).length;
  const expiringSoon = registrations.filter(
    (r) => r.status === "EXPIRING_SOON",
  ).length;
  const expired = registrations.filter((r) => r.status === "EXPIRED").length;

  return NextResponse.json({
    ...sanitizeMemberUser(user),
    registrations,
    stats: {
      totalRegistrations: registrations.length,
      active,
      expiringSoon,
      expired,
    },
  });
}

async function getMemberInvoices(request: NextRequest) {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return resolved.error;

  const { user } = resolved;
  const rows = await prisma.receipt.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          registration: {
            customerEmail: { equals: user.email, mode: "insensitive" },
          },
        },
      ],
    },
    orderBy: { dateTimeIssued: "desc" },
    select: {
      id: true,
      receiptId: true,
      dateTimeIssued: true,
      amountPaid: true,
      status: true,
      voidedAt: true,
      registrationId: true,
      packageName: true,
      personName: true,
      paymentMethod: true,
    },
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.receiptId,
      date: row.dateTimeIssued,
      amount: row.amountPaid,
      currency: "JOD",
      status: row.status === "VOIDED" || row.voidedAt ? "Refunded" : "Paid",
      registrationId: row.registrationId,
      packageName: row.packageName,
      studentName: row.personName,
      paymentMethod: row.paymentMethod,
    })),
  );
}

type MemberReceiptRow = NonNullable<
  Awaited<ReturnType<typeof prisma.receipt.findFirst>>
> & {
  registration:
    | (Record<string, unknown> & {
        receipts: Array<{ amountPaid: number | null }>;
      })
    | null;
};

async function loadMemberReceiptForRequest(
  receiptId: string,
  request: NextRequest,
): Promise<
  | {
      row: MemberReceiptRow;
      userEmail: string;
    }
  | { error: NextResponse }
> {
  const resolved = await resolveMemberUserFromRequest(request);
  if ("error" in resolved) return { error: resolved.error };

  const { user } = resolved;
  const row = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      OR: [
        { userId: user.id },
        {
          registration: {
            customerEmail: { equals: user.email, mode: "insensitive" },
          },
        },
      ],
    },
    include: {
      registration: {
        include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
      },
    },
  });

  if (!row) return { error: jsonError("Receipt not found", 404) };

  return { row: row as MemberReceiptRow, userEmail: user.email };
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimpleReceiptPdf(lines: string[]): Buffer {
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ["0 -18 Td", `(${escapePdfText(line)}) Tj`],
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

type InvoiceMeta = {
  paymentMethod?: string;
  descriptionText?: string;
  invoiceSource?: string;
  studentFullName?: string;
  studentAge?: number;
  guardianName?: string;
  emergencyPhone?: string;
  membershipId?: string;
  programName?: string;
  coachName?: string;
  branch?: string;
  trainingPeriodStart?: string;
  trainingPeriodEnd?: string;
  sessionsPerWeek?: number;
  totalSessions?: number;
  bankName?: string;
  accountName?: string;
  iban?: string;
  swift?: string;
  cashAccepted?: boolean;
  installments?: Array<Record<string, unknown>>;
};

type NormalizedInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "CANCELLED";

function parseInvoiceMeta(value: unknown): InvoiceMeta {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as InvoiceMeta)
      : {};
  } catch {
    return {};
  }
}

function normalizeInvoiceStatus(value: unknown): NormalizedInvoiceStatus {
  const next = String(value || "DRAFT")
    .trim()
    .toUpperCase();
  if (
    next === "DRAFT" ||
    next === "SENT" ||
    next === "PAID" ||
    next === "PARTIALLY_PAID" ||
    next === "OVERDUE" ||
    next === "CANCELLED"
  ) {
    return next;
  }
  return "DRAFT";
}

function normalizeInvoiceText(value: unknown): string | null {
  const next = normalizeText(value);
  return next || null;
}

function normalizeInvoiceAmount(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be 0 or greater`);
  }
  return Math.round(parsed);
}

function parseInvoiceDate(value: unknown, fieldName: string): Date | null {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

function normalizeInvoiceLineItems(value: unknown): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}> | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const description = normalizeText(item.description);
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const lineTotal = Number(item.lineTotal ?? quantity * unitPrice);
      if (!description) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
      if (!Number.isFinite(lineTotal) || lineTotal < 0) return null;
      return {
        description,
        quantity,
        unitPrice: Math.round(unitPrice),
        lineTotal: Math.round(lineTotal),
      };
    })
    .filter(Boolean) as Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;

  return items.length > 0 ? items : null;
}

function buildInvoiceDescription(input: {
  description?: unknown;
  paymentMethod?: unknown;
  invoiceSource?: unknown;
  studentFullName?: unknown;
  studentAge?: unknown;
  guardianName?: unknown;
  emergencyPhone?: unknown;
  membershipId?: unknown;
  programName?: unknown;
  coachName?: unknown;
  branch?: unknown;
  trainingPeriodStart?: unknown;
  trainingPeriodEnd?: unknown;
  sessionsPerWeek?: unknown;
  totalSessions?: unknown;
  bankName?: unknown;
  accountName?: unknown;
  iban?: unknown;
  swift?: unknown;
  cashAccepted?: unknown;
  installments?: unknown;
}): string | null {
  const meta: InvoiceMeta = {};

  const descriptionText = normalizeInvoiceText(input.description);
  if (descriptionText) meta.descriptionText = descriptionText;
  const paymentMethod = normalizeInvoiceText(input.paymentMethod);
  if (paymentMethod) meta.paymentMethod = paymentMethod;
  const invoiceSource = normalizeInvoiceText(input.invoiceSource);
  if (invoiceSource) meta.invoiceSource = invoiceSource;
  const studentFullName = normalizeInvoiceText(input.studentFullName);
  if (studentFullName) meta.studentFullName = studentFullName;
  const studentAge = input.studentAge == null ? null : Number(input.studentAge);
  if (studentAge != null && Number.isFinite(studentAge) && studentAge > 0) {
    meta.studentAge = Math.round(studentAge);
  }
  const guardianName = normalizeInvoiceText(input.guardianName);
  if (guardianName) meta.guardianName = guardianName;
  const emergencyPhone = normalizeInvoiceText(input.emergencyPhone);
  if (emergencyPhone) meta.emergencyPhone = emergencyPhone;
  const membershipId = normalizeInvoiceText(input.membershipId);
  if (membershipId) meta.membershipId = membershipId;
  const programName = normalizeInvoiceText(input.programName);
  if (programName) meta.programName = programName;
  const coachName = normalizeInvoiceText(input.coachName);
  if (coachName) meta.coachName = coachName;
  const branch = normalizeInvoiceText(input.branch);
  if (branch) meta.branch = branch;
  const trainingPeriodStart = normalizeInvoiceText(input.trainingPeriodStart);
  if (trainingPeriodStart) meta.trainingPeriodStart = trainingPeriodStart;
  const trainingPeriodEnd = normalizeInvoiceText(input.trainingPeriodEnd);
  if (trainingPeriodEnd) meta.trainingPeriodEnd = trainingPeriodEnd;
  const sessionsPerWeek =
    input.sessionsPerWeek == null ? null : Number(input.sessionsPerWeek);
  if (
    sessionsPerWeek != null &&
    Number.isFinite(sessionsPerWeek) &&
    sessionsPerWeek > 0
  ) {
    meta.sessionsPerWeek = sessionsPerWeek;
  }
  const totalSessions =
    input.totalSessions == null ? null : Number(input.totalSessions);
  if (
    totalSessions != null &&
    Number.isFinite(totalSessions) &&
    totalSessions > 0
  ) {
    meta.totalSessions = Math.round(totalSessions);
  }
  const bankName = normalizeInvoiceText(input.bankName);
  if (bankName) meta.bankName = bankName;
  const accountName = normalizeInvoiceText(input.accountName);
  if (accountName) meta.accountName = accountName;
  const iban = normalizeInvoiceText(input.iban);
  if (iban) meta.iban = iban;
  const swift = normalizeInvoiceText(input.swift);
  if (swift) meta.swift = swift;
  if (typeof input.cashAccepted === "boolean") {
    meta.cashAccepted = input.cashAccepted;
  }
  if (Array.isArray(input.installments) && input.installments.length > 0) {
    meta.installments = input.installments.filter(
      (entry) => entry && typeof entry === "object",
    ) as Array<Record<string, unknown>>;
  }

  return Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;
}

function serializeInvoiceRow(row: any) {
  const meta = parseInvoiceMeta(row.description);
  return {
    ...row,
    description:
      meta.descriptionText ??
      (Object.keys(meta).length > 0 ? null : (row.description ?? null)),
    meta,
    paymentMethod: meta.paymentMethod ?? null,
    pdfPath: `/api/portal/invoices/${row.id}/pdf`,
  };
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const nextNumber = (() => {
    if (!latest?.number) return 1;
    const match = latest.number.match(/^INV-\d{4}-(\d+)$/);
    if (!match) return 1;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed + 1 : 1;
  })();

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

type CashBookTransactionTypeValue = "INCOME" | "EXPENSE";

const DEFAULT_CASH_BOOK_CATEGORIES: Array<{
  type: CashBookTransactionTypeValue;
  name: string;
}> = [
  { type: "INCOME", name: "Salary" },
  { type: "INCOME", name: "Business" },
  { type: "INCOME", name: "Other" },
  { type: "EXPENSE", name: "Food" },
  { type: "EXPENSE", name: "Transport" },
  { type: "EXPENSE", name: "Bills" },
  { type: "EXPENSE", name: "Shopping" },
  { type: "EXPENSE", name: "Other" },
];

function normalizeCashBookType(
  value: unknown,
): CashBookTransactionTypeValue | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "INCOME" || normalized === "EXPENSE") {
    return normalized as CashBookTransactionTypeValue;
  }
  return null;
}

function resolveCompanyIdFromRequest(
  request: NextRequest,
  body?: unknown,
): string | null {
  return (
    (body
      ? extractConnectId(body, "company") || extractConnectId(body, "companyId")
      : null) ||
    request.nextUrl.searchParams.get("companyId") ||
    request.headers.get("x-company-id") ||
    null
  );
}

async function ensureCashBookDefaultCategories(companyId: string) {
  const existingCount = await prisma.cashBookCategory.count({
    where: { companyId },
  });
  if (existingCount > 0) return;

  await prisma.cashBookCategory.createMany({
    data: DEFAULT_CASH_BOOK_CATEGORIES.map((row) => ({
      companyId,
      type: row.type,
      name: row.name,
      isDefault: true,
    })),
    skipDuplicates: true,
  });
}

async function getCashBookCategoryById(id: string) {
  return prisma.cashBookCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
}

async function listCashBookCategories(request: NextRequest) {
  const companyId = resolveCompanyIdFromRequest(request);
  if (!companyId) return jsonError("companyId is required");

  await ensureCashBookDefaultCategories(companyId);

  const type = normalizeCashBookType(request.nextUrl.searchParams.get("type"));
  const rows = await prisma.cashBookCategory.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(rows);
}

async function getCashBookCategory(id: string) {
  const row = await getCashBookCategoryById(id);
  if (!row) return jsonError("Cash book category not found", 404);
  return NextResponse.json(row);
}

async function createCashBookCategory(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    companyId?: string;
    company?: { connect?: { id?: string } };
    type?: string;
    name?: string;
  };

  const companyId = resolveCompanyIdFromRequest(request, body);
  if (!companyId) return jsonError("companyId is required");

  const type = normalizeCashBookType(body.type);
  if (!type) return jsonError("type must be INCOME or EXPENSE");

  const name = normalizeText(body.name);
  if (!name) return jsonError("Category name is required");

  await ensureCashBookDefaultCategories(companyId);

  const existing = await prisma.cashBookCategory.findFirst({
    where: {
      companyId,
      type,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
  if (existing) return NextResponse.json(existing);

  const row = await prisma.cashBookCategory.create({
    data: {
      companyId,
      type,
      name,
      isDefault: false,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return NextResponse.json(row);
}

async function updateCashBookCategory(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    type?: string;
  };

  const existing = await getCashBookCategoryById(id);
  if (!existing) return jsonError("Cash book category not found", 404);

  const nextName =
    body.name === undefined ? existing.name : normalizeText(body.name);
  const nextType =
    body.type === undefined ? existing.type : normalizeCashBookType(body.type);

  if (!nextName) return jsonError("Category name is required");
  if (!nextType) return jsonError("type must be INCOME or EXPENSE");
  if (
    nextType !== existing.type &&
    Number(existing._count?.transactions || 0) > 0
  ) {
    return jsonError(
      "You cannot change the type of a category that already has transactions.",
      409,
    );
  }

  const duplicate = await prisma.cashBookCategory.findFirst({
    where: {
      id: { not: id },
      companyId: existing.companyId,
      type: nextType,
      name: {
        equals: nextName,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (duplicate) {
    return jsonError("A category with that name already exists.", 409);
  }

  const row = await prisma.cashBookCategory.update({
    where: { id },
    data: {
      name: nextName,
      type: nextType,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (nextName !== existing.name) {
    await prisma.cashBookTransaction.updateMany({
      where: { categoryId: id },
      data: { categoryName: nextName },
    });
  }

  return NextResponse.json(row);
}

async function deleteCashBookCategory(id: string, request: NextRequest) {
  const existing = await getCashBookCategoryById(id);
  if (!existing) return jsonError("Cash book category not found", 404);

  const force = request.nextUrl.searchParams.get("force") === "1";
  const transactionCount = Number(existing._count?.transactions || 0);
  if (transactionCount > 0 && !force) {
    return jsonError(
      "This category is already used by transactions. Confirm delete to remove it from future use.",
      409,
    );
  }

  await prisma.cashBookCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

async function getCashBookTransactionById(id: string) {
  return prisma.cashBookTransaction.findUnique({
    where: { id },
    include: {
      category: {
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      },
    },
  });
}

async function listCashBookTransactions(request: NextRequest) {
  const companyId = resolveCompanyIdFromRequest(request);
  if (!companyId) return jsonError("companyId is required");

  await ensureCashBookDefaultCategories(companyId);

  const type = normalizeCashBookType(request.nextUrl.searchParams.get("type"));
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  const search = normalizeText(request.nextUrl.searchParams.get("search"));

  const where: Record<string, unknown> = { companyId };
  if (type) where.type = type;
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      const parsedStart = parseDate(startDate);
      if (!parsedStart) return jsonError("Invalid startDate");
      dateFilter.gte = parsedStart;
    }
    if (endDate) {
      const parsedEnd = parseDate(endDate);
      if (!parsedEnd) return jsonError("Invalid endDate");
      parsedEnd.setHours(23, 59, 59, 999);
      dateFilter.lte = parsedEnd;
    }
    where.date = dateFilter;
  }
  if (search) {
    where.OR = [
      {
        note: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        categoryName: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const rows = await prisma.cashBookTransaction.findMany({
    where,
    include: {
      category: {
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(rows);
}

async function getCashBookTransaction(id: string) {
  const row = await getCashBookTransactionById(id);
  if (!row) return jsonError("Cash book transaction not found", 404);
  return NextResponse.json(row);
}

async function resolveCashBookCategory(params: {
  companyId: string;
  categoryId?: string | null;
  type: CashBookTransactionTypeValue;
}) {
  const { companyId, categoryId, type } = params;
  if (!categoryId) return null;

  const category = await prisma.cashBookCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.companyId !== companyId) {
    throw new Error("Selected category was not found.");
  }
  if (category.type !== type) {
    throw new Error("Selected category does not match the transaction type.");
  }
  return category;
}

async function createCashBookTransaction(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    companyId?: string;
    company?: { connect?: { id?: string } };
    type?: string;
    amount?: number | string;
    categoryId?: string | null;
    categoryName?: string | null;
    note?: string | null;
    date?: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | string | null;
  };

  const companyId = resolveCompanyIdFromRequest(request, body);
  if (!companyId) return jsonError("companyId is required");

  const type = normalizeCashBookType(body.type);
  if (!type) return jsonError("type must be INCOME or EXPENSE");

  const amount = coerceOptionalInteger(body.amount);
  if (amount == null || amount <= 0) {
    return jsonError("Amount must be greater than 0");
  }

  const date = parseDate(String(body.date || ""));
  if (!date) return jsonError("Valid date is required");

  let category = null as Awaited<ReturnType<typeof resolveCashBookCategory>>;
  try {
    category = await resolveCashBookCategory({
      companyId,
      categoryId: body.categoryId ?? null,
      type,
    });
  } catch (error) {
    return jsonError(getErrorMessage(error), 404);
  }

  const categoryName = category?.name || normalizeText(body.categoryName);
  if (!categoryName) return jsonError("Category is required");

  const attachmentSize =
    body.attachmentSize == null
      ? null
      : coerceOptionalInteger(body.attachmentSize);
  if (body.attachmentSize != null && attachmentSize == null) {
    return jsonError("attachmentSize must be a number");
  }

  const row = await prisma.cashBookTransaction.create({
    data: {
      companyId,
      type,
      amount,
      categoryId: category?.id ?? null,
      categoryName,
      note: normalizeText(body.note) || null,
      date,
      attachmentUrl: normalizeText(body.attachmentUrl) || null,
      attachmentName: normalizeText(body.attachmentName) || null,
      attachmentType: normalizeText(body.attachmentType) || null,
      attachmentSize,
    },
    include: {
      category: {
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      },
    },
  });

  return NextResponse.json(row);
}

async function updateCashBookTransaction(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    amount?: number | string;
    categoryId?: string | null;
    categoryName?: string | null;
    note?: string | null;
    date?: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | string | null;
  };

  const existing = await prisma.cashBookTransaction.findUnique({
    where: { id },
  });
  if (!existing) return jsonError("Cash book transaction not found", 404);

  const type =
    body.type === undefined ? existing.type : normalizeCashBookType(body.type);
  if (!type) return jsonError("type must be INCOME or EXPENSE");

  const amount =
    body.amount === undefined
      ? existing.amount
      : coerceOptionalInteger(body.amount);
  if (amount == null || amount <= 0) {
    return jsonError("Amount must be greater than 0");
  }

  const date =
    body.date === undefined
      ? existing.date
      : parseDate(String(body.date || ""));
  if (!date) return jsonError("Valid date is required");

  let nextCategoryId: string | null = existing.categoryId;
  let nextCategoryName = existing.categoryName;

  if (body.categoryId !== undefined) {
    if (body.categoryId) {
      try {
        const category = await resolveCashBookCategory({
          companyId: existing.companyId,
          categoryId: body.categoryId,
          type,
        });
        nextCategoryId = category?.id ?? null;
        nextCategoryName = category?.name || "";
      } catch (error) {
        return jsonError(getErrorMessage(error), 404);
      }
    } else {
      nextCategoryId = null;
      nextCategoryName = normalizeText(body.categoryName);
    }
  } else if (body.type !== undefined && type !== existing.type) {
    nextCategoryId = null;
    nextCategoryName = normalizeText(body.categoryName);
  } else if (body.categoryName !== undefined && !nextCategoryId) {
    nextCategoryName = normalizeText(body.categoryName);
  }

  if (!nextCategoryName) return jsonError("Category is required");

  const attachmentSize =
    body.attachmentSize === undefined
      ? existing.attachmentSize
      : body.attachmentSize == null
        ? null
        : coerceOptionalInteger(body.attachmentSize);
  if (
    body.attachmentSize !== undefined &&
    body.attachmentSize != null &&
    attachmentSize == null
  ) {
    return jsonError("attachmentSize must be a number");
  }

  const row = await prisma.cashBookTransaction.update({
    where: { id },
    data: {
      type,
      amount,
      categoryId: nextCategoryId,
      categoryName: nextCategoryName,
      note:
        body.note === undefined
          ? existing.note
          : normalizeText(body.note) || null,
      date,
      attachmentUrl:
        body.attachmentUrl === undefined
          ? existing.attachmentUrl
          : normalizeText(body.attachmentUrl) || null,
      attachmentName:
        body.attachmentName === undefined
          ? existing.attachmentName
          : normalizeText(body.attachmentName) || null,
      attachmentType:
        body.attachmentType === undefined
          ? existing.attachmentType
          : normalizeText(body.attachmentType) || null,
      attachmentSize,
    },
    include: {
      category: {
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      },
    },
  });

  return NextResponse.json(row);
}

async function deleteCashBookTransaction(id: string) {
  try {
    await prisma.cashBookTransaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return jsonError("Cash book transaction not found", 404);
    }
    return jsonError("Failed to delete cash book transaction", 500);
  }
}

async function listInvoices(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") || undefined;
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

  const where: any = {};
  if (companyId) where.companyId = companyId;
  if (status) where.status = normalizeInvoiceStatus(status);
  if (startDate || endDate) {
    where.issuedAt = {};
    if (startDate) {
      const parsedStart = parseDate(startDate);
      if (parsedStart) where.issuedAt.gte = parsedStart;
    }
    if (endDate) {
      const parsedEnd = parseDate(endDate);
      if (parsedEnd) {
        parsedEnd.setHours(23, 59, 59, 999);
        where.issuedAt.lte = parsedEnd;
      }
    }
  }

  const rows = await prisma.invoice.findMany({
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: {
      company: { select: { id: true, name: true } },
      member: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      subscription: { select: { id: true, status: true } },
    },
  });

  return NextResponse.json(rows.map(serializeInvoiceRow));
}

async function getInvoice(id: string) {
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      member: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      subscription: { select: { id: true, status: true } },
    },
  });
  if (!row) return jsonError("Invoice not found", 404);
  return NextResponse.json(serializeInvoiceRow(row));
}

async function createInvoice(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  const companyId =
    extractConnectId(body, "company") || extractConnectId(body, "companyId");
  if (!companyId) return jsonError("companyId is required");

  try {
    const amount = normalizeInvoiceAmount(body.amount, "amount");
    const amountPaid =
      body.amountPaid == null
        ? 0
        : normalizeInvoiceAmount(body.amountPaid, "amountPaid");
    const issuedAt = parseInvoiceDate(body.issuedAt, "issuedAt") ?? new Date();
    const dueDate = parseInvoiceDate(body.dueDate, "dueDate");
    const status = normalizeInvoiceStatus(body.status);
    const lineItems = normalizeInvoiceLineItems(body.lineItems);
    const description = buildInvoiceDescription(body);
    const paidAt =
      status === "PAID" || amountPaid >= amount
        ? (parseInvoiceDate(body.paidAt, "paidAt") ?? new Date())
        : parseInvoiceDate(body.paidAt, "paidAt");

    const number = await generateInvoiceNumber();
    const row = await prisma.invoice.create({
      data: {
        company: { connect: { id: companyId } },
        ...(extractConnectId(body, "member") ||
        extractConnectId(body, "memberId")
          ? {
              member: {
                connect: {
                  id:
                    extractConnectId(body, "member") ||
                    extractConnectId(body, "memberId")!,
                },
              },
            }
          : {}),
        ...(extractConnectId(body, "subscription") ||
        extractConnectId(body, "subscriptionId")
          ? {
              subscription: {
                connect: {
                  id:
                    extractConnectId(body, "subscription") ||
                    extractConnectId(body, "subscriptionId")!,
                },
              },
            }
          : {}),
        number,
        amount,
        amountPaid,
        currency: normalizeText(body.currency) || "JOD",
        status: (amountPaid >= amount && amount > 0 ? "PAID" : status) as any,
        issuedAt,
        dueDate,
        paidAt,
        description,
        companyName: normalizeInvoiceText(body.companyName),
        companyAddress: normalizeInvoiceText(body.companyAddress),
        logoPath: normalizeInvoiceText(body.logoPath),
        clientName: normalizeInvoiceText(body.clientName),
        clientEmail: normalizeInvoiceText(body.clientEmail),
        clientAddress: normalizeInvoiceText(body.clientAddress),
        lineItems: lineItems ?? undefined,
        subtotal:
          body.subtotal == null
            ? (lineItems?.reduce((sum, item) => sum + item.lineTotal, 0) ??
              amount)
            : normalizeInvoiceAmount(body.subtotal, "subtotal"),
        tax: body.tax == null ? null : normalizeInvoiceAmount(body.tax, "tax"),
        discount:
          body.discount == null
            ? null
            : normalizeInvoiceAmount(body.discount, "discount"),
        notes: normalizeInvoiceText(body.notes),
        companyEmail: normalizeInvoiceText(body.companyEmail),
        companyPhone: normalizeInvoiceText(body.companyPhone),
        note: normalizeInvoiceText(body.note),
        pdfPath: `/api/portal/invoices/__pending__/pdf`,
      },
      include: {
        company: { select: { id: true, name: true } },
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        subscription: { select: { id: true, status: true } },
      },
    });

    const finalized = await prisma.invoice.update({
      where: { id: row.id },
      data: { pdfPath: `/api/portal/invoices/${row.id}/pdf` },
      include: {
        company: { select: { id: true, name: true } },
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        subscription: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json(serializeInvoiceRow(finalized), { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create invoice",
    );
  }
}

async function updateInvoice(id: string, request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return jsonError("Invoice not found", 404);

  try {
    const data: Record<string, unknown> = {};
    if (body.amount !== undefined) {
      data.amount = normalizeInvoiceAmount(body.amount, "amount");
    }
    if (body.amountPaid !== undefined) {
      data.amountPaid = normalizeInvoiceAmount(body.amountPaid, "amountPaid");
    }
    if (body.currency !== undefined) {
      data.currency = normalizeText(body.currency) || "JOD";
    }
    if (body.status !== undefined) {
      data.status = normalizeInvoiceStatus(body.status);
    }
    if (body.issuedAt !== undefined) {
      data.issuedAt = parseInvoiceDate(body.issuedAt, "issuedAt");
    }
    if (body.dueDate !== undefined) {
      data.dueDate = parseInvoiceDate(body.dueDate, "dueDate");
    }
    if (body.paidAt !== undefined) {
      data.paidAt = parseInvoiceDate(body.paidAt, "paidAt");
    }
    if (body.companyEmail !== undefined) {
      data.companyEmail = normalizeInvoiceText(body.companyEmail);
    }
    if (body.companyPhone !== undefined) {
      data.companyPhone = normalizeInvoiceText(body.companyPhone);
    }
    if (body.companyName !== undefined) {
      data.companyName = normalizeInvoiceText(body.companyName);
    }
    if (body.companyAddress !== undefined) {
      data.companyAddress = normalizeInvoiceText(body.companyAddress);
    }
    if (body.clientName !== undefined) {
      data.clientName = normalizeInvoiceText(body.clientName);
    }
    if (body.clientEmail !== undefined) {
      data.clientEmail = normalizeInvoiceText(body.clientEmail);
    }
    if (body.clientAddress !== undefined) {
      data.clientAddress = normalizeInvoiceText(body.clientAddress);
    }
    if (body.note !== undefined) {
      data.note = normalizeInvoiceText(body.note);
    }
    if (body.notes !== undefined) {
      data.notes = normalizeInvoiceText(body.notes);
    }
    if (body.lineItems !== undefined) {
      data.lineItems = normalizeInvoiceLineItems(body.lineItems);
    }
    if (body.subtotal !== undefined) {
      data.subtotal =
        body.subtotal == null
          ? null
          : normalizeInvoiceAmount(body.subtotal, "subtotal");
    }
    if (body.tax !== undefined) {
      data.tax =
        body.tax == null ? null : normalizeInvoiceAmount(body.tax, "tax");
    }
    if (body.discount !== undefined) {
      data.discount =
        body.discount == null
          ? null
          : normalizeInvoiceAmount(body.discount, "discount");
    }

    const existingMeta = parseInvoiceMeta(existing.description);
    const hasMetaPatch = [
      "paymentMethod",
      "invoiceSource",
      "studentFullName",
      "studentAge",
      "guardianName",
      "emergencyPhone",
      "membershipId",
      "programName",
      "coachName",
      "branch",
      "trainingPeriodStart",
      "trainingPeriodEnd",
      "sessionsPerWeek",
      "totalSessions",
      "bankName",
      "accountName",
      "iban",
      "swift",
      "cashAccepted",
      "installments",
    ].some((key) => body[key] !== undefined);
    if (
      body.description !== undefined ||
      hasMetaPatch ||
      Object.keys(existingMeta).length > 0
    ) {
      const nextMeta = buildInvoiceDescription({
        ...existingMeta,
        ...body,
        description:
          body.description !== undefined
            ? body.description
            : (existingMeta.descriptionText ?? undefined),
      });
      data.description =
        nextMeta ??
        (body.description !== undefined
          ? normalizeInvoiceText(body.description)
          : existing.description);
    }

    const memberId =
      extractConnectId(body, "member") || extractConnectId(body, "memberId");
    if (memberId) {
      data.member = { connect: { id: memberId } };
    } else if (body.member !== undefined || body.memberId !== undefined) {
      data.member = { disconnect: true };
    }

    const subscriptionId =
      extractConnectId(body, "subscription") ||
      extractConnectId(body, "subscriptionId");
    if (subscriptionId) {
      data.subscription = { connect: { id: subscriptionId } };
    } else if (
      body.subscription !== undefined ||
      body.subscriptionId !== undefined
    ) {
      data.subscription = { disconnect: true };
    }

    const nextAmount = Number(data.amount ?? existing.amount);
    const nextAmountPaid = Number(data.amountPaid ?? existing.amountPaid);
    const nextStatus = normalizeInvoiceStatus(data.status ?? existing.status);
    if (
      !("paidAt" in data) &&
      (nextStatus === "PAID" || nextAmountPaid >= nextAmount)
    ) {
      data.paidAt = existing.paidAt ?? new Date();
    }

    const row = await prisma.invoice.update({
      where: { id },
      data: data as any,
      include: {
        company: { select: { id: true, name: true } },
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        subscription: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json(serializeInvoiceRow(row));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update invoice",
    );
  }
}

async function deleteInvoice(id: string) {
  try {
    await prisma.invoice.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.code === "P2025") return jsonError("Invoice not found", 404);
    return jsonError("Failed to delete invoice", 500);
  }
}

async function getInvoicePdf(id: string) {
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      member: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  if (!row) return jsonError("Invoice not found", 404);

  const meta = parseInvoiceMeta(row.description);
  const items = Array.isArray(row.lineItems)
    ? (row.lineItems as Array<Record<string, unknown>>)
    : [];
  const memberName =
    `${row.member?.firstName || ""} ${row.member?.lastName || ""}`.trim();
  const lines = [
    `Infinity Sports Invoice - ${row.number}`,
    `Issue Date: ${new Date(row.issuedAt).toLocaleDateString("en-GB")}`,
    `Due Date: ${row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-GB") : "Not set"}`,
    `Company: ${row.companyName || row.company?.name || "Infinity Sports"}`,
    `Client: ${row.clientName || memberName || "N/A"}`,
    `Amount: ${row.currency} ${row.amount}`,
    `Paid: ${row.currency} ${row.amountPaid || 0}`,
    `Remaining: ${row.currency} ${Math.max(0, row.amount - (row.amountPaid || 0))}`,
    `Status: ${row.status}`,
    `Payment Method: ${meta.paymentMethod || "Not specified"}`,
  ];

  for (const item of items.slice(0, 6)) {
    const description = normalizeText(item.description) || "Item";
    const lineTotal = Number(item.lineTotal ?? 0);
    lines.push(`${description}: ${row.currency} ${lineTotal}`);
  }

  if (row.note) {
    lines.push(`Note: ${row.note}`);
  }

  const pdf = buildSimpleReceiptPdf(lines);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

async function getMemberReceipt(receiptId: string, request: NextRequest) {
  const loaded = await loadMemberReceiptForRequest(receiptId, request);
  if ("error" in loaded) return loaded.error;

  const { row } = loaded;

  const collected = (row.registration?.receipts || []).reduce(
    (sum: number, rec: { amountPaid: number | null }) =>
      sum + Number(rec.amountPaid || 0),
    0,
  );
  return NextResponse.json({
    ...row,
    registration: row.registration
      ? {
          ...row.registration,
          collected,
        }
      : null,
  });
}

async function getMemberReceiptPdf(receiptId: string, request: NextRequest) {
  const loaded = await loadMemberReceiptForRequest(receiptId, request);
  if ("error" in loaded) return loaded.error;

  const { row, userEmail } = loaded;
  const lines = [
    `Infinity Sports Receipt - ${row.receiptId}`,
    `Date: ${new Date(row.dateTimeIssued).toLocaleString("en-GB")}`,
    `Paid For Month: ${row.paymentPeriodKey || "-"}`,
    `Member Email: ${userEmail}`,
    `Student: ${row.personName}`,
    `Phone: ${row.personPhone}`,
    `Package: ${row.packageName}`,
    `Amount: ${row.amountPaid} JOD`,
    `Payment Method: ${row.paymentMethod}`,
    `Status: ${row.status === "VOIDED" || row.voidedAt ? "Refunded" : "Paid"}`,
  ];

  const pdf = buildSimpleReceiptPdf(lines);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.receiptId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

async function generateReceiptId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;
  const latest = await prisma.receipt.findFirst({
    where: { receiptId: { startsWith: prefix } },
    select: { receiptId: true },
    orderBy: { receiptId: "desc" },
  });

  const nextNumber = (() => {
    if (!latest?.receiptId) return 1;
    const match = latest.receiptId.match(/^RCP-\d{4}-(\d+)$/);
    if (!match) return 1;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed + 1 : 1;
  })();

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function createPackageRegistration(payload: RegistrationInput) {
  const packageName = (payload.packageName || "").trim();
  const customerName = (payload.customerName || "").trim();
  const customerPhone = (payload.customerPhone || "").trim();

  if (!packageName) throw new Error("Package is required");
  if (!customerName) throw new Error("Customer name is required");
  if (!customerPhone) throw new Error("Customer phone is required");

  const packageDefaults = await getPackageDefaults(packageName);
  const basePriceJod =
    payload.basePriceJod != null
      ? clampNonNegative(Number(payload.basePriceJod))
      : packageDefaults.basePriceJod;
  const defaultSessionsLeft = packageDefaults.defaultSessionsLeft;
  const durationMonths = normalizeDurationMonths(
    payload.durationMonths,
    packageDefaults.durationMonths,
  );

  const discountType = (payload.discountType || "NONE").toUpperCase();
  const discountValue =
    discountType === "NONE" ? null : Number(payload.discountValue ?? 0);
  if (discountType !== "NONE") {
    const invalid =
      discountValue == null ||
      (discountType === "PERCENT" &&
        (discountValue < 0 || discountValue > 100)) ||
      (discountType === "AMOUNT" && discountValue < 0);
    if (invalid) throw new Error("Invalid discount");
    if (!(payload.discountReason || "").trim()) {
      throw new Error("Discount reason is required when applying a discount");
    }
  }

  const finalPriceJod = computeFinalPriceJod(
    basePriceJod,
    discountType,
    discountValue,
  );
  const now = new Date();
  const periodStartsAt = payload.periodStartsAt
    ? new Date(payload.periodStartsAt)
    : now;
  if (Number.isNaN(periodStartsAt.getTime())) {
    throw new Error("Invalid period start date");
  }
  const cycleAnchor = periodStartsAt;
  const periodEndsAt = computeCyclePeriodEnd(cycleAnchor, durationMonths);
  const nextPaymentDate = payload.nextPaymentDate
    ? parseOptionalMembershipDate(payload.nextPaymentDate)
    : computeCyclePeriodEnd(cycleAnchor, durationMonths);
  if (payload.nextPaymentDate && !nextPaymentDate) {
    throw new Error("Invalid next payment date");
  }
  const sessionsLeft =
    payload.sessionsLeft == null
      ? defaultSessionsLeft
      : Math.max(0, Math.round(Number(payload.sessionsLeft) || 0));
  const sessionsUsedOverride =
    payload.sessionsUsedOverride == null
      ? null
      : Math.max(0, Math.round(Number(payload.sessionsUsedOverride) || 0));
  const planLabel = normalizeText(payload.planLabel) || packageName;
  const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(now);

  const createData: Record<string, unknown> = {
    packageName,
    customerName,
    customerPhone,
    customerEmail: normalizeEmail(payload.customerEmail) || null,
    customerAge: payload.customerAge ?? null,
    isPaid: false,
    basePriceJod,
    discountType,
    discountValue: discountType === "NONE" ? null : Number(discountValue),
    discountReason:
      discountType === "NONE"
        ? null
        : (payload.discountReason || "").trim() || null,
    discountAppliedBy:
      discountType === "NONE" ? null : (payload.createdBy ?? null),
    discountAppliedAt: discountType === "NONE" ? null : now,
    finalPriceJod,
    billingPeriodKey,
    priceLockedUntil,
    durationMonths,
    periodEndsAt,
    sessionsLeft,
    sessionsUsedOverride,
    nextPaymentDate,
    planLabel,
  };
  createData.periodStartsAt = periodStartsAt;

  const row = await createPackageRegistrationCompat(
    prisma.packageRegistration,
    {
      data: createData,
      include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    },
  );

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  await syncTrackerForRegistrationContact({
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
  });

  let trackerPlayerId: string | null = null;
  try {
    trackerPlayerId = await ensureTrackerPlayerForRegistration(row.id);
  } catch (error) {
    console.warn(
      "[portal-db-api] tracker player sync skipped on registration create",
      error,
    );
  }
  await syncRegistrationRealtimeById(row.id, "ADMIN");
  const [serialized] = await serializeRegistrationRows([row]);
  return {
    ...serialized,
    playerId: trackerPlayerId,
  };
}

async function listPackageRegistrations(request: NextRequest) {
  const packageName =
    request.nextUrl.searchParams.get("packageName") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") || undefined;
  const search = normalizeText(request.nextUrl.searchParams.get("search"));

  const where: any = {};
  if (packageName) where.packageName = packageName;
  if (search) {
    const matchedIds = await searchRegistrationIds(prisma, search);
    if (matchedIds.length === 0) return NextResponse.json([]);
    where.id = { in: matchedIds };
  }
  if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.OR = [
      { periodStartsAt: range },
      { periodStartsAt: null, createdAt: range },
    ];
  }

  const rows = await prisma.packageRegistration.findMany({
    where,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(await serializeRegistrationRows(rows));
}

async function getRegistrationTotals(request: NextRequest) {
  const packageName =
    request.nextUrl.searchParams.get("packageName") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

  const where: any = {};
  if (packageName) where.packageName = packageName;
  if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.OR = [
      { periodStartsAt: range },
      { periodStartsAt: null, createdAt: range },
    ];
  }

  const regs = await prisma.packageRegistration.findMany({
    where,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let expectedTotal = 0;
  let collectedTotal = 0;
  let discountsTotal = 0;

  const byMethod: Record<string, number> = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    OTHER: 0,
  };
  const byPackage: Record<
    string,
    {
      registered: number;
      expected: number;
      collected: number;
      remaining: number;
    }
  > = {};

  for (const reg of regs) {
    const finalPrice = Number(reg.finalPriceJod) || 0;
    const basePrice = Number(reg.basePriceJod) || 0;
    const collected = (reg.receipts || []).reduce(
      (sum, rec) => sum + (rec.amountPaid || 0),
      0,
    );

    expectedTotal += finalPrice;
    collectedTotal += collected;
    discountsTotal += Math.max(0, basePrice - finalPrice);

    const paymentStatus = getRegistrationPaymentStatus(
      finalPrice,
      collected,
      Boolean(reg.isPaid),
    );
    if (paymentStatus === "PAID") paidCount += 1;
    else if (paymentStatus === "PARTIAL") partialCount += 1;
    else unpaidCount += 1;

    for (const rec of reg.receipts || []) {
      const method = (rec.paymentMethod || "CASH").toUpperCase();
      if (byMethod[method] != null) byMethod[method] += rec.amountPaid || 0;
    }

    if (!packageName) {
      const pkg = reg.packageName || "";
      if (!byPackage[pkg])
        byPackage[pkg] = {
          registered: 0,
          expected: 0,
          collected: 0,
          remaining: 0,
        };
      byPackage[pkg].registered += 1;
      byPackage[pkg].expected += finalPrice;
      byPackage[pkg].collected += collected;
      byPackage[pkg].remaining += Math.max(0, finalPrice - collected);
    }
  }

  return NextResponse.json({
    totalRegistered: regs.length,
    paidCount,
    partialCount,
    unpaidCount,
    expectedTotal,
    collectedTotal,
    remainingTotal: expectedTotal - collectedTotal,
    discountsTotal,
    byMethod,
    byPackage: packageName ? undefined : byPackage,
  });
}

async function getDashboardStats(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") || undefined;
  const companyWhere = companyId ? { companyId } : {};

  const [
    totalMembers,
    activeCoaches,
    activeClasses,
    activeSubscriptions,
    pendingBookings,
    pendingInvoices,
    openTasks,
    lowInventory,
  ] = await Promise.all([
    prisma.member.count({ where: companyWhere }),
    prisma.coach.count({ where: { ...companyWhere, status: "ACTIVE" as any } }),
    prisma.class.count({
      where: { ...companyWhere, status: "SCHEDULED" as any },
    }),
    prisma.subscription.count({
      where: { ...companyWhere, status: "ACTIVE" as any },
    }),
    prisma.booking.count({
      where: { ...companyWhere, status: "PENDING" as any },
    }),
    prisma.invoice.count({
      where: {
        ...companyWhere,
        status: { in: ["DRAFT", "SENT", "OVERDUE"] as any[] },
      },
    }),
    prisma.staffTask.count({
      where: {
        ...companyWhere,
        status: { in: ["OPEN", "IN_PROGRESS"] as any[] },
      },
    }),
    prisma.inventoryItem.count({
      where: {
        ...companyWhere,
        status: { in: ["LOW", "OUT_OF_STOCK"] as any[] },
      },
    }),
  ]);

  return NextResponse.json({
    totalMembers,
    activeCoaches,
    activeClasses,
    activeSubscriptions,
    pendingBookings,
    pendingInvoices,
    openTasks,
    lowInventory,
  });
}

const SHOP_ITEM_STATUSES = ["ACTIVE", "SOLD_OUT", "HIDDEN"] as const;
type ShopItemStatus = (typeof SHOP_ITEM_STATUSES)[number];

type ShopItemRow = {
  id: string;
  companyId: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  quantityAvailable: number | null;
  status: string;
  isFeatured: boolean;
  redemptionNote: string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function normalizeShopItemStatus(value: unknown): ShopItemStatus {
  const normalized = String(value || "ACTIVE")
    .trim()
    .toUpperCase();
  return (SHOP_ITEM_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as ShopItemStatus)
    : "ACTIVE";
}

function serializeShopItemRow(row: ShopItemRow) {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    category: row.category,
    description: row.description,
    imageUrl: row.imageUrl,
    pointsCost: Number(row.pointsCost || 0),
    quantityAvailable:
      row.quantityAvailable == null ? null : Number(row.quantityAvailable || 0),
    status: normalizeShopItemStatus(row.status),
    isFeatured: Boolean(row.isFeatured),
    redemptionNote: row.redemptionNote,
    sortOrder: Number(row.sortOrder || 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

async function ensureShopInfrastructure() {
  if (
    shopInfraState.__portalShopInfraReady &&
    (shopInfraState.__portalShopInfraVersion || 0) >= SHOP_INFRA_VERSION
  ) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PortalShopItem" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "category" TEXT NULL,
      "description" TEXT NULL,
      "imageUrl" TEXT NULL,
      "pointsCost" INTEGER NOT NULL CHECK ("pointsCost" > 0),
      "quantityAvailable" INTEGER NULL CHECK ("quantityAvailable" >= 0),
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "isFeatured" BOOLEAN NOT NULL DEFAULT false,
      "redemptionNote" TEXT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PortalShopItem_companyId_idx"
    ON "PortalShopItem" ("companyId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PortalShopItem_status_idx"
    ON "PortalShopItem" ("status");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PortalShopItem_sortOrder_idx"
    ON "PortalShopItem" ("sortOrder");
  `);

  shopInfraState.__portalShopInfraReady = true;
  shopInfraState.__portalShopInfraVersion = SHOP_INFRA_VERSION;
}

async function loadShopItemRows(
  companyId?: string | null,
  status?: ShopItemStatus | null,
): Promise<ShopItemRow[]> {
  await ensureShopInfrastructure();

  return (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "companyId",
        "name",
        "category",
        "description",
        "imageUrl",
        "pointsCost",
        "quantityAvailable",
        "status",
        "isFeatured",
        "redemptionNote",
        "sortOrder",
        "createdAt",
        "updatedAt"
      FROM "PortalShopItem"
      WHERE ($1::text IS NULL OR "companyId" = $1)
        AND ($2::text IS NULL OR "status" = $2)
      ORDER BY "isFeatured" DESC, "sortOrder" ASC, "createdAt" DESC
    `,
    companyId ?? null,
    status ?? null,
  )) as ShopItemRow[];
}

async function loadShopItemById(id: string): Promise<ShopItemRow | null> {
  await ensureShopInfrastructure();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "companyId",
        "name",
        "category",
        "description",
        "imageUrl",
        "pointsCost",
        "quantityAvailable",
        "status",
        "isFeatured",
        "redemptionNote",
        "sortOrder",
        "createdAt",
        "updatedAt"
      FROM "PortalShopItem"
      WHERE "id" = $1
      LIMIT 1
    `,
    id,
  )) as ShopItemRow[];
  return rows[0] ?? null;
}

async function syncShopCatalogForCompany(companyId: string) {
  const firestore = getFirestore();
  const rows = await loadShopItemRows(companyId, null);
  return syncTrackerShopCatalog({
    firestore,
    companyId,
    items: rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      category: row.category,
      description: row.description,
      imageUrl: row.imageUrl,
      pointsCost: Number(row.pointsCost || 0),
      quantityAvailable:
        row.quantityAvailable == null
          ? null
          : Number(row.quantityAvailable || 0),
      status: normalizeShopItemStatus(row.status),
      isFeatured: Boolean(row.isFeatured),
      redemptionNote: row.redemptionNote,
      sortOrder: Number(row.sortOrder || 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}

function buildShopItemPayload(
  source: Record<string, unknown>,
  existing?: ReturnType<typeof serializeShopItemRow> | null,
) {
  const name =
    source.name !== undefined
      ? normalizeText(source.name)
      : existing?.name || "";
  const category =
    source.category !== undefined
      ? normalizeText(source.category) || null
      : existing?.category || null;
  const description =
    source.description !== undefined
      ? normalizeText(source.description) || null
      : existing?.description || null;
  const imageUrl =
    source.imageUrl !== undefined
      ? normalizeText(source.imageUrl) || null
      : existing?.imageUrl || null;
  const pointsCost =
    source.pointsCost !== undefined
      ? coerceOptionalInteger(source.pointsCost)
      : (existing?.pointsCost ?? null);
  const quantityAvailable =
    source.quantityAvailable !== undefined
      ? normalizeText(source.quantityAvailable) === ""
        ? null
        : coerceOptionalInteger(source.quantityAvailable)
      : (existing?.quantityAvailable ?? null);
  const status =
    source.status !== undefined
      ? normalizeShopItemStatus(source.status)
      : normalizeShopItemStatus(existing?.status);
  const isFeatured =
    source.isFeatured !== undefined
      ? Boolean(source.isFeatured)
      : Boolean(existing?.isFeatured);
  const redemptionNote =
    source.redemptionNote !== undefined
      ? normalizeText(source.redemptionNote) || null
      : existing?.redemptionNote || null;
  const sortOrder =
    source.sortOrder !== undefined
      ? Math.max(0, coerceOptionalInteger(source.sortOrder) ?? 0)
      : (existing?.sortOrder ?? 0);

  if (!name) throw new Error("Item name is required.");
  if (pointsCost == null || pointsCost <= 0) {
    throw new Error("Points required must be greater than 0.");
  }
  if (quantityAvailable != null && quantityAvailable < 0) {
    throw new Error("Quantity available cannot be negative.");
  }

  return {
    name,
    category,
    description,
    imageUrl,
    pointsCost,
    quantityAvailable,
    status,
    isFeatured,
    redemptionNote,
    sortOrder,
  };
}

async function listShopItems(request: NextRequest) {
  const companyId = normalizeText(
    request.nextUrl.searchParams.get("companyId"),
  );
  const statusParam = normalizeText(request.nextUrl.searchParams.get("status"));
  const rows = await loadShopItemRows(
    companyId || null,
    statusParam && statusParam.toUpperCase() !== "ALL"
      ? normalizeShopItemStatus(statusParam)
      : null,
  );
  return NextResponse.json(rows.map(serializeShopItemRow));
}

async function publishShopCatalog(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const companyId =
    normalizeText(body.companyId) ||
    normalizeText(request.nextUrl.searchParams.get("companyId"));
  if (!companyId) return jsonError("companyId is required");

  const result = await syncShopCatalogForCompany(companyId);
  return NextResponse.json({ success: true, synced: result.synced });
}

async function createShopItem(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const companyId = normalizeText(body.companyId);
  if (!companyId) return jsonError("companyId is required");

  try {
    const payload = buildShopItemPayload(body);
    const id = crypto.randomUUID();
    await ensureShopInfrastructure();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "PortalShopItem" (
          "id",
          "companyId",
          "name",
          "category",
          "description",
          "imageUrl",
          "pointsCost",
          "quantityAvailable",
          "status",
          "isFeatured",
          "redemptionNote",
          "sortOrder",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `,
      id,
      companyId,
      payload.name,
      payload.category,
      payload.description,
      payload.imageUrl,
      payload.pointsCost,
      payload.quantityAvailable,
      payload.status,
      payload.isFeatured,
      payload.redemptionNote,
      payload.sortOrder,
    );

    const row = await loadShopItemById(id);
    if (!row) return jsonError("Failed to create shop item", 500);

    try {
      await syncShopCatalogForCompany(companyId);
    } catch (error) {
      console.error(
        "[portal-shop] Failed to sync catalog after create:",
        error,
      );
    }

    return NextResponse.json(serializeShopItemRow(row), { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create shop item",
    );
  }
}

async function updateShopItem(id: string, request: NextRequest) {
  const existing = await loadShopItemById(id);
  if (!existing) return jsonError("Shop item not found", 404);

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  try {
    const payload = buildShopItemPayload(body, serializeShopItemRow(existing));
    await prisma.$executeRawUnsafe(
      `
        UPDATE "PortalShopItem"
        SET
          "name" = $2,
          "category" = $3,
          "description" = $4,
          "imageUrl" = $5,
          "pointsCost" = $6,
          "quantityAvailable" = $7,
          "status" = $8,
          "isFeatured" = $9,
          "redemptionNote" = $10,
          "sortOrder" = $11,
          "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      id,
      payload.name,
      payload.category,
      payload.description,
      payload.imageUrl,
      payload.pointsCost,
      payload.quantityAvailable,
      payload.status,
      payload.isFeatured,
      payload.redemptionNote,
      payload.sortOrder,
    );

    const row = await loadShopItemById(id);
    if (!row) return jsonError("Shop item not found", 404);

    try {
      await syncShopCatalogForCompany(row.companyId);
    } catch (error) {
      console.error(
        "[portal-shop] Failed to sync catalog after update:",
        error,
      );
    }

    return NextResponse.json(serializeShopItemRow(row));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update shop item",
    );
  }
}

async function removeShopItem(id: string) {
  const existing = await loadShopItemById(id);
  if (!existing) return jsonError("Shop item not found", 404);

  await prisma.$executeRawUnsafe(
    `DELETE FROM "PortalShopItem" WHERE "id" = $1`,
    id,
  );

  try {
    await syncShopCatalogForCompany(existing.companyId);
  } catch (error) {
    console.error("[portal-shop] Failed to sync catalog after delete:", error);
  }

  return NextResponse.json({ success: true });
}

async function bulkCreatePackageRegistrations(request: NextRequest) {
  const body = (await request.json()) as {
    startDate?: string | null;
    registrations: RegistrationInput[];
  };

  if (!Array.isArray(body.registrations)) {
    return jsonError("registrations must be an array");
  }

  const results: Array<{
    success: boolean;
    id?: string;
    row?: number;
    error?: string;
  }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < body.registrations.length; i += 1) {
    const item = body.registrations[i];
    const pkg = (item.packageName || "").trim();
    const phone = (item.customerPhone || "").trim();
    const key = `${pkg}|${phone}`;

    if (!(item.customerName || "").trim() || !phone) {
      results.push({
        success: false,
        row: i + 1,
        error: "Name and phone required",
      });
      continue;
    }

    if (seen.has(key)) {
      results.push({
        success: false,
        row: i + 1,
        error: "Duplicate phone in this batch",
      });
      continue;
    }
    seen.add(key);

    const existing = await prisma.packageRegistration.findFirst({
      where: { packageName: pkg, customerPhone: phone },
      select: { id: true },
    });
    if (existing) {
      results.push({
        success: false,
        row: i + 1,
        error: "Duplicate registration (same package + phone)",
      });
      continue;
    }

    try {
      const created = await createPackageRegistration({
        ...item,
        periodStartsAt: item.periodStartsAt ?? body.startDate ?? null,
      });
      results.push({ success: true, id: created.id, row: i + 1 });
    } catch (error) {
      results.push({
        success: false,
        row: i + 1,
        error: error instanceof Error ? error.message : "Create failed",
      });
    }
  }

  return NextResponse.json({ results });
}

async function bulkCreateForPerson(request: NextRequest) {
  const body = (await request.json()) as {
    person: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      customerAge?: number | null;
    };
    periodStartsAt?: string | null;
    registrations: RegistrationInput[];
  };

  const customerName = (body.person?.customerName || "").trim();
  const customerPhone = (body.person?.customerPhone || "").trim();
  if (!customerName || !customerPhone)
    return jsonError("Person name and phone are required");
  if (!Array.isArray(body.registrations) || body.registrations.length === 0) {
    return jsonError("At least one package is required");
  }

  try {
    const packageNames = body.registrations
      .map((r) => (r.packageName || "").trim())
      .filter(Boolean);
    if (packageNames.length !== body.registrations.length)
      return jsonError("Every registration must have a package name");

    const existing = await prisma.packageRegistration.findMany({
      where: {
        customerPhone,
        packageName: { in: packageNames },
      },
      select: { packageName: true },
    });
    if (existing.length > 0) {
      return jsonError(
        `Person already has an active registration for: ${existing.map((row) => row.packageName).join(", ")}`,
        409,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const out: any[] = [];

      for (const entry of body.registrations) {
        const packageName = (entry.packageName || "").trim();
        const packageDefaults = await getPackageDefaults(packageName);
        const basePriceJod =
          entry.basePriceJod != null
            ? clampNonNegative(Number(entry.basePriceJod))
            : packageDefaults.basePriceJod;
        const defaultSessionsLeft = packageDefaults.defaultSessionsLeft;
        const durationMonths = normalizeDurationMonths(
          entry.durationMonths,
          packageDefaults.durationMonths,
        );
        const discountType = (entry.discountType || "NONE").toUpperCase();
        const discountValue =
          discountType === "NONE" ? null : Number(entry.discountValue ?? 0);
        const finalPriceJod = computeFinalPriceJod(
          basePriceJod,
          discountType,
          discountValue,
        );

        const now = new Date();
        const periodStartsAt = entry.periodStartsAt
          ? new Date(entry.periodStartsAt)
          : body.periodStartsAt
            ? new Date(body.periodStartsAt)
            : now;
        if (Number.isNaN(periodStartsAt.getTime())) {
          throw new Error("Invalid period start date");
        }
        const cycleAnchor = periodStartsAt;
        const periodEndsAt = computeCyclePeriodEnd(cycleAnchor, durationMonths);
        const nextPaymentDate = entry.nextPaymentDate
          ? parseOptionalMembershipDate(entry.nextPaymentDate)
          : periodEndsAt;
        if (entry.nextPaymentDate && !nextPaymentDate) {
          throw new Error("Invalid next payment date");
        }
        const sessionsLeft =
          entry.sessionsLeft == null
            ? defaultSessionsLeft
            : Math.max(0, Math.round(Number(entry.sessionsLeft) || 0));
        const sessionsUsedOverride =
          entry.sessionsUsedOverride == null
            ? null
            : Math.max(0, Math.round(Number(entry.sessionsUsedOverride) || 0));
        const planLabel = normalizeText(entry.planLabel) || packageName;
        const { billingPeriodKey, priceLockedUntil } =
          billingPeriodFromDate(now);

        const createData: Record<string, unknown> = {
          packageName,
          customerName,
          customerPhone,
          customerEmail: normalizeEmail(body.person.customerEmail) || null,
          customerAge: body.person.customerAge ?? null,
          isPaid: false,
          basePriceJod,
          discountType,
          discountValue: discountType === "NONE" ? null : Number(discountValue),
          discountReason:
            discountType === "NONE"
              ? null
              : (entry.discountReason || "").trim() || null,
          discountAppliedBy: discountType === "NONE" ? null : null,
          discountAppliedAt: discountType === "NONE" ? null : now,
          finalPriceJod,
          billingPeriodKey,
          priceLockedUntil,
          durationMonths,
          periodEndsAt,
          sessionsLeft,
          sessionsUsedOverride,
          nextPaymentDate,
          planLabel,
        };
        createData.periodStartsAt = periodStartsAt;

        const row = await createPackageRegistrationCompat(
          tx.packageRegistration,
          {
            data: createData,
            include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
          },
        );

        out.push(mapRegistrationRow(row));
      }

      return out;
    });

    await findOrCreateUserFromRegistration({
      customerEmail: body.person.customerEmail ?? null,
      customerName,
      customerPhone,
    });

    await syncTrackerForRegistrationContact({
      customerName,
      customerEmail: body.person.customerEmail ?? null,
      customerPhone,
    });
    await Promise.all(
      created
        .map((row) => normalizeText(row.id))
        .filter(Boolean)
        .map((registrationId) =>
          syncRegistrationRealtimeById(registrationId, "ADMIN"),
        ),
    );

    return NextResponse.json({
      created: created.length,
      registrations: created,
    });
  } catch (error: any) {
    const code = error?.code as string | undefined;
    if (code === "P2002") {
      return jsonError(
        "Duplicate registration detected. Please refresh and try again.",
        409,
      );
    }
    return jsonError(getErrorMessage(error), 500);
  }
}

async function updatePackageRegistration(id: string, request: NextRequest) {
  const body = (await request.json()) as {
    packageName?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    status?: string;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    sessionsUsedOverride?: number | null;
    nextPaymentDate?: string | null;
    planLabel?: string | null;
    isPaid?: boolean;
    isFrozen?: boolean;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    createdBy?: string | null;
    periodStartsAt?: string | null;
    periodEndsAt?: string | null;
  };

  const existing = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!existing) return jsonError("Package registration not found", 404);

  const updateData: any = {};
  if (body.packageName !== undefined) {
    const packageName = String(body.packageName || "").trim();
    if (!packageName) return jsonError("Package is required");
    updateData.packageName = packageName;
    if (body.planLabel === undefined) {
      updateData.planLabel = packageName;
    }
  }
  if (body.customerName !== undefined) {
    const customerName = String(body.customerName || "").trim();
    if (!customerName) return jsonError("Customer name is required");
    updateData.customerName = customerName;
  }
  if (body.customerPhone !== undefined) {
    const customerPhone = String(body.customerPhone || "").trim();
    if (!customerPhone) return jsonError("Customer phone is required");
    updateData.customerPhone = customerPhone;
  }
  if (body.customerEmail !== undefined) {
    updateData.customerEmail = normalizeEmail(body.customerEmail) || null;
  }
  if (body.customerAge !== undefined) {
    if (body.customerAge == null) {
      updateData.customerAge = null;
    } else {
      const parsedAge = Number(body.customerAge);
      if (!Number.isFinite(parsedAge) || parsedAge < 0) {
        return jsonError("Customer age must be a positive number");
      }
      updateData.customerAge = Math.round(parsedAge);
    }
  }
  if (body.status !== undefined) {
    const nextStatus = String(body.status || "").trim().toUpperCase();
    if (!["ACTIVE", "EXPIRED", "CANCELLED"].includes(nextStatus)) {
      return jsonError("status must be ACTIVE, EXPIRED, or CANCELLED");
    }
    updateData.status = nextStatus;
  }
  if (body.sessionsLeft !== undefined) {
    if (body.sessionsLeft == null) {
      updateData.sessionsLeft = null;
    } else {
      const parsedSessionsLeft = Number(body.sessionsLeft);
      if (!Number.isFinite(parsedSessionsLeft) || parsedSessionsLeft < 0) {
        return jsonError("sessionsLeft must be 0 or greater");
      }
      updateData.sessionsLeft = Math.round(parsedSessionsLeft);
    }
  }
  if (body.nextPaymentDate !== undefined) {
    if (body.nextPaymentDate) {
      const nextPaymentDate = parseOptionalMembershipDate(body.nextPaymentDate);
      if (!nextPaymentDate) {
        return jsonError("Invalid next payment date");
      }
      updateData.nextPaymentDate = nextPaymentDate;
    } else {
      updateData.nextPaymentDate = null;
    }
  }
  if (body.planLabel !== undefined) {
    updateData.planLabel = normalizeText(body.planLabel) || null;
  }
  if (body.isPaid !== undefined) updateData.isPaid = Boolean(body.isPaid);

  const nextPackageName = (updateData.packageName ??
    existing.packageName) as string;
  const nextCustomerPhone = (updateData.customerPhone ??
    existing.customerPhone) as string;
  if (
    nextPackageName !== existing.packageName ||
    nextCustomerPhone !== existing.customerPhone
  ) {
    const duplicate = await prisma.packageRegistration.findFirst({
      where: {
        id: { not: id },
        packageName: nextPackageName,
        customerPhone: nextCustomerPhone,
      },
      select: { id: true },
    });
    if (duplicate) {
      return jsonError("Duplicate registration (same package + phone)", 409);
    }
  }

  const packageChanged = nextPackageName !== existing.packageName;
  const nextPackageDefaults = packageChanged
    ? await getPackageDefaults(nextPackageName)
    : null;
  if (body.durationMonths !== undefined) {
    if (body.durationMonths == null) {
      updateData.durationMonths = packageChanged
        ? nextPackageDefaults?.durationMonths ?? 1
        : existing.durationMonths;
    } else {
      const durationMonths = Number(body.durationMonths);
      if (!Number.isFinite(durationMonths) || durationMonths < 1) {
        return jsonError("durationMonths must be 1 or greater");
      }
      updateData.durationMonths = Math.round(durationMonths);
    }
  } else if (packageChanged) {
    updateData.durationMonths = nextPackageDefaults?.durationMonths ?? 1;
  }
  const nextDurationMonths = normalizeDurationMonths(
    updateData.durationMonths ?? existing.durationMonths,
    nextPackageDefaults?.durationMonths ?? 1,
  );

  if (
    body.basePriceJod !== undefined ||
    body.discountType !== undefined ||
    body.discountValue !== undefined ||
    body.discountReason !== undefined
  ) {
    const basePriceJod = Math.round(
      clampNonNegative(Number(body.basePriceJod ?? existing.basePriceJod)),
    );
    const discountType = (
      body.discountType ??
      existing.discountType ??
      "NONE"
    ).toUpperCase();
    if (!["NONE", "PERCENT", "AMOUNT"].includes(discountType)) {
      return jsonError("Invalid discount type");
    }
    const discountValue =
      discountType === "NONE"
        ? null
        : Math.round(Number(body.discountValue ?? existing.discountValue ?? 0));
    if (
      discountType !== "NONE" &&
      (discountValue == null ||
        (discountType === "PERCENT" &&
          (discountValue < 0 || discountValue > 100)) ||
        (discountType === "AMOUNT" && discountValue < 0))
    ) {
      return jsonError("Invalid discount");
    }

    if (
      discountType !== "NONE" &&
      !(body.discountReason ?? existing.discountReason ?? "").trim()
    ) {
      return jsonError("Discount reason is required when applying a discount");
    }

    updateData.basePriceJod = basePriceJod;
    updateData.discountType = discountType;
    updateData.discountValue =
      discountType === "NONE" ? null : Number(discountValue);
    updateData.discountReason =
      discountType === "NONE"
        ? null
        : (body.discountReason ?? existing.discountReason ?? "").trim() || null;
    updateData.finalPriceJod = computeFinalPriceJod(
      basePriceJod,
      discountType,
      discountValue,
    );
    if (discountType !== "NONE") {
      updateData.discountAppliedBy = body.createdBy ?? null;
      updateData.discountAppliedAt = new Date();
    }
  }

  if (body.periodStartsAt !== undefined) {
    if (body.periodStartsAt) {
      const periodStartsAt = new Date(body.periodStartsAt);
      if (Number.isNaN(periodStartsAt.getTime())) {
        return jsonError("Invalid period start date");
      }
      updateData.periodStartsAt = periodStartsAt;
      if (body.periodEndsAt === undefined) {
        updateData.periodEndsAt = computeCyclePeriodEnd(
          periodStartsAt,
          nextDurationMonths,
        );
      }
      if (body.nextPaymentDate === undefined) {
        updateData.nextPaymentDate = computeCyclePeriodEnd(
          periodStartsAt,
          nextDurationMonths,
        );
      }
    } else {
      updateData.periodStartsAt = null;
    }
  }
  if (body.periodEndsAt !== undefined) {
    if (body.periodEndsAt) {
      const periodEndsAt = new Date(body.periodEndsAt);
      if (Number.isNaN(periodEndsAt.getTime())) {
        return jsonError("Invalid period end date");
      }
      updateData.periodEndsAt = periodEndsAt;
    } else {
      updateData.periodEndsAt = null;
    }
  }

  if (
    (packageChanged || body.durationMonths !== undefined) &&
    body.periodStartsAt === undefined &&
    body.periodEndsAt === undefined
  ) {
    const cycleAnchor = getCycleAnchorDate({
      periodStartsAt: existing.periodStartsAt,
      createdAt: existing.createdAt,
    });
    updateData.periodEndsAt = computeCyclePeriodEnd(
      cycleAnchor,
      nextDurationMonths,
    );
  }
  if (
    (packageChanged || body.durationMonths !== undefined) &&
    body.nextPaymentDate === undefined &&
    updateData.periodEndsAt instanceof Date
  ) {
    updateData.nextPaymentDate = updateData.periodEndsAt;
  }
  if (body.sessionsUsedOverride !== undefined) {
    if (body.sessionsUsedOverride == null) {
      updateData.sessionsUsedOverride = null;
    } else {
      const parsedSessionsUsed = Number(body.sessionsUsedOverride);
      if (!Number.isFinite(parsedSessionsUsed) || parsedSessionsUsed < 0) {
        return jsonError("Classes finished must be 0 or greater");
      }
      updateData.sessionsUsedOverride = Math.round(parsedSessionsUsed);
    }
  }

  const validationStart =
    updateData.periodStartsAt instanceof Date
      ? updateData.periodStartsAt
      : existing.periodStartsAt
        ? new Date(existing.periodStartsAt)
        : null;
  const validationEnd =
    updateData.periodEndsAt instanceof Date
      ? updateData.periodEndsAt
      : existing.periodEndsAt
        ? new Date(existing.periodEndsAt)
        : null;
  if (
    validationStart &&
    validationEnd &&
    validationEnd.getTime() < validationStart.getTime()
  ) {
    return jsonError("periodEndsAt must be after periodStartsAt");
  }

  if (body.isFrozen !== undefined) {
    updateData.isFrozen = Boolean(body.isFrozen);
    if (body.isFrozen) {
      updateData.frozenAt = new Date();
    } else {
      if (existing.frozenAt) {
        const now = new Date();
        const frozenMs = now.getTime() - existing.frozenAt.getTime();
        const currentEndBase =
          updateData.periodEndsAt instanceof Date
            ? updateData.periodEndsAt
            : existing.periodEndsAt
              ? new Date(existing.periodEndsAt)
              : computeCyclePeriodEnd(
                  getCycleAnchorDate({
                    periodStartsAt:
                      updateData.periodStartsAt instanceof Date
                        ? updateData.periodStartsAt
                        : existing.periodStartsAt,
                    createdAt: existing.createdAt,
                    fallback: now,
                  }),
                  nextDurationMonths,
                );
        const currentEnd = new Date(currentEndBase);
        updateData.periodEndsAt = new Date(currentEnd.getTime() + frozenMs);
      }
      updateData.frozenAt = null;
    }
  }

  const row = await updatePackageRegistrationCompat({
    where: { id },
    data: updateData,
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail ?? null,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  await syncTrackerForRegistrationContact({
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? null,
    customerPhone: row.customerPhone,
  });
  await syncRegistrationRealtimeById(row.id, "ADMIN");

  const [serialized] = await serializeRegistrationRows([row]);
  return NextResponse.json(serialized);
}

async function reregisterPackage(id: string) {
  const existing = (await prisma.packageRegistration.findUnique({
    where: { id },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  })) as any;
  if (!existing) return jsonError("Registration not found", 404);

  const profile = await ensureRegistrationProfile(prisma, {
    registrationId: existing.id,
    customerName: existing.customerName,
    customerAge: existing.customerAge ?? null,
    customerPhone: existing.customerPhone ?? null,
    customerEmail: existing.customerEmail ?? null,
  });
  const summaries = await buildRegistrationMembershipSummaries(prisma, [
    existing,
  ]);
  const summary = summaries[0];

  await addRegistrationRenewalHistory(prisma, {
    registrationId: existing.id,
    playerCode: profile.playerCode,
    cycleNumber: profile.currentCycle,
    action: "REREGISTERED",
    snapshot: {
      packageName: existing.packageName,
      customerName: existing.customerName,
      durationMonths: existing.durationMonths,
      periodStartsAt: existing.periodStartsAt,
      periodEndsAt: existing.periodEndsAt,
      nextPaymentDate: existing.nextPaymentDate,
      finalPriceJod: existing.finalPriceJod,
      collectedJod: summary?.collectedJod ?? 0,
      remainingJod: summary?.remainingJod ?? 0,
      paymentStatus: summary?.paymentStatus ?? "UNPAID",
      isPaid: existing.isPaid,
      sessionsLeft: existing.sessionsLeft,
      sessionsUsedOverride: existing.sessionsUsedOverride,
      sessionsBonus: existing.sessionsBonus,
      isFrozen: existing.isFrozen,
    },
  });

  const now = new Date();
  const periodStartsAt = now;
  const packageDefaults = await getPackageDefaults(existing.packageName);
  const durationMonths = packageDefaults.durationMonths;
  const periodEndsAt = computeCyclePeriodEnd(now, durationMonths);
  const sessionsLeft =
    existing.sessionsLeft ?? packageDefaults.defaultSessionsLeft;
  const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(now);

  const row = await updatePackageRegistrationCompat({
    where: { id },
    data: {
      isPaid: false,
      billingPeriodKey,
      priceLockedUntil,
      durationMonths,
      periodStartsAt,
      periodEndsAt,
      nextPaymentDate: computeCyclePeriodEnd(now, durationMonths),
      sessionsLeft,
      sessionsUsedOverride: null,
      sessionsBonus: 0,
      isFrozen: false,
      frozenAt: null,
      status: "ACTIVE",
      planLabel: existing.packageName,
    },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });

  await updateRegistrationCurrentCycle(prisma, id, profile.currentCycle + 1);

  await findOrCreateUserFromRegistration({
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
  });

  await syncTrackerForRegistrationContact({
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
  });
  await syncRegistrationRealtimeById(row.id, "ADMIN");

  const [serialized] = await serializeRegistrationRows([row]);
  return NextResponse.json(serialized);
}

async function markRegistrationPaid(id: string, request: NextRequest) {
  const body = (await request.json()) as {
    amountPaid: number;
    paymentMethod: string;
    privateNote: string;
    paymentPeriodKey?: string | null;
    createdBy?: string;
  };

  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);
  if (!(body.privateNote || "").trim())
    return jsonError("Private note is required");
  const paymentPeriodKey = body.paymentPeriodKey
    ? normalizePaymentPeriodKey(body.paymentPeriodKey)
    : paymentPeriodKeyFromDate(
        registration.periodStartsAt ?? registration.createdAt,
      );
  if (!paymentPeriodKey) return jsonError("Invalid paid for month");

  await ensureRegistrationProfile(prisma, {
    registrationId: registration.id,
    customerName: registration.customerName,
    customerAge: registration.customerAge ?? null,
    customerPhone: registration.customerPhone ?? null,
    customerEmail: registration.customerEmail ?? null,
  });

  const method = (body.paymentMethod || "CASH").toUpperCase();
  if (!["CASH", "CARD", "TRANSFER", "OTHER"].includes(method))
    return jsonError("Invalid payment method");
  const targetPrice = Math.max(
    0,
    Math.round(Number(registration.finalPriceJod || 0)),
  );
  const amountPaid = Math.round(Number(body.amountPaid) || 0);
  if (targetPrice > 0 && amountPaid <= 0) {
    return jsonError("Amount paid must be greater than 0");
  }
  if (targetPrice <= 0 && amountPaid < 0) {
    return jsonError("Amount paid cannot be negative");
  }

  const user = await findOrCreateUserFromRegistration(registration);

  let receipt = null as any;
  for (let i = 0; i < 3; i += 1) {
    const receiptId = await generateReceiptId();
    try {
      receipt = await prisma.receipt.create({
        data: {
          receiptId,
          registrationId: id,
          personName: registration.customerName,
          personPhone: registration.customerPhone,
          packageName: registration.packageName,
          paymentPeriodKey,
          amountPaid,
          paymentMethod: method,
          privateNote: body.privateNote.trim(),
          createdBy: body.createdBy ?? null,
        },
      });
      break;
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
    }
  }

  if (!receipt) {
    return jsonError("Unable to generate receipt ID. Please retry.", 500);
  }

  if (user?.id) {
    try {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { userId: user.id },
      });
    } catch (error) {
      // Payment must succeed even if optional user-linking schema is not yet migrated.
      console.warn("[portal-db-api] receipt user linking skipped", error);
    }
  }

  await stampReceiptCycle(prisma, {
    receiptId: receipt.id,
    registrationId: id,
  });

  const totalCollected =
    (await loadCurrentCycleReceiptTotals(prisma, [id])).get(id) ?? 0;
  await prisma.packageRegistration.update({
    where: { id },
    data: { isPaid: targetPrice <= 0 || totalCollected >= targetPrice },
  });
  await syncRegistrationRealtimeById(id, "ADMIN");

  await syncTrackerForRegistrationContact({
    customerName: registration.customerName,
    customerEmail: registration.customerEmail ?? null,
    customerPhone: registration.customerPhone,
  });

  return NextResponse.json(receipt);
}

async function markRegistrationUnpaid(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    voidReason?: string;
  };
  const voidReason =
    (body.voidReason || "").trim() || "Marked as unpaid by staff";

  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);

  const activeReceiptIds = await loadCurrentCycleReceiptIds(prisma, id);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (activeReceiptIds.length > 0) {
      await tx.receipt.updateMany({
        where: { id: { in: activeReceiptIds } },
        data: {
          status: "VOIDED",
          voidedAt: now,
          voidReason,
        },
      });
    }

    await tx.packageRegistration.update({
      where: { id },
      data: { isPaid: false },
    });
  });
  await syncRegistrationRealtimeById(id, "ADMIN");

  await syncTrackerForRegistrationContact({
    customerName: registration.customerName,
    customerEmail: registration.customerEmail ?? null,
    customerPhone: registration.customerPhone,
  });

  return NextResponse.json({
    success: true,
    voidedCount: activeReceiptIds.length,
  });
}

async function listReceiptsForRegistration(id: string) {
  const receipts = await prisma.receipt.findMany({
    where: { registrationId: id, ...ACTIVE_RECEIPT_WHERE },
    orderBy: { dateTimeIssued: "desc" },
  });
  return NextResponse.json(receipts);
}

async function addSessionAdjustment(id: string, request: NextRequest) {
  const body = (await request.json()) as { reason: string; createdBy?: string };
  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);
  if (!(body.reason || "").trim()) return jsonError("Reason is required");

  const adjustment = await prisma.sessionAdjustment.create({
    data: {
      registrationId: id,
      change: 1,
      reason: body.reason.trim(),
      createdBy: body.createdBy ?? null,
    },
  });

  await stampSessionAdjustmentCycle(prisma, {
    adjustmentId: adjustment.id,
    registrationId: id,
  });

  const sessionsBonus = (Number(registration.sessionsBonus) || 0) + 1;
  await prisma.packageRegistration.update({
    where: { id },
    data: { sessionsBonus },
  });
  await syncRegistrationRealtimeById(id, "ADMIN");

  await syncTrackerForRegistrationContact({
    customerName: registration.customerName,
    customerEmail: registration.customerEmail ?? null,
    customerPhone: registration.customerPhone,
  });

  return NextResponse.json({ success: true, sessionsBonus });
}

async function listSessionAdjustments(id: string) {
  const rows = await prisma.sessionAdjustment.findMany({
    where: { registrationId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

async function addPointAdjustment(id: string, request: NextRequest) {
  const body = (await request.json()) as {
    points?: number;
    reason?: string;
    createdBy?: string | null;
  };
  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
  });
  if (!registration) return jsonError("Registration not found", 404);

  const points = Math.round(Number(body.points || 0));
  if (!Number.isFinite(points) || points <= 0) {
    return jsonError("Points must be greater than 0");
  }
  if (!(body.reason || "").trim()) return jsonError("Reason is required");

  await addRegistrationPointAdjustment(prisma, {
    registrationId: id,
    change: points,
    reason: String(body.reason || "").trim(),
    createdBy: typeof body.createdBy === "string" ? body.createdBy : null,
  });

  await syncTrackerForRegistrationContact({
    customerName: registration.customerName,
    customerEmail: registration.customerEmail ?? null,
    customerPhone: registration.customerPhone,
  });

  const relatedRegistrations = await prisma.packageRegistration.findMany({
    where: {
      OR: [
        { id },
        ...(registration.customerEmail
          ? [
              {
                customerEmail: {
                  equals: normalizeEmail(registration.customerEmail),
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
        ...(registration.customerPhone
          ? [{ customerPhone: registration.customerPhone }]
          : []),
      ],
    },
    include: { receipts: { where: ACTIVE_RECEIPT_WHERE } },
  });
  const summaries = await buildRegistrationMembershipSummaries(
    prisma,
    relatedRegistrations,
  );
  const summary = summaries.find((row) => row.id === id);

  return NextResponse.json({
    success: true,
    addedPoints: points,
    pointsBalance: summary?.pointsBalance ?? points,
  });
}

async function listPointAdjustments(id: string) {
  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!registration) return jsonError("Registration not found", 404);

  const rows = await listRegistrationPointAdjustments(prisma, id);
  return NextResponse.json(rows);
}

/**
 * Guest accounts list: Firestore `guestAccess` only (no Postgres booking rollup).
 * Point adjustments / sync still use Prisma elsewhere when staff edits guests.
 */
async function getGuestAccounts(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const normalizedSearch = normalizeText(search).toLowerCase();

  try {
    const firestore = getFirestore();
    const deletedEmails = await listDeletedGuestAccountEmails(prisma);

    type GuestDocRef = {
      snap: QueryDocumentSnapshot;
      collectionId: string;
    };

    const docs: GuestDocRef[] = [];
    for (const collectionId of guestAccessCollectionIds()) {
      try {
        const guestSnapshot = await firestore.collection(collectionId).get();
        for (const snap of guestSnapshot.docs) {
          docs.push({ snap, collectionId });
        }
      } catch (subError) {
        console.warn(
          `[portal-db-api] guest collection read failed: ${collectionId}`,
          subError,
        );
      }
    }

    type GuestMergedRow = {
      email: string;
      firestoreDocId: string | null;
      guestAccessCollection: string | null;
      name: string | null;
      bookingsCount: number;
      lastBookingAt: string | null;
      lastCourt: string | null;
      rewardPoints: number;
      manualPoints: number;
      totalPoints: number;
      linkedPlayersCount: number;
      parentUid: string | null;
      hasGuestAccess: boolean;
    };

    docs.sort((a, b) => {
      const aCanon = isValidGuestEmail(a.snap.id) ? 0 : 1;
      const bCanon = isValidGuestEmail(b.snap.id) ? 0 : 1;
      if (aCanon !== bCanon) return aCanon - bCanon;
      const c = a.collectionId.localeCompare(b.collectionId);
      if (c !== 0) return c;
      return a.snap.id.localeCompare(b.snap.id);
    });

    const responseRows: GuestMergedRow[] = [];

    for (const { snap, collectionId } of docs) {
      const guestDoc = (snap.data() as Record<string, unknown>) ?? {};
      const docId = snap.id;
      const contactEmail = resolveGuestContactEmail(docId, guestDoc);
      if (contactEmail && deletedEmails.has(contactEmail)) continue;

      const name = guestDocDisplayName(guestDoc);
      const playerIds = Array.isArray(guestDoc.playerIds)
        ? guestDoc.playerIds
            .map((entry) => normalizeText(entry))
            .filter(Boolean)
        : Array.isArray(guestDoc.players)
          ? guestDoc.players
              .map((entry) =>
                entry && typeof entry === "object"
                  ? normalizeText((entry as Record<string, unknown>).id)
                  : "",
              )
              .filter(Boolean)
          : [];
      const rewardPoints = clampNonNegative(
        Number(guestDoc.bookingPointsBalance ?? guestDoc.rewardPoints ?? 0),
      );
      const manualPoints = Math.round(
        Number(guestDoc.manualPointsBalance ?? 0),
      );
      const totalPoints = clampNonNegative(
        Number(guestDoc.pointsBalance ?? rewardPoints + manualPoints),
      );

      const fbLastAt =
        parseFirestoreDateValue(guestDoc.updatedAt)?.toISOString() ?? null;

      responseRows.push({
        email: contactEmail || docId,
        firestoreDocId: docId,
        guestAccessCollection: collectionId,
        name,
        bookingsCount: 0,
        lastBookingAt: fbLastAt,
        lastCourt: null,
        rewardPoints,
        manualPoints,
        totalPoints,
        linkedPlayersCount: playerIds.length,
        parentUid: normalizeText(guestDoc.parentUid) || null,
        hasGuestAccess: true,
      });
    }

    const filtered = responseRows
      .filter((row) => {
        if (!normalizedSearch) return true;
        const emailHaystack =
          `${row.email} ${row.firestoreDocId || ""} ${row.guestAccessCollection || ""}`.toLowerCase();
        return (
          emailHaystack.includes(normalizedSearch) ||
          (row.name || "").toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        const aTime = a.lastBookingAt ? new Date(a.lastBookingAt).getTime() : 0;
        const bTime = b.lastBookingAt ? new Date(b.lastBookingAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        const aKey = `${a.guestAccessCollection || ""}:${a.firestoreDocId || ""}:${a.email}`;
        const bKey = `${b.guestAccessCollection || ""}:${b.firestoreDocId || ""}:${b.email}`;
        return aKey.localeCompare(bKey);
      });

    return NextResponse.json(filtered);
  } catch (error) {
    console.warn(
      "[portal-db-api] guest account firebase-only list failed",
      error,
    );
    return NextResponse.json([]);
  }
}

async function removeGuestAccount(id: string) {
  const raw = decodeURIComponent(id || "").trim();
  if (!raw) return jsonError("Guest id is required");

  const firestore = getFirestore();
  const allowedCollections = new Set(guestAccessCollectionIds());

  const tryDeleteGuestAccessDoc = async (
    collectionId: string,
    docKey: string,
  ): Promise<boolean> => {
    if (!allowedCollections.has(collectionId)) return false;
    const ref = firestore.collection(collectionId).doc(docKey);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  };

  const { collectionId: parsedCollection, docId: parsedDocId } =
    parseGuestAccessDeleteTarget(raw);
  const explicitCollection =
    raw.includes("::") && allowedCollections.has(parsedCollection);

  try {
    if (explicitCollection) {
      if (await tryDeleteGuestAccessDoc(parsedCollection, parsedDocId)) {
        if (isValidGuestEmail(parsedDocId)) {
          await markGuestAccountDeleted(prisma, normalizeEmail(parsedDocId));
        }
        return NextResponse.json({ success: true });
      }
    } else {
      for (const cid of guestAccessCollectionIds()) {
        if (await tryDeleteGuestAccessDoc(cid, parsedDocId)) {
          if (isValidGuestEmail(parsedDocId)) {
            await markGuestAccountDeleted(prisma, normalizeEmail(parsedDocId));
          }
          return NextResponse.json({ success: true });
        }
      }

      const normalizedKey = normalizeEmail(parsedDocId);
      if (normalizedKey !== parsedDocId) {
        for (const cid of guestAccessCollectionIds()) {
          if (await tryDeleteGuestAccessDoc(cid, normalizedKey)) {
            await markGuestAccountDeleted(prisma, normalizedKey);
            return NextResponse.json({ success: true });
          }
        }
      }
    }
  } catch (error) {
    console.warn("[portal-db-api] guest access delete skipped", error);
  }

  // No guestAccess document (e.g. bookings-only guest): hide from portal via deletion ledger.
  if (isValidGuestEmail(parsedDocId)) {
    await markGuestAccountDeleted(prisma, normalizeEmail(parsedDocId));
  }

  return NextResponse.json({ success: true });
}

async function getGuestPointHistory(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return jsonError("Guest email is required");
  const rows = await listGuestPointAdjustments(prisma, normalizedEmail);
  return NextResponse.json(rows);
}

async function addGuestPoints(email: string, request: NextRequest) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return jsonError("Guest email is required");

  const body = (await request.json().catch(() => ({}))) as {
    points?: number;
    reason?: string;
    createdBy?: string | null;
    customerName?: string | null;
  };

  const points = Math.round(Number(body.points || 0));
  const reason = String(body.reason || "").trim();
  if (!Number.isFinite(points) || points === 0) {
    return jsonError("Points change must be a non-zero number");
  }
  if (!reason) return jsonError("Reason is required");

  await addGuestPointAdjustment(prisma, {
    customerEmail: normalizedEmail,
    change: points,
    reason,
    createdBy: typeof body.createdBy === "string" ? body.createdBy : null,
  });

  await syncTrackerForRegistrationContact({
    customerName: normalizeText(body.customerName) || normalizedEmail,
    customerEmail: normalizedEmail,
    customerPhone: null,
  });
  await syncGuestAccessForEmail({
    customerEmail: normalizedEmail,
    customerName: body.customerName ?? null,
  });

  const totals = (
    await loadGuestTotalPointsByEmail(prisma, [normalizedEmail])
  ).get(normalizedEmail) ?? {
    rewardPoints: 0,
    manualPoints: 0,
    totalPoints: 0,
  };

  return NextResponse.json({
    success: true,
    totalPoints: totals.totalPoints,
    rewardPoints: totals.rewardPoints,
    manualPoints: totals.manualPoints,
  });
}

async function getRegistrationHistory(id: string) {
  const registration = await prisma.packageRegistration.findUnique({
    where: { id },
    select: {
      id: true,
      customerName: true,
      customerAge: true,
      customerPhone: true,
      customerEmail: true,
    },
  });
  if (!registration) return jsonError("Registration not found", 404);

  const profile = await ensureRegistrationProfile(prisma, {
    registrationId: registration.id,
    customerName: registration.customerName,
    customerAge: registration.customerAge ?? null,
    customerPhone: registration.customerPhone ?? null,
    customerEmail: registration.customerEmail ?? null,
  });

  const history = await listRegistrationRenewalHistory(prisma, id);
  return NextResponse.json({
    playerCode: profile.playerCode,
    currentCycle: profile.currentCycle,
    history,
  });
}

async function getReceipt(id: string) {
  let receipt: any = null;
  try {
    receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        registration: true,
        user: { select: { id: true, email: true, name: true, isActive: true } },
      },
    });
  } catch (error) {
    console.warn(
      "[portal-db-api] receipt user relation unavailable, retrying without user include",
      error,
    );
    receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { registration: true },
    });
  }
  if (!receipt) return jsonError("Receipt not found", 404);
  return NextResponse.json(receipt);
}

async function voidReceipt(id: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    voidReason?: string;
  };
  const reason = (body.voidReason || "").trim();
  if (!reason)
    return jsonError("voidReason is required when voiding a receipt");

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { registration: true },
  });
  if (!receipt) return jsonError("Receipt not found", 404);
  if (receipt.voidedAt || receipt.status === "VOIDED")
    return jsonError("Receipt is already voided");

  await prisma.receipt.update({
    where: { id },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
  });

  const totalCollected =
    (await loadCurrentCycleReceiptTotals(prisma, [receipt.registrationId])).get(
      receipt.registrationId,
    ) ?? 0;
  const targetPrice = Math.max(
    0,
    Math.round(Number(receipt.registration.finalPriceJod || 0)),
  );
  const hasActiveReceipt =
    targetPrice <= 0
      ? (await prisma.receipt.count({
          where: {
            registrationId: receipt.registrationId,
            ...ACTIVE_RECEIPT_WHERE,
          },
        })) > 0
      : false;

  await prisma.packageRegistration.update({
    where: { id: receipt.registrationId },
    data: {
      isPaid:
        targetPrice <= 0 ? hasActiveReceipt : totalCollected >= targetPrice,
    },
  });
  await syncRegistrationRealtimeById(receipt.registrationId, "ADMIN");

  await syncTrackerForRegistrationContact({
    customerName: receipt.registration.customerName,
    customerEmail: receipt.registration.customerEmail ?? null,
    customerPhone: receipt.registration.customerPhone,
  });

  return NextResponse.json({ success: true });
}

function parseOverviewDateRange(request: NextRequest): {
  start: Date;
  end: Date;
} {
  const view = (
    request.nextUrl.searchParams.get("view") || "week"
  ).toLowerCase();
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  if (startDate && endDate) {
    const s = parseDate(startDate);
    const e = parseDate(endDate);
    if (s && e) return { start: toDayStart(s), end: toDayEnd(e) };
  }

  const now = new Date();
  if (view === "day") return { start: toDayStart(now), end: toDayEnd(now) };
  if (view === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toDayStart(start), end: toDayEnd(end) };
  }
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDayStart(start), end: toDayEnd(end) };
}

function bookingCustomerDisplayName(row: {
  customerName?: string | null;
  member?: { firstName: string; lastName: string } | null;
}): string {
  if (row.customerName && row.customerName.trim())
    return row.customerName.trim();
  if (row.member)
    return `${row.member.firstName} ${row.member.lastName}`.trim();
  return "Unknown customer";
}

function bookingDateFitsRange(
  row: { startTime: Date; endTime: Date },
  start: Date,
  end: Date,
): boolean {
  return (
    row.startTime.getTime() <= end.getTime() &&
    row.endTime.getTime() >= start.getTime()
  );
}

function compareByDateDesc(
  a: { createdAt: string },
  b: { createdAt: string },
): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

async function getBookingCourtRates() {
  const [map, rewardPoints] = await Promise.all([
    getEffectiveCourtRates(),
    getEffectiveCourtRewardPoints(),
  ]);
  const rows = Object.entries(map)
    .map(([name, hourlyRate]) => ({
      name,
      hourlyRate,
      rewardPointsPerHour: getCourtRewardPoints(name, rewardPoints),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  await syncBookingRealtimeCourts(map, rewardPoints);
  return NextResponse.json(rows);
}

async function updateBookingCourtRates(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    rates?: Array<{
      name?: string;
      hourlyRate?: number;
      rewardPointsPerHour?: number;
    }>;
    createdByAdminId?: string | null;
  };
  const rates = Array.isArray(body.rates) ? body.rates : [];
  if (!rates.length) return jsonError("rates array is required");

  await ensureBookingInfrastructure();
  const existingRewardPoints = await getEffectiveCourtRewardPoints();
  for (const item of rates) {
    const courtName = String(item?.name || "").trim();
    const hourlyRate = Math.round(Number(item?.hourlyRate || 0));
    const rewardPointsPerHour =
      item?.rewardPointsPerHour !== undefined
        ? Math.max(0, Math.round(Number(item?.rewardPointsPerHour || 0)))
        : getCourtRewardPoints(courtName, existingRewardPoints);
    if (!courtName) return jsonError("Court name is required");
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      return jsonError(
        `Hourly rate must be greater than 0 for court: ${courtName}`,
      );
    }
    if (!Number.isFinite(rewardPointsPerHour) || rewardPointsPerHour < 0) {
      return jsonError(
        `Reward points per hour cannot be negative for court: ${courtName}`,
      );
    }
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "CourtRate" ("courtType", "hourlyRate", "rewardPointsPerHour", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT ("courtType")
        DO UPDATE SET
          "hourlyRate" = EXCLUDED."hourlyRate",
          "rewardPointsPerHour" = EXCLUDED."rewardPointsPerHour",
          "updatedAt" = NOW()
      `,
      courtName,
      hourlyRate,
      rewardPointsPerHour,
    );
  }

  await addBookingAuditLog({
    action: "COURT_RATES_UPDATED",
    payload: {
      rates: rates.map((row) => ({
        name: String(row?.name || "").trim(),
        hourlyRate: Math.round(Number(row?.hourlyRate || 0)),
        rewardPointsPerHour: Math.max(
          0,
          Math.round(Number(row?.rewardPointsPerHour || 0)),
        ),
      })),
    },
    createdByAdminId:
      typeof body.createdByAdminId === "string" ? body.createdByAdminId : null,
  });

  await syncBookingRealtimeCourts();
  return getBookingCourtRates();
}

async function getBookingOverview(request: NextRequest) {
  await importPendingMobileBookingsFromFirestore();
  const [courtRates, rewardPoints] = await Promise.all([
    getEffectiveCourtRates(),
    getEffectiveCourtRewardPoints(),
  ]);
  const { start, end } = parseOverviewDateRange(request);
  const companyId = request.nextUrl.searchParams.get("companyId") || undefined;
  const court = (request.nextUrl.searchParams.get("court") || "").trim();
  const labelFilter = (request.nextUrl.searchParams.get("label") || "").trim();
  const bookingStatus = (
    request.nextUrl.searchParams.get("bookingStatus") || ""
  )
    .trim()
    .toUpperCase();
  const paymentStatusFilter = (
    request.nextUrl.searchParams.get("paymentStatus") || ""
  )
    .trim()
    .toUpperCase();
  const paymentMethodFilter = normalizePaymentMethod(
    request.nextUrl.searchParams.get("paymentMethod") || undefined,
  );
  const sourceFilter = normalizeSource(
    request.nextUrl.searchParams.get("source") || undefined,
  );
  const search = (request.nextUrl.searchParams.get("search") || "")
    .trim()
    .toLowerCase();

  const bookingWhere: any = {
    startTime: { lte: end },
    endTime: { gte: start },
  };
  if (companyId) bookingWhere.companyId = companyId;
  if (court && court !== "ALL") bookingWhere.facilityArea = court;
  if (bookingStatus && bookingStatus !== "ALL") {
    if (bookingStatus === "NO_SHOW") bookingWhere.status = "CANCELLED";
    else bookingWhere.status = bookingStatus;
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true } },
      coach: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const payments = await listPaymentsForBookingIds(
    bookings.map((row) => row.id),
  );
  const paymentsByBooking = new Map<string, BookingPaymentRow[]>();
  for (const payment of payments) {
    const list = paymentsByBooking.get(payment.bookingId) || [];
    list.push(payment);
    paymentsByBooking.set(payment.bookingId, list);
  }

  let rows: BookingOverviewItem[] = bookings.map((row) => {
    const financials = computeBookingFinancials(
      {
        startTime: row.startTime,
        endTime: row.endTime,
        facilityArea: row.facilityArea,
      },
      paymentsByBooking.get(row.id) || [],
      courtRates,
    );
    return {
      id: row.id,
      companyId: row.companyId,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      facilityArea: row.facilityArea ?? null,
      status: String(row.status || "PENDING"),
      customerName: row.customerName ?? null,
      customerPhone: row.customerPhone ?? null,
      customerEmail: row.customerEmail ?? null,
      notes: row.notes ?? null,
      source: inferBookingSource(row.notes),
      member: row.member
        ? {
            id: row.member.id,
            firstName: row.member.firstName,
            lastName: row.member.lastName,
          }
        : null,
      class: row.class ? { id: row.class.id, name: row.class.name } : null,
      coach: row.coach
        ? {
            id: row.coach.id,
            firstName: row.coach.firstName,
            lastName: row.coach.lastName,
          }
        : null,
      financials,
    };
  });

  if (bookingStatus === "NO_SHOW") {
    rows = rows.filter((row) =>
      String(row.notes || "")
        .toUpperCase()
        .includes("[NO_SHOW]"),
    );
  }

  if (paymentStatusFilter && paymentStatusFilter !== "ALL") {
    rows = rows.filter(
      (row) => row.financials.paymentStatus === paymentStatusFilter,
    );
  }
  if (
    paymentMethodFilter &&
    paymentMethodFilter !== "OTHER" &&
    request.nextUrl.searchParams.get("paymentMethod")
  ) {
    rows = rows.filter(
      (row) => row.financials.latestPaymentMethod === paymentMethodFilter,
    );
  }
  if (sourceFilter) {
    rows = rows.filter((row) => row.source === sourceFilter);
  }
  if (search) {
    rows = rows.filter((row) => {
      const bookingId = row.id.toLowerCase();
      const name = bookingCustomerDisplayName(row).toLowerCase();
      const phone = String(row.customerPhone || "").toLowerCase();
      return (
        bookingId.includes(search) ||
        name.includes(search) ||
        phone.includes(search)
      );
    });
  }

  const rowIds = new Set(rows.map((row) => row.id));
  const filteredPayments = payments.filter((row) => rowIds.has(row.bookingId));

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      ...(court && court !== "ALL" ? { courtType: court } : {}),
      ...(labelFilter && labelFilter !== "ALL"
        ? { label: { contains: labelFilter, mode: "insensitive" } }
        : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
  });

  await ensureBookingInfrastructure();
  const exceptionRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "courtType", "date", "openTime", "closeTime", "isClosed", "reason"
      FROM "AvailabilityException"
      WHERE "date" BETWEEN $1::date AND $2::date
      ${court && court !== "ALL" ? `AND "courtType" = $3` : ""}
      ORDER BY "date" ASC
    `,
    ...(court && court !== "ALL"
      ? [toIsoDate(start), toIsoDate(end), court]
      : [toIsoDate(start), toIsoDate(end)]),
  )) as Array<{
    id: string;
    courtType: string;
    date: Date | string;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
    reason: string | null;
  }>;

  const calendarEvents: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const payStatus = row.financials.paymentStatus;
    calendarEvents.push({
      id: `booking-${row.id}`,
      type: "BOOKING",
      bookingId: row.id,
      title: bookingCustomerDisplayName(row),
      court: row.facilityArea,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      paymentStatus: payStatus,
      color:
        row.status === "CANCELLED"
          ? "red"
          : payStatus === "PAID"
            ? "green"
            : "blue",
    });
  }

  const dayMap = new Map<string, number>([
    ["SUNDAY", 0],
    ["MONDAY", 1],
    ["TUESDAY", 2],
    ["WEDNESDAY", 3],
    ["THURSDAY", 4],
    ["FRIDAY", 5],
    ["SATURDAY", 6],
  ]);
  for (const block of blockedSlots) {
    const targetDow = dayMap.get(String(block.dayOfWeek).toUpperCase());
    if (targetDow == null) continue;
    for (
      let d = new Date(start);
      d.getTime() <= end.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      if (d.getDay() !== targetDow) continue;
      if (!isBlockedSlotActiveForRange(block, d, d)) continue;
      const [h, m] = String(block.time || "00:00")
        .split(":")
        .map((x) => Number(x));
      const eventStart = new Date(d);
      eventStart.setHours(
        Number.isFinite(h) ? h : 0,
        Number.isFinite(m) ? m : 0,
        0,
        0,
      );
      const eventEnd = new Date(eventStart);
      eventEnd.setHours(eventStart.getHours() + 1, 0, 0, 0);
      const looksMaintenance =
        String(block.label || "")
          .toLowerCase()
          .includes("maintenance") ||
        String(block.label || "")
          .toLowerCase()
          .includes("exception");
      calendarEvents.push({
        id: `block-${block.id}-${eventStart.toISOString()}`,
        type: looksMaintenance ? "MAINTENANCE" : "RECURRING_BLOCK",
        blockId: block.id,
        title: block.label || "Recurring block",
        court: block.courtType,
        startTime: eventStart.toISOString(),
        endTime: eventEnd.toISOString(),
        status: block.isBlocked ? "BLOCKED" : "FREE",
        color: looksMaintenance ? "orange" : "gray",
      });
    }
  }

  for (const ex of exceptionRows) {
    const dayDate = new Date(ex.date);
    const eventStart = new Date(dayDate);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = new Date(dayDate);
    eventEnd.setHours(23, 59, 59, 999);
    calendarEvents.push({
      id: `exception-${ex.id}`,
      type: "EXCEPTION",
      title:
        ex.reason || (ex.isClosed ? "Court closed" : "Availability exception"),
      court: ex.courtType,
      startTime: eventStart.toISOString(),
      endTime: eventEnd.toISOString(),
      status: ex.isClosed ? "CLOSED" : "LIMITED",
      openTime: ex.openTime,
      closeTime: ex.closeTime,
      color: "orange",
    });
  }

  const workingRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "courtType", "dayOfWeek", "openTime", "closeTime", "isClosed"
      FROM "WorkingHours"
    `,
  )) as Array<{
    courtType: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  const workingMap = new Map<
    string,
    { openTime: string; closeTime: string; isClosed: boolean }
  >();
  for (const row of workingRows) {
    workingMap.set(`${row.courtType}::${row.dayOfWeek}`, {
      openTime: row.openTime,
      closeTime: row.closeTime,
      isClosed: !!row.isClosed,
    });
  }
  const exceptionMap = new Map<string, (typeof exceptionRows)[number]>();
  for (const row of exceptionRows) {
    const key = `${row.courtType}::${toIsoDate(new Date(row.date))}`;
    exceptionMap.set(key, row);
  }
  const knownCourts = Array.from(
    new Set([
      ...DEFAULT_BOOKING_COURTS,
      ...rows
        .map((row) => String(row.facilityArea || "").trim())
        .filter(Boolean),
      ...blockedSlots
        .map((row) => String(row.courtType || "").trim())
        .filter(Boolean),
      ...workingRows
        .map((row) => String(row.courtType || "").trim())
        .filter(Boolean),
      ...exceptionRows
        .map((row) => String(row.courtType || "").trim())
        .filter(Boolean),
      ...Object.keys(courtRates),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const selectedCourts = court && court !== "ALL" ? [court] : knownCourts;
  let availableHours = 0;
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = toIsoDate(d);
    const dow = d.getDay();
    for (const courtName of selectedCourts) {
      const exception = exceptionMap.get(`${courtName}::${dateKey}`);
      if (exception?.isClosed) continue;
      let openTime = "07:00";
      let closeTime = "23:59";
      const working = workingMap.get(`${courtName}::${dow}`);
      if (working?.isClosed) continue;
      if (working) {
        openTime = working.openTime || openTime;
        closeTime = working.closeTime || closeTime;
      }
      if (
        exception &&
        !exception.isClosed &&
        exception.openTime &&
        exception.closeTime
      ) {
        openTime = exception.openTime;
        closeTime = exception.closeTime;
      }
      const open = parseClockToMinutes(openTime);
      const close = parseClockToMinutes(closeTime);
      if (open == null || close == null) continue;
      const diff = (close > open ? close : 24 * 60) - open;
      availableHours += diff > 0 ? diff / 60 : 0;
    }
  }
  const bookedHours = rows
    .filter((row) => row.status !== "CANCELLED")
    .reduce((sum, row) => sum + row.financials.totalHours, 0);

  const grossPaid = rows.reduce(
    (sum, row) => sum + row.financials.paidAmount,
    0,
  );
  const refundsTotal = rows.reduce(
    (sum, row) => sum + row.financials.refundAmount,
    0,
  );
  const collectedTotal = rows.reduce(
    (sum, row) => sum + row.financials.netPaid,
    0,
  );
  const pendingTotal = rows.reduce(
    (sum, row) => sum + row.financials.remainingAmount,
    0,
  );
  const utilization =
    availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;

  const paymentsByMethod = filteredPayments.reduce(
    (acc, row) => {
      const method = row.method;
      if (!acc[method]) acc[method] = { paid: 0, refunded: 0, net: 0 };
      if (row.status === "REFUNDED") {
        acc[method].refunded += row.amount;
        acc[method].net -= row.amount;
      } else {
        acc[method].paid += row.amount;
        acc[method].net += row.amount;
      }
      return acc;
    },
    {} as Record<string, { paid: number; refunded: number; net: number }>,
  );

  const paymentRows = filteredPayments
    .map((row) => {
      const booking = rows.find((item) => item.id === row.bookingId);
      return {
        ...row,
        bookingStartTime: booking?.startTime ?? null,
        court: booking?.facilityArea ?? null,
        customerName: booking ? bookingCustomerDisplayName(booking) : null,
      };
    })
    .sort(compareByDateDesc);

  await syncBookingRealtimeCourts(courtRates, rewardPoints);
  await maybeSyncAllBookingsToRealtime();

  return NextResponse.json({
    range: { start: start.toISOString(), end: end.toISOString() },
    filters: {
      companyId: companyId ?? null,
      court: court || "ALL",
      bookingStatus: bookingStatus || "ALL",
      paymentStatus: paymentStatusFilter || "ALL",
      source: sourceFilter || "ALL",
      search: search || "",
    },
    kpis: {
      totalCollected: collectedTotal,
      totalPending: pendingTotal,
      totalRefunds: refundsTotal,
      totalRevenue: grossPaid - refundsTotal,
      bookingsCount: rows.length,
      totalHoursBooked: bookedHours,
      utilizationPercent: Math.max(
        0,
        Math.min(100, Number(utilization.toFixed(2))),
      ),
      availableHours: Number(availableHours.toFixed(2)),
    },
    bookings: rows,
    calendarEvents,
    paymentReport: {
      byMethod: paymentsByMethod,
      rows: paymentRows,
    },
    courts: knownCourts.map((name) => ({
      name,
      hourlyRate: getCourtRate(name, courtRates),
      rewardPointsPerHour: getCourtRewardPoints(name, rewardPoints),
    })),
    labels: Array.from(
      new Set(
        blockedSlots
          .map((row) => String(row.label || "").trim())
          .filter(Boolean),
      ),
    ),
  });
}

async function getBookingPayments(bookingId: string) {
  const courtRates = await getEffectiveCourtRates();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!booking) return jsonError("Booking not found", 404);
  const payments = await listPaymentsForBookingIds([bookingId]);
  const financials = computeBookingFinancials(
    {
      startTime: booking.startTime,
      endTime: booking.endTime,
      facilityArea: booking.facilityArea,
    },
    payments,
    courtRates,
  );
  return NextResponse.json({
    booking: {
      id: booking.id,
      customerName: bookingCustomerDisplayName(booking),
      customerPhone: booking.customerPhone ?? null,
      customerEmail: booking.customerEmail ?? null,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      facilityArea: booking.facilityArea ?? null,
      status: booking.status,
    },
    payments: payments.sort(compareByDateDesc),
    financials,
  });
}

async function addBookingPayment(bookingId: string, request: NextRequest) {
  const courtRates = await getEffectiveCourtRates();
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    method?: string;
    status?: string;
    transactionRef?: string | null;
    customerId?: string | null;
    createdByAdminId?: string | null;
    note?: string | null;
  };
  const amount = Math.round(Number(body.amount || 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("amount must be greater than 0");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      facilityArea: true,
      isPaid: true,
    },
  });
  if (!booking) return jsonError("Booking not found", 404);

  const method = normalizePaymentMethod(body.method);
  const status = normalizePaymentStatus(body.status);
  await ensureBookingInfrastructure();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "BookingPayment"
      ("id", "bookingId", "customerId", "amount", "method", "status", "transactionRef", "createdByAdminId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
    crypto.randomUUID(),
    bookingId,
    body.customerId ?? null,
    amount,
    method,
    status,
    body.transactionRef ?? null,
    body.createdByAdminId ?? null,
  );

  const payments = await listPaymentsForBookingIds([bookingId]);
  const financials = computeBookingFinancials(
    {
      startTime: booking.startTime,
      endTime: booking.endTime,
      facilityArea: booking.facilityArea,
    },
    payments,
    courtRates,
  );

  await prisma.booking.update({
    where: { id: bookingId },
    data: { isPaid: financials.paymentStatus === "PAID" },
  });

  await addBookingAuditLog({
    bookingId,
    action:
      status === "REFUNDED"
        ? "BOOKING_PAYMENT_REFUNDED"
        : "BOOKING_PAYMENT_ADDED",
    payload: {
      amount,
      method,
      status,
      transactionRef: body.transactionRef ?? null,
      note: body.note ?? null,
      remainingAmount: financials.remainingAmount,
    },
    createdByAdminId: body.createdByAdminId ?? null,
  });

  await syncBookingRealtimeById(bookingId, courtRates);

  return NextResponse.json({
    success: true,
    bookingId,
    financials,
    payments: payments.sort(compareByDateDesc),
  });
}

function parseCustomerKey(value: string): {
  field: "phone" | "email" | "memberId";
  val: string;
} {
  const decoded = decodeURIComponent(value || "").trim();
  if (decoded.startsWith("email:"))
    return { field: "email", val: decoded.slice(6).trim() };
  if (decoded.startsWith("member:"))
    return { field: "memberId", val: decoded.slice(7).trim() };
  if (decoded.startsWith("phone:"))
    return { field: "phone", val: decoded.slice(6).trim() };
  if (decoded.includes("@")) return { field: "email", val: decoded };
  return { field: "phone", val: decoded };
}

async function getBookingCustomerProfile(customerKey: string) {
  const courtRates = await getEffectiveCourtRates();
  const parsed = parseCustomerKey(customerKey);
  if (!parsed.val) return jsonError("Customer key is required");

  const where: any = {};
  if (parsed.field === "phone") where.customerPhone = parsed.val;
  if (parsed.field === "email") where.customerEmail = parsed.val.toLowerCase();
  if (parsed.field === "memberId") where.memberId = parsed.val;

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
      class: { select: { id: true, name: true } },
      coach: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { startTime: "desc" },
  });
  const payments = await listPaymentsForBookingIds(
    bookings.map((row) => row.id),
  );
  const paymentsByBooking = new Map<string, BookingPaymentRow[]>();
  for (const payment of payments) {
    const list = paymentsByBooking.get(payment.bookingId) || [];
    list.push(payment);
    paymentsByBooking.set(payment.bookingId, list);
  }

  const bookingRows = bookings.map((row) => {
    const financials = computeBookingFinancials(
      {
        startTime: row.startTime,
        endTime: row.endTime,
        facilityArea: row.facilityArea,
      },
      paymentsByBooking.get(row.id) || [],
      courtRates,
    );
    return {
      id: row.id,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      facilityArea: row.facilityArea ?? null,
      status: row.status,
      customerName: bookingCustomerDisplayName(row),
      customerPhone: row.customerPhone ?? null,
      customerEmail: row.customerEmail ?? null,
      source: inferBookingSource(row.notes),
      financials,
    };
  });

  const lifetimePaid = bookingRows.reduce(
    (sum, row) => sum + row.financials.netPaid,
    0,
  );
  const lifetimeUnpaid = bookingRows.reduce(
    (sum, row) => sum + row.financials.remainingAmount,
    0,
  );
  const lifetimeRefunds = bookingRows.reduce(
    (sum, row) => sum + row.financials.refundAmount,
    0,
  );

  const paymentHistory = payments
    .map((row) => {
      const booking = bookingRows.find((item) => item.id === row.bookingId);
      return {
        ...row,
        bookingStartTime: booking?.startTime ?? null,
        court: booking?.facilityArea ?? null,
      };
    })
    .sort(compareByDateDesc);

  return NextResponse.json({
    customer: {
      key: customerKey,
      name: bookingRows[0]?.customerName ?? null,
      phone: bookingRows[0]?.customerPhone ?? null,
      email: bookingRows[0]?.customerEmail ?? null,
    },
    totals: {
      totalBookings: bookingRows.length,
      totalPaid: lifetimePaid,
      totalUnpaid: lifetimeUnpaid,
      totalRefunds: lifetimeRefunds,
    },
    bookings: bookingRows,
    paymentHistory,
  });
}

async function updateRecurringBlock(blockId: string, request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    dayOfWeek?: string;
    courtType?: string;
    time?: string;
    isBlocked?: boolean;
    label?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };

  const existing = await prisma.blockedSlot.findUnique({
    where: { id: blockId },
  });
  if (!existing) return jsonError("Recurring block not found", 404);

  const nextDay =
    body.dayOfWeek !== undefined
      ? normalizeDayOfWeek(body.dayOfWeek)
      : existing.dayOfWeek;
  if (!nextDay) return jsonError("dayOfWeek must be a valid weekday");

  const nextCourt =
    body.courtType !== undefined
      ? String(body.courtType || "").trim()
      : existing.courtType;
  if (!nextCourt) return jsonError("courtType is required");

  const nextTime =
    body.time !== undefined ? String(body.time || "").trim() : existing.time;
  if (!/^\d{2}:\d{2}$/.test(nextTime)) {
    return jsonError("time must be HH:MM");
  }

  const startDate =
    body.startDate === undefined
      ? existing.startDate
      : body.startDate
        ? parseDate(body.startDate)
        : null;
  const endDate =
    body.endDate === undefined
      ? existing.endDate
      : body.endDate
        ? parseDate(body.endDate)
        : null;

  if ((body.startDate && !startDate) || (body.endDate && !endDate)) {
    return jsonError("Invalid startDate or endDate");
  }
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return jsonError("endDate must be on or after startDate");
  }

  try {
    const row = await prisma.blockedSlot.update({
      where: { id: blockId },
      data: {
        dayOfWeek: nextDay,
        courtType: nextCourt,
        time: nextTime,
        isBlocked:
          body.isBlocked === undefined
            ? existing.isBlocked
            : Boolean(body.isBlocked),
        label:
          body.label === undefined
            ? existing.label
            : String(body.label || "").trim() || null,
        startDate,
        endDate,
      },
    });
    return NextResponse.json(row);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return jsonError(
        "A recurring block already exists for this day/court/time",
        409,
      );
    }
    return jsonError("Failed to update recurring block", 500);
  }
}

function addOneHourClock(time: string): string {
  const [hRaw, mRaw] = time.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "08:00";
  const nextHour = (h + 1) % 24;
  return `${String(nextHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function duplicateRecurringBlock(blockId: string, request: NextRequest) {
  const source = await prisma.blockedSlot.findUnique({
    where: { id: blockId },
  });
  if (!source) return jsonError("Recurring block not found", 404);

  const body = (await request.json().catch(() => ({}))) as {
    dayOfWeek?: string;
    courtType?: string;
    time?: string;
    isBlocked?: boolean;
    label?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };

  const dayOfWeek = normalizeDayOfWeek(body.dayOfWeek ?? source.dayOfWeek);
  if (!dayOfWeek) return jsonError("dayOfWeek must be a valid weekday");
  const courtType = String(body.courtType ?? source.courtType).trim();
  if (!courtType) return jsonError("courtType is required");
  const time = String(body.time ?? addOneHourClock(source.time)).trim();
  if (!/^\d{2}:\d{2}$/.test(time)) return jsonError("time must be HH:MM");

  const startDate = body.startDate
    ? parseDate(body.startDate)
    : source.startDate;
  const endDate = body.endDate ? parseDate(body.endDate) : source.endDate;
  if ((body.startDate && !startDate) || (body.endDate && !endDate)) {
    return jsonError("Invalid startDate or endDate");
  }
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return jsonError("endDate must be on or after startDate");
  }

  try {
    const row = await prisma.blockedSlot.create({
      data: {
        dayOfWeek,
        courtType,
        time,
        isBlocked:
          body.isBlocked === undefined
            ? source.isBlocked
            : Boolean(body.isBlocked),
        label:
          body.label === undefined
            ? source.label
            : String(body.label || "").trim() || null,
        startDate,
        endDate,
      },
    });
    return NextResponse.json(row);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return jsonError(
        "A recurring block already exists for this day/court/time",
        409,
      );
    }
    return jsonError("Failed to duplicate recurring block", 500);
  }
}

async function dispatchGet(request: NextRequest, params: Params) {
  const [resource, id, action, extra] = params.slug;

  if (resource === "me" && !id) {
    return getMemberMe(request);
  }

  if (resource === "me" && id === "registrations" && !action) {
    const resolved = await resolveMemberUserFromRequest(request);
    if ("error" in resolved) return resolved.error;
    return NextResponse.json(
      await listMemberRegistrationsByEmail(resolved.user.email),
    );
  }

  if (resource === "me" && id === "invoices" && !action) {
    return getMemberInvoices(request);
  }

  if (resource === "me" && id === "receipts" && action && !extra) {
    return getMemberReceipt(action, request);
  }

  if (resource === "me" && id === "receipts" && action && extra === "pdf") {
    return getMemberReceiptPdf(action, request);
  }

  if (resource === "companies" && !id) {
    const rows = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "cash-book-categories" && !id) {
    return listCashBookCategories(request);
  }

  if (resource === "cash-book-categories" && id && !action) {
    return getCashBookCategory(id);
  }

  if (resource === "cash-book-transactions" && !id) {
    return listCashBookTransactions(request);
  }

  if (resource === "cash-book-transactions" && id && !action) {
    return getCashBookTransaction(id);
  }

  if (resource === "invoices" && !id) {
    return listInvoices(request);
  }

  if (resource === "invoices" && id && !action) {
    return getInvoice(id);
  }

  if (resource === "invoices" && id && action === "pdf") {
    return getInvoicePdf(id);
  }

  if (resource === "bookings" && id === "overview") {
    return getBookingOverview(request);
  }

  if (resource === "bookings" && id === "court-rates" && !action) {
    return getBookingCourtRates();
  }

  if (
    resource === "bookings" &&
    id === "customers" &&
    action &&
    extra === "profile"
  ) {
    await importPendingMobileBookingsFromFirestore();
    return getBookingCustomerProfile(action);
  }

  if (resource === "bookings" && id && action === "payments") {
    await importPendingMobileBookingsFromFirestore();
    return getBookingPayments(id);
  }

  if (resource === "bookings" && !id) {
    await importPendingMobileBookingsFromFirestore();
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    const where: any = {};
    if (companyId) where.companyId = companyId;

    if (startDate && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (start && end) {
        where.startTime = { gte: start, lte: end };
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
        facility: { select: { id: true, name: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: "asc" },
    });

    await maybeSyncAllBookingsToRealtime();
    return NextResponse.json(bookings);
  }

  if (resource === "bookings" && id) {
    await importPendingMobileBookingsFromFirestore();
    const row = await prisma.booking.findUnique({
      where: { id },
      include: {
        company: true,
        program: true,
        facility: true,
        member: true,
        class: true,
        coach: true,
      },
    });
    if (!row) return jsonError("Booking not found", 404);
    await syncBookingRealtimeById(id);
    return NextResponse.json(row);
  }

  if (resource === "members" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const rows = await prisma.member.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        subscriptions: true,
        bookings: true,
        enrollments: { include: { class: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "classes" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const coachId = request.nextUrl.searchParams.get("coachId") || undefined;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (coachId) where.coachId = coachId;

    const rows = await prisma.class.findMany({
      where,
      include: {
        coach: true,
        company: true,
        enrollments: {
          include: { member: true },
        },
      },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "coaches" && !id) {
    const companyId =
      request.nextUrl.searchParams.get("companyId") || undefined;
    const rows = await prisma.coach.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        classes: true,
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  // Landing coaches shared with Admin (/api/admin/coaches)
  if (resource === "landing-coaches" && !id) {
    const rows = await prisma.landingCoach.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(rows);
  }

  if (resource === "shop-items" && !id) {
    return listShopItems(request);
  }

  if (resource === "shop-items" && id) {
    const row = await loadShopItemById(id);
    if (!row) return jsonError("Shop item not found", 404);
    return NextResponse.json(serializeShopItemRow(row));
  }

  if (resource === "guest-accounts" && !id) {
    return getGuestAccounts(request);
  }

  if (resource === "guest-accounts" && id && action === "point-adjustments") {
    return getGuestPointHistory(id);
  }

  if (resource === "dashboard" && id === "stats") {
    return getDashboardStats(request);
  }

  if (resource === "package-pricing" && !id) {
    const rows = await prisma.packagePricing.findMany({
      orderBy: { packageName: "asc" },
    });
    return NextResponse.json(
      rows.map((row) => ({
        packageName: row.packageName,
        basePriceJod: row.basePriceJod ?? null,
      })),
    );
  }

  if (resource === "packages" && !id) {
    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive") === "1";
    const rows = await prisma.package.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        sportType: true,
        name: true,
        description: true,
        durationMonths: true,
        sessionsCount: true,
        trackingType: true,
        pricingType: true,
        currentPriceJod: true,
        isActive: true,
        showOnWebsite: true,
        sortOrder: true,
      },
    });
    return NextResponse.json(rows);
  }

  if (resource === "competition-registrations" && !id) {
    const competitionType = normalizeText(
      request.nextUrl.searchParams.get("competitionType"),
    ).toUpperCase();
    const rows = await prisma.competitionRegistration.findMany({
      where: competitionType ? { competitionType } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
  }

  if (resource === "package-registrations" && id === "totals") {
    return getRegistrationTotals(request);
  }

  if (resource === "package-registrations" && !id) {
    return listPackageRegistrations(request);
  }

  if (resource === "package-registrations" && action === "receipts") {
    return listReceiptsForRegistration(id);
  }

  if (
    resource === "package-registrations" &&
    action === "session-adjustments"
  ) {
    return listSessionAdjustments(id);
  }

  if (resource === "package-registrations" && action === "point-adjustments") {
    return listPointAdjustments(id);
  }

  if (resource === "package-registrations" && action === "history") {
    return getRegistrationHistory(id);
  }

  if (resource === "receipts" && id && !action) {
    return getReceipt(id);
  }

  if (resource === "package-session-canceled" && !id) {
    const packageName =
      request.nextUrl.searchParams.get("packageName") || undefined;
    const startDate =
      request.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = request.nextUrl.searchParams.get("endDate") || undefined;

    const where: any = {};
    if (packageName) where.packageName = packageName;
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.sessionDate.lte = end;
      }
    }

    const rows = await prisma.packageSessionCanceled.findMany({
      where,
      orderBy: { sessionDate: "desc" },
    });
    return NextResponse.json(rows);
  }

  return jsonError("Not found", 404);
}

async function dispatchPost(request: NextRequest, params: Params) {
  const [resource, id, action, extra] = params.slug;

  if (resource === "member-auth" && id === "sign-in" && !action) {
    return memberSignIn(request);
  }

  if (resource === "member-auth" && id === "setup-password" && !action) {
    return memberSetupPassword(request);
  }

  if (resource === "member-auth" && id === "change-password" && !action) {
    return memberChangePassword(request);
  }

  if (resource === "companies" && !id) {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    if (!name) return jsonError("Company name is required");

    const existing = await prisma.company.findFirst({ where: { name } });
    if (existing) return NextResponse.json(existing);

    const company = await prisma.company.create({
      data: {
        name,
        contactName: String(body.contactName || name).trim(),
        contactEmail:
          String(body.contactEmail || "").trim() ||
          "infinitysportsacademyjo@gmail.com",
        phone: (body.phone as string | null | undefined) ?? null,
        industry: (body.industry as string | null | undefined) ?? null,
        size: (body.size as string | null | undefined) ?? null,
        status: (typeof body.status === "string"
          ? body.status
          : "ACTIVE") as any,
      },
    });

    return NextResponse.json(company);
  }

  if (resource === "cash-book-categories" && !id) {
    return createCashBookCategory(request);
  }

  if (resource === "cash-book-transactions" && !id) {
    return createCashBookTransaction(request);
  }

  if (resource === "invoices" && !id) {
    return createInvoice(request);
  }

  if (resource === "shop-items" && id === "publish" && !action) {
    return publishShopCatalog(request);
  }

  if (resource === "shop-items" && !id) {
    return createShopItem(request);
  }

  if (resource === "guest-accounts" && id && action === "point-adjustment") {
    return addGuestPoints(id, request);
  }

  if (resource === "bookings" && id && action === "payments") {
    return addBookingPayment(id, request);
  }

  if (
    resource === "bookings" &&
    id === "recurring-blocks" &&
    action &&
    extra === "duplicate"
  ) {
    return duplicateRecurringBlock(action, request);
  }

  if (resource === "bookings" && !id) {
    await importPendingMobileBookingsFromFirestore();
    const body = (await request.json()) as Record<string, unknown>;

    const companyId =
      extractConnectId(body, "company") || extractConnectId(body, "companyId");
    if (!companyId) return jsonError("companyId is required");

    const startTime = parseDate(String(body.startTime || ""));
    const endTime = parseDate(String(body.endTime || ""));
    if (!startTime || !endTime)
      return jsonError("Valid startTime and endTime are required");
    if (endTime.getTime() <= startTime.getTime()) {
      return jsonError("endTime must be later than startTime");
    }

    const requestedSource = normalizeSource(body.source);
    const source =
      requestedSource ||
      inferBookingSource((body.notes as string | undefined) || undefined);
    const isNoShow =
      String(body.status || "")
        .trim()
        .toUpperCase() === "NO_SHOW";
    const adminOverride = Boolean(body.adminOverride);
    const createdByAdminId =
      typeof body.createdByAdminId === "string" ? body.createdByAdminId : null;
    const statusValue = isNoShow
      ? "CANCELLED"
      : ((typeof body.status === "string" ? body.status : "PENDING") as string);
    const notesText = withSourceTag(
      (body.notes as string | undefined) || null,
      source,
    );
    const notesWithNoShow =
      isNoShow && !notesText.toLowerCase().includes("[no_show]")
        ? `${notesText} [NO_SHOW]`
        : notesText;

    const availability = await validateBookingAvailability({
      startTime,
      endTime,
      facilityArea: (body.facilityArea as string | undefined) || null,
      adminOverride,
      createdByAdminId,
    });
    if (availability.conflict) {
      return NextResponse.json(
        {
          message: availability.conflict,
          conflict: availability.conflictMeta ?? null,
        },
        { status: 409 },
      );
    }

    const data: any = {
      companyId,
      startTime,
      endTime,
      facilityArea: (body.facilityArea as string | undefined) || null,
      status: statusValue as any,
      isPaid: Boolean(body.isPaid ?? false),
      customerName: (body.customerName as string | undefined) ?? null,
      customerPhone: (body.customerPhone as string | undefined) ?? null,
      customerEmail: (body.customerEmail as string | undefined) ?? null,
      notes: notesWithNoShow,
    };

    const classId =
      extractConnectId(body, "class") || extractConnectId(body, "classId");
    const coachId =
      extractConnectId(body, "coach") || extractConnectId(body, "coachId");
    const memberId =
      extractConnectId(body, "member") || extractConnectId(body, "memberId");

    if (classId) data.class = { connect: { id: classId } };
    if (coachId) data.coach = { connect: { id: coachId } };
    if (memberId) data.member = { connect: { id: memberId } };

    const row = await prisma.booking.create({
      data,
      include: {
        company: true,
        class: true,
        coach: true,
        member: true,
      },
    });

    await addBookingAuditLog({
      bookingId: row.id,
      action: "BOOKING_CREATED",
      payload: {
        source,
        adminOverride,
        startTime: row.startTime,
        endTime: row.endTime,
        facilityArea: row.facilityArea,
      },
      createdByAdminId,
    });

    await maybeAwardBookingRewardPoints({
      bookingId: row.id,
      startTime: row.startTime,
      endTime: row.endTime,
      facilityArea: row.facilityArea,
      status: row.status,
      source,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
    });

    await syncBookingRealtimeById(row.id);

    return NextResponse.json(row);
  }

  if (resource === "package-registrations" && id === "bulk") {
    return bulkCreatePackageRegistrations(request);
  }

  if (resource === "package-registrations" && id === "bulk-for-person") {
    return bulkCreateForPerson(request);
  }

  if (resource === "packages" && !id) {
    const body = (await request.json()) as {
      name?: string;
      sportType?: string;
      description?: string | null;
      durationMonths?: number;
      sessionsCount?: number;
      trackingType?: string;
      pricingType?: string;
      currentPriceJod?: number | null;
      isActive?: boolean;
      showOnWebsite?: boolean;
      sortOrder?: number;
    };

    const name = String(body.name || "").trim();
    if (!name) return jsonError("Package name is required");

    const durationMonths = normalizeDurationMonths(body.durationMonths, 1);
    const sessionsCount = Number(body.sessionsCount ?? 0);
    if (!Number.isFinite(sessionsCount) || sessionsCount < 0) {
      return jsonError("sessionsCount must be 0 or greater");
    }

    let currentPriceJod: number | null = null;
    if (body.currentPriceJod !== undefined) {
      if (body.currentPriceJod == null) {
        currentPriceJod = null;
      } else {
        const parsedCurrentPrice = Number(body.currentPriceJod);
        if (!Number.isFinite(parsedCurrentPrice) || parsedCurrentPrice < 0) {
          return jsonError("currentPriceJod must be 0 or greater");
        }
        currentPriceJod = Math.round(parsedCurrentPrice);
      }
    }

    const sortOrder = Number(body.sortOrder ?? 0);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      return jsonError("sortOrder must be 0 or greater");
    }

    try {
      const row = await prisma.package.create({
        data: {
          name,
          sportType: String(body.sportType || "").trim() || "Other",
          description:
            body.description == null
              ? null
              : String(body.description).trim() || null,
          durationMonths,
          sessionsCount: Math.round(sessionsCount),
          trackingType:
            String(body.trackingType || "SESSIONS")
              .trim()
              .toUpperCase() || "SESSIONS",
          pricingType:
            String(body.pricingType || "FIXED")
              .trim()
              .toUpperCase() || "FIXED",
          currentPriceJod,
          isActive: Boolean(body.isActive ?? true),
          showOnWebsite: Boolean(body.showOnWebsite ?? true),
          sortOrder: Math.round(sortOrder),
        },
      });

      await syncActivePackagesToFirestore();
      return NextResponse.json(row);
    } catch (error: any) {
      if (error?.code === "P2002") {
        return jsonError("Package name already exists", 409);
      }
      return jsonError("Failed to create package", 500);
    }
  }

  if (resource === "package-registrations" && !id) {
    const body = (await request.json()) as RegistrationInput;
    try {
      const row = await createPackageRegistration(body);
      return NextResponse.json(row);
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Failed to create registration",
      );
    }
  }

  if (resource === "package-registrations" && action === "reregister") {
    return reregisterPackage(id);
  }

  if (resource === "package-registrations" && action === "mark-paid") {
    return markRegistrationPaid(id, request);
  }

  if (resource === "package-registrations" && action === "mark-unpaid") {
    return markRegistrationUnpaid(id, request);
  }

  if (resource === "package-registrations" && action === "session-adjustment") {
    return addSessionAdjustment(id, request);
  }

  if (resource === "package-registrations" && action === "point-adjustment") {
    return addPointAdjustment(id, request);
  }

  if (resource === "package-session-canceled" && !id) {
    const body = (await request.json()) as {
      packageName: string;
      sessionDate: string;
      reason: string;
      reasonDetail?: string | null;
    };

    const validReasons = [
      "HOLIDAY",
      "BAD_WEATHER",
      "TEACHER_UNAVAILABLE",
      "OTHER",
    ];
    const reason = (body.reason || "OTHER").toUpperCase();
    if (!validReasons.includes(reason)) return jsonError("Invalid reason");

    const sessionDate = parseDate(body.sessionDate);
    if (!sessionDate) return jsonError("Invalid session date");

    const row = await prisma.packageSessionCanceled.create({
      data: {
        packageName: (body.packageName || "").trim(),
        sessionDate,
        reason,
        reasonDetail: (body.reasonDetail || "").trim() || null,
      },
    });

    return NextResponse.json(row);
  }

  return jsonError("Not found", 404);
}

async function dispatchPatch(request: NextRequest, params: Params) {
  const [resource, id, action] = params.slug;

  if (!id) return jsonError("Missing ID");

  if (resource === "bookings" && id === "court-rates" && !action) {
    return updateBookingCourtRates(request);
  }

  if (resource === "bookings" && id === "recurring-blocks" && action) {
    return updateRecurringBlock(action, request);
  }

  if (resource === "bookings" && !action) {
    await importPendingMobileBookingsFromFirestore();
    const body = (await request.json()) as Record<string, unknown>;
    const data: any = {};
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return jsonError("Booking not found", 404);

    if (body.startTime !== undefined) {
      const d = parseDate(String(body.startTime));
      if (!d) return jsonError("Invalid startTime");
      data.startTime = d;
    }

    if (body.endTime !== undefined) {
      const d = parseDate(String(body.endTime));
      if (!d) return jsonError("Invalid endTime");
      data.endTime = d;
    }

    if (body.facilityArea !== undefined)
      data.facilityArea = (body.facilityArea as string | null) ?? null;
    if (body.status !== undefined) {
      const statusValue = String(body.status || "")
        .trim()
        .toUpperCase();
      data.status = (
        statusValue === "NO_SHOW" ? "CANCELLED" : statusValue
      ) as any;
    }
    if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
    if (body.notes !== undefined)
      data.notes = (body.notes as string | null) ?? null;
    if (body.customerName !== undefined)
      data.customerName = (body.customerName as string | null) ?? null;
    if (body.customerPhone !== undefined)
      data.customerPhone = (body.customerPhone as string | null) ?? null;
    if (body.customerEmail !== undefined)
      data.customerEmail = (body.customerEmail as string | null) ?? null;
    if (body.source !== undefined) {
      const source =
        normalizeSource(body.source) || inferBookingSource(existing.notes);
      const notesBase =
        (data.notes as string | null | undefined) ?? existing.notes ?? null;
      data.notes = withSourceTag(notesBase, source);
    }
    if (
      String(body.status || "")
        .trim()
        .toUpperCase() === "NO_SHOW"
    ) {
      const base = String(data.notes ?? existing.notes ?? "").trim();
      data.notes = base.toLowerCase().includes("[no_show]")
        ? base
        : `${base} [NO_SHOW]`.trim();
    }

    const classId =
      extractConnectId(body, "class") || extractConnectId(body, "classId");
    const coachId =
      extractConnectId(body, "coach") || extractConnectId(body, "coachId");
    const memberId =
      extractConnectId(body, "member") || extractConnectId(body, "memberId");

    if (classId) data.class = { connect: { id: classId } };
    else if (body.classId !== undefined || body.class !== undefined)
      data.class = { disconnect: true };
    if (coachId) data.coach = { connect: { id: coachId } };
    else if (body.coachId !== undefined || body.coach !== undefined)
      data.coach = { disconnect: true };
    if (memberId) data.member = { connect: { id: memberId } };
    else if (body.memberId !== undefined || body.member !== undefined)
      data.member = { disconnect: true };

    const nextStart =
      (data.startTime as Date | undefined) ?? existing.startTime;
    const nextEnd = (data.endTime as Date | undefined) ?? existing.endTime;
    if (nextEnd.getTime() <= nextStart.getTime()) {
      return jsonError("endTime must be later than startTime");
    }
    const nextFacility =
      (data.facilityArea as string | null | undefined) ?? existing.facilityArea;
    const adminOverride = Boolean(body.adminOverride);
    const createdByAdminId =
      typeof body.createdByAdminId === "string" ? body.createdByAdminId : null;
    const availability = await validateBookingAvailability({
      bookingId: id,
      startTime: nextStart,
      endTime: nextEnd,
      facilityArea: nextFacility,
      adminOverride,
      createdByAdminId,
    });
    if (availability.conflict) {
      return NextResponse.json(
        {
          message: availability.conflict,
          conflict: availability.conflictMeta ?? null,
        },
        { status: 409 },
      );
    }

    try {
      const row = await prisma.booking.update({
        where: { id },
        data,
        include: {
          company: true,
          class: true,
          coach: true,
          member: true,
        },
      });
      await addBookingAuditLog({
        bookingId: row.id,
        action: "BOOKING_UPDATED",
        payload: {
          adminOverride,
          changedFields: Object.keys(data),
        },
        createdByAdminId,
      });
      await maybeAwardBookingRewardPoints({
        bookingId: row.id,
        startTime: row.startTime,
        endTime: row.endTime,
        facilityArea: row.facilityArea,
        status: row.status,
        source: inferBookingSource(row.notes),
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
      });
      await syncBookingRealtimeById(row.id);
      return NextResponse.json(row);
    } catch (error: any) {
      if (error?.code === "P2025") return jsonError("Booking not found", 404);
      return jsonError("Failed to update booking", 500);
    }
  }

  if (resource === "competition-registrations" && id && !action) {
    const body = (await request.json()) as Record<string, unknown>;
    const existing = await prisma.competitionRegistration.findUnique({
      where: { id },
    });
    if (!existing) return jsonError("Competition registration not found", 404);

    const data: Record<string, unknown> = {};
    if (body.competitionType !== undefined) {
      const competitionType = normalizeText(body.competitionType).toUpperCase();
      if (!competitionType) return jsonError("Competition is required");
      data.competitionType = competitionType;
    }
    if (body.participantName !== undefined)
      data.participantName = normalizeText(body.participantName) || null;
    if (body.age !== undefined) {
      if (body.age == null || normalizeText(body.age) === "") {
        data.age = null;
      } else {
        const age = Number(body.age);
        if (!Number.isFinite(age) || age < 1 || age > 99)
          return jsonError("Age must be between 1 and 99");
        data.age = Math.round(age);
      }
    }
    if (body.gender !== undefined) {
      const gender = normalizeText(body.gender).toUpperCase();
      data.gender = gender || null;
    }
    if (body.customerPhone !== undefined) {
      const customerPhone = normalizeText(body.customerPhone);
      if (!customerPhone) return jsonError("Phone number is required");
      data.customerPhone = customerPhone;
    }
    if (body.teamName !== undefined)
      data.teamName = normalizeText(body.teamName) || null;
    if (body.playerOne !== undefined)
      data.playerOne = normalizeText(body.playerOne) || null;
    if (body.playerTwo !== undefined)
      data.playerTwo = normalizeText(body.playerTwo) || null;
    if (body.playerThree !== undefined)
      data.playerThree = normalizeText(body.playerThree) || null;
    if (body.playerFour !== undefined)
      data.playerFour = normalizeText(body.playerFour) || null;
    if (body.status !== undefined)
      data.status = normalizeText(body.status).toUpperCase() || "NEW";
    if (body.isPaid !== undefined) {
      const isPaid = Boolean(body.isPaid);
      data.isPaid = isPaid;
      data.paidAt = isPaid ? new Date() : null;
      if (!isPaid) {
        data.paymentMethod = null;
      }
    }
    if (body.amountDue !== undefined) {
      if (body.amountDue == null || normalizeText(body.amountDue) === "") {
        data.amountDue = null;
      } else {
        const amountDue = Number(body.amountDue);
        if (!Number.isFinite(amountDue) || amountDue < 0)
          return jsonError("Amount due must be 0 or greater");
        data.amountDue = Math.round(amountDue);
      }
    }
    if (body.amountPaid !== undefined) {
      if (body.amountPaid == null || normalizeText(body.amountPaid) === "") {
        data.amountPaid = null;
      } else {
        const amountPaid = Number(body.amountPaid);
        if (!Number.isFinite(amountPaid) || amountPaid < 0)
          return jsonError("Amount paid must be 0 or greater");
        data.amountPaid = Math.round(amountPaid);
      }
    }
    if (body.paymentMethod !== undefined)
      data.paymentMethod =
        normalizeText(body.paymentMethod).toUpperCase() || null;

    const nextCompetitionType = String(
      data.competitionType ?? existing.competitionType,
    ).toUpperCase();
    const isTeamCompetition =
      nextCompetitionType === "3X3" ||
      nextCompetitionType === "3X3_MEN" ||
      nextCompetitionType === "3X3_WOMEN";
    if (isTeamCompetition) {
      const teamName = normalizeText(data.teamName ?? existing.teamName);
      const playerOne = normalizeText(data.playerOne ?? existing.playerOne);
      const playerTwo = normalizeText(data.playerTwo ?? existing.playerTwo);
      const playerThree = normalizeText(
        data.playerThree ?? existing.playerThree,
      );
      if (!teamName || !playerOne || !playerTwo || !playerThree) {
        return jsonError("Team name and first 3 players are required");
      }
    } else {
      const participantName = normalizeText(
        data.participantName ?? existing.participantName,
      );
      if (!participantName) return jsonError("Player name is required");
    }

    const row = await prisma.competitionRegistration.update({
      where: { id },
      data,
    });
    try {
      const firestore = getFirestore();
      await syncCompetitionRecordToFirestore({ firestore, registration: row });
    } catch (error) {
      console.warn("[portal-db-api] competition sync skipped", error);
    }
    return NextResponse.json(row);
  }

  if (resource === "packages" && !action) {
    const body = (await request.json()) as {
      name?: string;
      sportType?: string;
      description?: string | null;
      durationMonths?: number;
      sessionsCount?: number;
      trackingType?: string;
      pricingType?: string;
      currentPriceJod?: number | null;
      isActive?: boolean;
      showOnWebsite?: boolean;
      sortOrder?: number;
    };

    const existingPackage = await prisma.package.findUnique({
      where: { id },
      select: { name: true, sessionsCount: true, durationMonths: true },
    });
    if (!existingPackage) return jsonError("Package not found", 404);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) return jsonError("Package name is required");
      data.name = name;
    }
    if (body.sportType !== undefined)
      data.sportType = String(body.sportType || "").trim() || "Other";
    if (body.description !== undefined)
      data.description =
        body.description == null
          ? null
          : String(body.description).trim() || null;
    if (body.durationMonths !== undefined) {
      const durationMonths = Number(body.durationMonths);
      if (!Number.isFinite(durationMonths) || durationMonths < 1) {
        return jsonError("durationMonths must be 1 or greater");
      }
      data.durationMonths = Math.round(durationMonths);
    }
    if (body.sessionsCount !== undefined) {
      const sessionsCount = Number(body.sessionsCount);
      if (!Number.isFinite(sessionsCount) || sessionsCount < 0) {
        return jsonError("sessionsCount must be 0 or greater");
      }
      data.sessionsCount = Math.round(sessionsCount);
    }
    if (body.trackingType !== undefined)
      data.trackingType =
        String(body.trackingType || "SESSIONS")
          .trim()
          .toUpperCase() || "SESSIONS";
    if (body.pricingType !== undefined)
      data.pricingType =
        String(body.pricingType || "FIXED")
          .trim()
          .toUpperCase() || "FIXED";
    if (body.currentPriceJod !== undefined) {
      if (body.currentPriceJod == null) {
        data.currentPriceJod = null;
      } else {
        const currentPriceJod = Number(body.currentPriceJod);
        if (!Number.isFinite(currentPriceJod) || currentPriceJod < 0) {
          return jsonError("currentPriceJod must be 0 or greater");
        }
        data.currentPriceJod = Math.round(currentPriceJod);
      }
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.showOnWebsite !== undefined) {
      data.showOnWebsite = Boolean(body.showOnWebsite);
    }
    if (body.sortOrder !== undefined) {
      const sortOrder = Number(body.sortOrder);
      if (!Number.isFinite(sortOrder) || sortOrder < 0) {
        return jsonError("sortOrder must be 0 or greater");
      }
      data.sortOrder = Math.round(sortOrder);
    }

    const nextName = String(data.name ?? existingPackage.name);
    const nextSessionsCount =
      data.sessionsCount === undefined
        ? existingPackage.sessionsCount
        : Number(data.sessionsCount);

    const row = await prisma.package.update({
      where: { id },
      data: data as never,
    });

    if (nextName !== existingPackage.name) {
      await prisma.packageRegistration.updateMany({
        where: { packageName: existingPackage.name },
        data: { packageName: nextName },
      });
    }

    if (
      data.sessionsCount !== undefined &&
      nextSessionsCount !== existingPackage.sessionsCount
    ) {
      await prisma.packageRegistration.updateMany({
        where: {
          packageName: nextName,
          OR: [
            { sessionsLeft: null },
            { sessionsLeft: existingPackage.sessionsCount },
          ],
        },
        data: {
          sessionsLeft: nextSessionsCount > 0 ? nextSessionsCount : null,
        },
      });
    }

    await syncActivePackagesToFirestore();
    return NextResponse.json(row);
  }

  if (resource === "cash-book-categories" && !action) {
    return updateCashBookCategory(id, request);
  }

  if (resource === "cash-book-transactions" && !action) {
    return updateCashBookTransaction(id, request);
  }

  if (resource === "package-registrations" && !action) {
    return updatePackageRegistration(id, request);
  }

  if (resource === "shop-items" && !action) {
    return updateShopItem(id, request);
  }

  if (resource === "invoices" && !action) {
    return updateInvoice(id, request);
  }

  if (resource === "receipts" && action === "void") {
    return voidReceipt(id, request);
  }

  return jsonError("Not found", 404);
}

async function dispatchDelete(_request: NextRequest, params: Params) {
  const [resource, id] = params.slug;

  if (!id) return jsonError("Missing ID");

  if (resource === "bookings") {
    try {
      await prisma.booking.delete({ where: { id } });
      try {
        const firestore = getFirestore();
        await markBookingDeletedInFirestore({ firestore, bookingId: id });
      } catch (error) {
        console.warn("[portal-db-api] booking delete sync skipped", error);
      }
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025") return jsonError("Booking not found", 404);
      return jsonError("Failed to delete booking", 500);
    }
  }

  if (resource === "cash-book-categories") {
    return deleteCashBookCategory(id, _request);
  }

  if (resource === "cash-book-transactions") {
    return deleteCashBookTransaction(id);
  }

  if (resource === "shop-items") {
    return removeShopItem(id);
  }

  if (resource === "guest-accounts") {
    return removeGuestAccount(id);
  }

  if (resource === "package-registrations") {
    try {
      const existing = await prisma.packageRegistration.findUnique({
        where: { id },
        select: { id: true, packageName: true, customerPhone: true },
      });
      if (!existing) return jsonError("Registration not found", 404);

      await prisma.packageRegistration.delete({ where: { id } });
      await cancelMatchingRegistrationInboxEntries({
        registrationId: existing.id,
        packageName: existing.packageName,
        customerPhone: existing.customerPhone,
      });
      try {
        const firestore = getFirestore();
        await markRegistrationDeletedInFirestore({
          firestore,
          registrationId: id,
        });
      } catch (error) {
        console.warn("[portal-db-api] registration delete sync skipped", error);
      }
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025")
        return jsonError("Registration not found", 404);
      return jsonError("Failed to delete registration", 500);
    }
  }

  if (resource === "competition-registrations") {
    try {
      await prisma.competitionRegistration.delete({ where: { id } });
      try {
        const firestore = getFirestore();
        await markCompetitionDeletedInFirestore({
          firestore,
          registrationId: id,
        });
      } catch (error) {
        console.warn("[portal-db-api] competition delete sync skipped", error);
      }
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025")
        return jsonError("Competition registration not found", 404);
      return jsonError("Failed to delete competition registration", 500);
    }
  }

  if (resource === "packages") {
    const existingPackage = await prisma.package.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existingPackage) return jsonError("Package not found", 404);

    const registrationsCount = await prisma.packageRegistration.count({
      where: { packageName: existingPackage.name },
    });
    if (registrationsCount > 0) {
      return jsonError(
        "Cannot delete a package that already has registrations. Set it inactive instead.",
        409,
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.packageSessionCanceled.deleteMany({
          where: { packageName: existingPackage.name },
        });
        await tx.packagePricing.deleteMany({
          where: { packageName: existingPackage.name },
        });
        await tx.package.delete({ where: { id } });
      });
      await syncActivePackagesToFirestore();
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error?.code === "P2025") return jsonError("Package not found", 404);
      return jsonError("Failed to delete package", 500);
    }
  }

  if (resource === "invoices") {
    return deleteInvoice(id);
  }

  return jsonError("Not found", 404);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    return await dispatchGet(request, await resolveRouteParams(context.params));
  } catch (error) {
    console.error("[portal-db-api][GET] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    return await dispatchPost(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][POST] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    return await dispatchPatch(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][PATCH] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    return await dispatchDelete(
      request,
      await resolveRouteParams(context.params),
    );
  } catch (error) {
    console.error("[portal-db-api][DELETE] error", error);
    return jsonError(
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}
