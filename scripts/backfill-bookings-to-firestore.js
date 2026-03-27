const fs = require("node:fs");
const path = require("node:path");
const { config: loadEnv } = require("dotenv");
const admin = require("firebase-admin");
const { PrismaClient } = require("@prisma/client");

function loadEnvironment() {
  const root = process.cwd();
  const candidates = [
    path.join(root, ".env"),
    path.join(root, ".env.local"),
    path.join(root, "apps/portal/.env.local"),
    path.join(root, "apps/web/.env.local"),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      loadEnv({ path: file, override: false });
    }
  }
}

loadEnvironment();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

const DEFAULT_BOOKING_COURTS = [
  "Basketball AC",
  "Basketball 3x3",
  "Padel",
  "Volleyball",
];

const HOURLY_RATE_BY_COURT = {
  "Basketball AC": 40,
  "Basketball 3x3": 30,
  Padel: 35,
  Volleyball: 35,
};

const REWARD_POINTS_BY_COURT = {
  "Basketball AC": 10,
  "Basketball 3x3": 10,
  Padel: 10,
  Volleyball: 10,
};

const BOOKING_COURT_ID_BY_NAME = {
  "Basketball AC": "basketball-ac",
  "Basketball 3x3": "basketball-3x3",
  Padel: "padel",
  Volleyball: "volleyball",
};

function getPortalRoot() {
  return path.join(process.cwd(), "apps", "portal");
}

function loadServiceAccountJson() {
  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (fromPath) {
    const absolute = path.isAbsolute(fromPath)
      ? fromPath
      : path.resolve(getPortalRoot(), fromPath);
    try {
      return fs.readFileSync(absolute, "utf8");
    } catch {
      throw new Error(
        `Could not read FIREBASE_SERVICE_ACCOUNT_PATH file: ${absolute}`,
      );
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) return inline;

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT before running the Firebase backfill.",
  );
}

