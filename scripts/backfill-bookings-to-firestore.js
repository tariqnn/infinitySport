const fs = require("node:fs");
const path = require("node:path");
const { config: loadEnv } = require("dotenv");

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
  },
});

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

function inferBookingSource(notes) {
  const text = String(notes || "");
  const tagged = text.match(/\[SOURCE:(WEBSITE|APP|ADMIN)\]/i)?.[1]?.toUpperCase();
  if (tagged === "WEBSITE" || tagged === "APP" || tagged === "ADMIN") return tagged;
  const lowered = text.toLowerCase();
  if (lowered.includes("public booking")) return "WEBSITE";
  if (lowered.includes("mobile app")) return "APP";
  return "ADMIN";
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

async function run() {
  const { prisma } = require("../apps/portal/lib/db");
  const { getFirestore } = require("../apps/portal/lib/firebase-admin");
  const bookingSync = require("../apps/portal/lib/bookingRealtimeSync");
  const availabilitySync = require("../apps/portal/lib/bookingAvailabilityRealtimeSync");

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
    const hasRewardPointsColumn = Array.isArray(rewardColumnRows) && rewardColumnRows.length > 0;
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
    console.warn("[backfill-bookings-to-firestore] CourtRate lookup skipped", error.message || error);
  }

  const courtRates = { ...HOURLY_RATE_BY_COURT };
  const courtRewardPoints = { ...REWARD_POINTS_BY_COURT };
  for (const row of storedCourtRates) {
    const name = String(row.courtType || "").trim();
    const hourlyRate = Number(row.hourlyRate || 0);
    const rewardPointsPerHour = Math.max(0, Math.round(Number(row.rewardPointsPerHour || 0)));
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
      console.warn("[backfill-bookings-to-firestore] BookingPayment lookup skipped", error.message || error);
    }
  }

  const paymentsByBooking = new Map();
  for (const row of paymentRows) {
    const current = paymentsByBooking.get(row.bookingId) || [];
    current.push({
      bookingId: row.bookingId,
      amount: Number(row.amount || 0),
      method: String(row.method || "").trim().toUpperCase(),
      status: String(row.status || "").trim().toUpperCase() === "REFUNDED" ? "REFUNDED" : "PAID",
      createdAt: new Date(row.createdAt).toISOString(),
    });
    paymentsByBooking.set(row.bookingId, current);
  }

  const syncedCourts = Array.from(
    new Set([
      ...DEFAULT_BOOKING_COURTS,
      ...Object.keys(courtRates),
      ...bookings.map((row) => String(row.facilityArea || "").trim()).filter(Boolean),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  await bookingSync.syncBookingCourtsToFirestore({
    firestore,
    courts: syncedCourts.map((name) => ({
      name,
      hourlyRate: getCourtRate(name, courtRates),
      rewardPointsPerHour: getCourtRewardPoints(name, courtRewardPoints),
    })),
  });

  await bookingSync.syncBookingRecordsToFirestore({
    firestore,
    bookings: bookings.map((booking) => {
      const payments = paymentsByBooking.get(booking.id) || [];
      const totalHours = hoursBetween(new Date(booking.startTime), new Date(booking.endTime));
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
        source: inferBookingSource(booking.notes),
        isPaid: booking.isPaid,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
        notes: booking.notes,
        totalHours,
        totalAmount,
        paidAmount: netPaid,
        remainingAmount,
        paymentStatus,
        latestPaymentMethod,
        deleted: false,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    }),
  });

  const blockedSlots = await prisma.blockedSlot.findMany({
    orderBy: [{ label: "asc" }, { dayOfWeek: "asc" }, { courtType: "asc" }, { time: "asc" }],
  });

  await availabilitySync.syncBlockedSlotsSnapshotToFirestore({
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

  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error("[backfill-bookings-to-firestore] failed", error);
  try {
    const { prisma } = require("../apps/portal/lib/db");
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