function getFirestore() {
  if (!admin.apps.length) {
    const raw = loadServiceAccountJson();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Firebase service account is not valid JSON.");
    }
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
      projectId: parsed.project_id || "infintysports-62c45",
    });
  }
  return admin.firestore();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTimestamp(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : admin.firestore.Timestamp.fromDate(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : admin.firestore.Timestamp.fromDate(parsed);
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toIsoDate(value) {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

function bookingCourtIdFromName(name) {
  const normalized = normalizeText(name);
  if (BOOKING_COURT_ID_BY_NAME[normalized]) {
    return BOOKING_COURT_ID_BY_NAME[normalized];
  }
  return (
    normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "court"
  );
}

function inferBookingSource(notes) {
  const text = String(notes || "");
  const tagged = text.match(/\[SOURCE:(WEBSITE|APP|ADMIN)\]/i)?.[1]?.toUpperCase();
  if (tagged === "WEBSITE" || tagged === "APP" || tagged === "ADMIN") return tagged;
  const lowered = text.toLowerCase();
  if (lowered.includes("public booking")) return "WEBSITE";
  if (lowered.includes("mobile app")) return "APP";
  return "ADMIN";
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED") return "CONFIRMED";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function hoursBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function getCourtRate(court, rates) {
  if (!court) return 30;
  if (Number.isFinite(rates[court])) return Number(rates[court]);
  return HOURLY_RATE_BY_COURT[court] ?? 30;
}

function getCourtRewardPoints(court, rewards) {
  if (!court) return 0;
  if (Number.isFinite(rewards[court])) return Number(rewards[court]);
  return REWARD_POINTS_BY_COURT[court] ?? 0;
}

function serializeCourt(input) {
  const name = normalizeText(input.name);
  return {
    id: bookingCourtIdFromName(name),
    name,
    hourlyRate: Math.max(0, Math.round(Number(input.hourlyRate || 0))),
    rewardPointsPerHour: Math.max(
      0,
      Math.round(Number(input.rewardPointsPerHour || 0)),
    ),
  };
}

function serializeBookingRecord(input) {
  const facilityArea = normalizeNullableText(input.facilityArea);
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;
  const totalHours = normalizeNumber(input.totalHours);
  const totalAmount = normalizeNumber(input.totalAmount);
  const paidAmount = normalizeNumber(input.paidAmount);
  const remainingAmount = normalizeNumber(input.remainingAmount);

  return {
    id: input.id,
    companyId: normalizeNullableText(input.companyId),
    courtId: bookingCourtIdFromName(facilityArea),
    courtName: facilityArea,
    facilityArea,
    startTime: toTimestamp(input.startTime),
    startTimeIso: toIsoString(input.startTime),
    endTime: toTimestamp(input.endTime),
    endTimeIso: toIsoString(input.endTime),
    status: normalizeStatus(input.status),
    source: inferBookingSource(input.notes),
    isPaid: Boolean(input.isPaid),
    customerName: normalizeNullableText(input.customerName),
    customerPhone: normalizeNullableText(input.customerPhone),
    customerEmail: normalizeNullableText(input.customerEmail),
    notes: normalizeNullableText(input.notes),
    financials: {
      totalHours,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentStatus: normalizeNullableText(input.paymentStatus),
      latestPaymentMethod: normalizeNullableText(input.latestPaymentMethod),
    },
    deleted: Boolean(input.deleted),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function serializeBlockedSlot(input) {
  return {
    id: input.id,
    dayOfWeek: normalizeText(input.dayOfWeek).toUpperCase(),
    courtType: normalizeText(input.courtType),
    time: normalizeText(input.time),
    isBlocked: input.isBlocked !== false,
    label: normalizeNullableText(input.label),
    startDate: toIsoDate(input.startDate),
    endDate: toIsoDate(input.endDate),
  };
}

async function syncBookingCourtsToFirestore({ firestore, courts }) {
  const serialized = courts.map(serializeCourt).filter((court) => !!court.name);
  await firestore.collection("portalBookingConfig").doc("current").set(
    {
      courts: serialized,
      sources: ["WEBSITE", "APP", "ADMIN"],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

async function syncBookingRecordsToFirestore({ firestore, bookings }) {
  if (!bookings.length) return;

  let batch = firestore.batch();
  let ops = 0;
  const commits = [];

  for (const booking of bookings) {
    const ref = firestore.collection("portalBookings").doc(booking.id);
    batch.set(ref, serializeBookingRecord(booking), { merge: true });
    ops += 1;
    if (ops === 400) {
      commits.push(batch.commit());
      batch = firestore.batch();
      ops = 0;
    }
  }

  if (ops > 0) commits.push(batch.commit());
  await Promise.all(commits);
}

async function syncBlockedSlotsSnapshotToFirestore({ firestore, blockedSlots }) {
  const serialized = blockedSlots
    .map(serializeBlockedSlot)
    .sort((a, b) => {
      const labelA = a.label || "";
      const labelB = b.label || "";
      if (labelA !== labelB) return labelA.localeCompare(labelB);
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek.localeCompare(b.dayOfWeek);
      }
      if (a.courtType !== b.courtType) {
        return a.courtType.localeCompare(b.courtType);
      }
      return a.time.localeCompare(b.time);
    });

  await firestore.collection("portalBookingAvailability").doc("current").set(
    {
      blockedSlots: serialized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

async function run() {
  const firestore = getFirestore();

  let storedCourtRates = [];
  try {
    const rewardColumnRows = await prisma.$queryRawUnsafe(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'CourtRate'
        AND column_name = 'rewardPointsPerHour'
      LIMIT 1
    `);
    const hasRewardPointsColumn =
      Array.isArray(rewardColumnRows) && rewardColumnRows.length > 0;
    storedCourtRates = await prisma.$queryRawUnsafe(
      hasRewardPointsColumn
        ? `
            SELECT "courtType", "hourlyRate", "rewardPointsPerHour"
            FROM "CourtRate"
            ORDER BY "courtType" ASC
          `
        : `
            SELECT "courtType", "hourlyRate", NULL::INTEGER AS "rewardPointsPerHour"
            FROM "CourtRate"
            ORDER BY "courtType" ASC
          `,
    );
  } catch (error) {
    console.warn(
      "[backfill-bookings-to-firestore] CourtRate lookup skipped",
      error.message || error,
    );
  }

  const courtRates = { ...HOURLY_RATE_BY_COURT };
  const courtRewardPoints = { ...REWARD_POINTS_BY_COURT };
  for (const row of storedCourtRates) {
    const name = String(row.courtType || "").trim();
    const hourlyRate = Number(row.hourlyRate || 0);
    const rewardPointsPerHour = Math.max(
      0,
      Math.round(Number(row.rewardPointsPerHour || 0)),
    );
    if (name && Number.isFinite(hourlyRate) && hourlyRate > 0) {
      courtRates[name] = hourlyRate;
    }
    if (name && Number.isFinite(rewardPointsPerHour) && rewardPointsPerHour >= 0) {
      courtRewardPoints[name] = rewardPointsPerHour;
    }
  }

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

  const bookingIds = bookings.map((row) => row.id);
  let paymentRows = [];
  if (bookingIds.length > 0) {
    try {
      paymentRows = await prisma.$queryRawUnsafe(
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
      );
    } catch (error) {
      console.warn(
        "[backfill-bookings-to-firestore] BookingPayment lookup skipped",
        error.message || error,
      );
    }
  }

  const paymentsByBooking = new Map();
  for (const row of paymentRows) {
    const current = paymentsByBooking.get(row.bookingId) || [];
    current.push({
      bookingId: row.bookingId,
      amount: Number(row.amount || 0),
      method: String(row.method || "").trim().toUpperCase(),
      status:
        String(row.status || "").trim().toUpperCase() === "REFUNDED"
          ? "REFUNDED"
          : "PAID",
      createdAt: new Date(row.createdAt).toISOString(),
    });
    paymentsByBooking.set(row.bookingId, current);
  }

  const syncedCourts = Array.from(
    new Set([
      ...DEFAULT_BOOKING_COURTS,
      ...Object.keys(courtRates),
      ...bookings
        .map((row) => String(row.facilityArea || "").trim())
        .filter(Boolean),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  await syncBookingCourtsToFirestore({
    firestore,
    courts: syncedCourts.map((name) => ({
      name,
      hourlyRate: getCourtRate(name, courtRates),
      rewardPointsPerHour: getCourtRewardPoints(name, courtRewardPoints),
    })),
  });

  await syncBookingRecordsToFirestore({
    firestore,
    bookings: bookings.map((booking) => {
      const payments = paymentsByBooking.get(booking.id) || [];
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
        .reduce((runningTotal, row) => runningTotal + Number(row.amount || 0), 0);
      const refundAmount = payments
        .filter((row) => row.status === "REFUNDED")
        .reduce((runningTotal, row) => runningTotal + Number(row.amount || 0), 0);
      const netPaid = paidAmount - refundAmount;
      const remainingAmount = Math.max(0, totalAmount - netPaid);
      const paymentStatus =
        netPaid <= 0 && refundAmount > 0
          ? "REFUNDED"
          : netPaid <= 0
            ? "UNPAID"
            : netPaid >= totalAmount
              ? "PAID"
              : "PARTIAL";

      return {
        id: booking.id,
        companyId: booking.companyId,
        facilityArea: booking.facilityArea,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        isPaid: booking.isPaid,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
        notes: booking.notes,
        totalHours,
        totalAmount,
        paidAmount,
        refundAmount,
        netPaid,
        remainingAmount,
        paymentStatus,
        latestPaymentMethod: payments.length ? payments[0]?.method ?? null : null,
        deleted: false,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    }),
  });

  const blockedSlots = await prisma.blockedSlot.findMany({
    orderBy: [
      { label: "asc" },
      { dayOfWeek: "asc" },
      { courtType: "asc" },
      { time: "asc" },
    ],
  });

  await syncBlockedSlotsSnapshotToFirestore({
    firestore,
    blockedSlots: blockedSlots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      courtType: slot.courtType,
      time: slot.time,
      isBlocked: slot.isBlocked,
      label: slot.label,
      startDate: slot.startDate,
      endDate: slot.endDate,
    })),
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        bookingsSynced: bookings.length,
        courtsSynced: syncedCourts.length,
        blockedSlotsSynced: blockedSlots.length,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error("[backfill-bookings-to-firestore] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
