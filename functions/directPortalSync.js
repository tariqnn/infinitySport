const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const DEFAULT_COMPANY_NAME = "Infinity Sport";
const DEFAULT_COMPANY_EMAIL = "infinitysportsacademyjo@gmail.com";
const BOOKING_COURT_ID_BY_NAME = {
  "Basketball AC": "basketball-ac",
  "Basketball 3x3": "basketball-3x3",
  Padel: "padel",
  Volleyball: "volleyball"
};
const HOURLY_RATE_BY_COURT = {
  "Basketball AC": 40,
  "Basketball 3x3": 30,
  Padel: 35,
  Volleyball: 35
};

let pool = null;
let bookingInfrastructureReady = false;
let courtRateCache = {
  loadedAt: 0,
  rates: { ...HOURLY_RATE_BY_COURT }
};

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

function normalizeInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return fallback;
}

function normalizeBookingStatus(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED") return "CONFIRMED";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function normalizePaymentMethod(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CARD") return "CARD";
  if (normalized === "ONLINE") return "ONLINE";
  if (normalized === "TRANSFER") return "TRANSFER";
  if (normalized === "OTHER") return "OTHER";
  return "CASH";
}

function normalizePaymentStatus(value) {
  return normalizeText(value).toUpperCase() === "REFUNDED"
    ? "REFUNDED"
    : "PAID";
}

function normalizeRegistrationStatus(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "TRANSFERRED") return "TRANSFERRED";
  if (normalized === "EXPIRED") return "EXPIRED";
  return "ACTIVE";
}

function normalizeRegistrationSource(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "PORTAL_DB") return "PORTAL_DB";
  if (normalized === "WEBSITE") return "WEBSITE";
  return "APP";
}

function parseOptionalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toTimestamp(value) {
  const parsed = parseOptionalDate(value);
  return parsed ? admin.firestore.Timestamp.fromDate(parsed) : null;
}

function toIsoString(value) {
  const parsed = parseOptionalDate(value);
  return parsed ? parsed.toISOString() : null;
}

function inferBookingSource(notes) {
  const text = String(notes || "");
  const tagged = text.match(/\[SOURCE:(WEBSITE|APP|ADMIN)\]/i)?.[1]?.toUpperCase();
  if (tagged === "WEBSITE" || tagged === "APP" || tagged === "ADMIN") {
    return tagged;
  }
  const lowered = text.toLowerCase();
  if (lowered.includes("public booking")) return "WEBSITE";
  if (lowered.includes("mobile app")) return "APP";
  return "ADMIN";
}

function withSourceTag(notes, source) {
  const text = normalizeText(notes);
  if (!text) return `[SOURCE:${source}]`;
  if (/\[SOURCE:(WEBSITE|APP|ADMIN)\]/i.test(text)) {
    return text.replace(/\[SOURCE:(WEBSITE|APP|ADMIN)\]/i, `[SOURCE:${source}]`);
  }
  return `[SOURCE:${source}] ${text}`;
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

function resolveBookingCourtNameFromPayload(payload) {
  const direct =
    normalizeText(payload.facilityArea) ||
    normalizeText(payload.courtName) ||
    normalizeText(payload.courtType) ||
    normalizeText(payload.court);
  if (direct) return direct;

  const courtRecord =
    payload.court && typeof payload.court === "object"
      ? payload.court
      : null;
  const nestedName =
    normalizeText(courtRecord?.name) ||
    normalizeText(courtRecord?.facilityArea);
  if (nestedName) return nestedName;

  const courtId =
    normalizeText(payload.courtId) ||
    normalizeText(courtRecord?.id) ||
    normalizeText(courtRecord?.courtId);

  switch (courtId.toLowerCase()) {
    case "basketball-ac":
    case "basketball_ac":
      return "Basketball AC";
    case "basketball-3x3":
    case "basketball_3x3":
      return "Basketball 3x3";
    case "padel":
      return "Padel";
    case "volleyball":
      return "Volleyball";
    default:
      return null;
  }
}

function hoursBetween(start, end) {
  const durationMs = end.getTime() - start.getTime();
  if (durationMs <= 0) return 0;
  return durationMs / (1000 * 60 * 60);
}

function computeFinalPriceJod(basePriceJod, discountType, discountValue) {
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

function billingPeriodFromDate(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    billingPeriodKey: `${year}-${String(month + 1).padStart(2, "0")}`,
    priceLockedUntil: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
  };
}

function buildPoolConfig(databaseUrl) {
  const sslRequired =
    /sslmode=require/i.test(databaseUrl) || /neon\.tech/i.test(databaseUrl);

  return {
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined
  };
}

function getPool(databaseUrl) {
  if (!pool) {
    pool = new Pool(buildPoolConfig(databaseUrl));
    pool.on("error", (error) => {
      console.error("[portal-db-sync] postgres pool error", error);
    });
  }
  return pool;
}

async function withClient(databaseUrl, callback) {
  const client = await getPool(databaseUrl).connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function ensureBookingInfrastructure(client) {
  if (bookingInfrastructureReady) return;

  await client.query(`
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
  await client.query(`
    CREATE INDEX IF NOT EXISTS "BookingPayment_bookingId_idx"
    ON "BookingPayment" ("bookingId");
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS "BookingPayment_createdAt_idx"
    ON "BookingPayment" ("createdAt");
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BookingPayment_transactionRef_unique"
    ON "BookingPayment" ("transactionRef")
    WHERE "transactionRef" IS NOT NULL;
  `);

  bookingInfrastructureReady = true;
}

async function resolveActiveCompanyId(client) {
  const existing = await client.query(`
    SELECT "id"
    FROM "Company"
    WHERE "status" = 'ACTIVE'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `);

  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  const created = await client.query(
    `
      INSERT INTO "Company" (
        "id",
        "name",
        "contactName",
        "contactEmail",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
      RETURNING "id"
    `,
    [
      `company-${crypto.randomUUID()}`,
      DEFAULT_COMPANY_NAME,
      DEFAULT_COMPANY_NAME,
      DEFAULT_COMPANY_EMAIL
    ]
  );

  return created.rows[0].id;
}

async function loadCourtRates(client) {
  const now = Date.now();
  if (now - courtRateCache.loadedAt < 60_000) {
    return courtRateCache.rates;
  }

  const rates = { ...HOURLY_RATE_BY_COURT };
  try {
    const result = await client.query(`
      SELECT "courtType", "hourlyRate"
      FROM "CourtRate"
    `);
    for (const row of result.rows) {
      const name = normalizeText(row.courtType);
      const hourlyRate = Number(row.hourlyRate || 0);
      if (name && Number.isFinite(hourlyRate) && hourlyRate > 0) {
        rates[name] = hourlyRate;
      }
    }
  } catch (error) {
    console.warn("[portal-db-sync] CourtRate lookup skipped", error.message || error);
  }

  courtRateCache = {
    loadedAt: now,
    rates
  };
  return rates;
}

function getCourtRate(name, courtRates) {
  const normalized = normalizeText(name);
  if (!normalized) return 0;
  return Number(courtRates[normalized] || 0);
}

async function loadBookingPayments(client, bookingIds) {
  if (!bookingIds.length) return [];
  await ensureBookingInfrastructure(client);

  const result = await client.query(
    `
      SELECT
        "bookingId",
        "amount",
        "method",
        "status",
        "createdAt",
        "transactionRef"
      FROM "BookingPayment"
      WHERE "bookingId" = ANY($1::text[])
      ORDER BY "createdAt" DESC
    `,
    [bookingIds]
  );

  return result.rows.map((row) => ({
    bookingId: row.bookingId,
    amount: Number(row.amount || 0),
    method: normalizePaymentMethod(row.method),
    status: normalizePaymentStatus(row.status),
    createdAt: parseOptionalDate(row.createdAt),
    transactionRef: normalizeNullableText(row.transactionRef)
  }));
}

function computeBookingFinancials(booking, payments, courtRates) {
  const totalHours = hoursBetween(booking.startTime, booking.endTime);
  const totalAmount = Math.max(
    0,
    Math.round(totalHours * getCourtRate(booking.facilityArea, courtRates))
  );
  const paidAmount = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const refundAmount = payments
    .filter((payment) => payment.status === "REFUNDED")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const netPaid = Math.max(0, paidAmount - refundAmount);
  const remainingAmount = Math.max(0, totalAmount - netPaid);
  const latestPaymentMethod = payments.length ? payments[0].method : null;

  let paymentStatus = "UNPAID";
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
    latestPaymentMethod
  };
}

function serializeBookingRecord(input) {
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;
  const facilityArea = normalizeNullableText(input.facilityArea);

  return {
    id: normalizeText(input.id),
    companyId: normalizeNullableText(input.companyId),
    courtId: bookingCourtIdFromName(facilityArea),
    courtName: facilityArea,
    facilityArea,
    startTime: toTimestamp(input.startTime),
    startTimeIso: toIsoString(input.startTime),
    endTime: toTimestamp(input.endTime),
    endTimeIso: toIsoString(input.endTime),
    status: normalizeBookingStatus(input.status),
    source: inferBookingSource(input.notes),
    isPaid: normalizeBoolean(input.isPaid, false),
    customerName: normalizeNullableText(input.customerName),
    customerPhone: normalizeNullableText(input.customerPhone),
    customerEmail: normalizeNullableText(input.customerEmail),
    notes: normalizeNullableText(input.notes),
    financials: {
      totalHours: normalizeNumber(input.totalHours) ?? 0,
      totalAmount: normalizeNumber(input.totalAmount) ?? 0,
      paidAmount: normalizeNumber(input.paidAmount) ?? 0,
      refundAmount: normalizeNumber(input.refundAmount) ?? 0,
      netPaid: normalizeNumber(input.netPaid) ?? 0,
      remainingAmount: normalizeNumber(input.remainingAmount) ?? 0,
      paymentStatus: normalizeText(input.paymentStatus || "UNPAID"),
      latestPaymentMethod: normalizeNullableText(input.latestPaymentMethod)
    },
    deleted: normalizeBoolean(input.deleted, false),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

function serializeRegistrationRecord(input) {
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;

  return {
    id: normalizeText(input.id),
    packageName: normalizeText(input.packageName),
    customerName: normalizeText(input.customerName),
    customerPhone: normalizeText(input.customerPhone),
    customerEmail: normalizeNullableText(input.customerEmail),
    customerAge: normalizeInteger(input.customerAge),
    playerCode: normalizeNullableText(input.playerCode),
    currentCycle: normalizeInteger(input.currentCycle),
    sessionsLeft: normalizeInteger(input.sessionsLeft),
    nextPaymentDate: toTimestamp(input.nextPaymentDate),
    nextPaymentDateIso: toIsoString(input.nextPaymentDate),
    planLabel: normalizeNullableText(input.planLabel),
    isPaid: normalizeBoolean(input.isPaid, false),
    basePriceJod: normalizeNumber(input.basePriceJod) ?? 0,
    discountType: normalizeText(input.discountType || "NONE"),
    discountValue: normalizeNumber(input.discountValue),
    discountReason: normalizeNullableText(input.discountReason),
    finalPriceJod: normalizeNumber(input.finalPriceJod) ?? 0,
    periodStartsAt: toTimestamp(input.periodStartsAt),
    periodStartsAtIso: toIsoString(input.periodStartsAt),
    periodEndsAt: toTimestamp(input.periodEndsAt),
    periodEndsAtIso: toIsoString(input.periodEndsAt),
    isFrozen: normalizeBoolean(input.isFrozen, false),
    frozenAt: toTimestamp(input.frozenAt),
    frozenAtIso: toIsoString(input.frozenAt),
    sessionsBonus: Math.max(0, normalizeInteger(input.sessionsBonus) ?? 0),
    collected: Math.max(0, normalizeNumber(input.collected) ?? 0),
    status: normalizeRegistrationStatus(input.status),
    source: normalizeRegistrationSource(input.source),
    deleted: normalizeBoolean(input.deleted, false),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function updateBookingInboxEntry(firestore, id, data) {
  await firestore.collection("portalBookingInbox").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    },
    { merge: true }
  );
}

async function updateBookingActionInboxEntry(firestore, id, data) {
  await firestore.collection("portalBookingActionInbox").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    },
    { merge: true }
  );
}

async function updateRegistrationInboxEntry(firestore, id, data) {
  await firestore.collection("portalRegistrationInbox").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    },
    { merge: true }
  );
}

async function loadBookingRow(client, bookingId) {
  const result = await client.query(
    `
      SELECT
        "id",
        "companyId",
        "facilityArea",
        "startTime",
        "endTime",
        "status",
        "isPaid",
        "customerName",
        "customerPhone",
        "customerEmail",
        "notes",
        "createdAt",
        "updatedAt"
      FROM "Booking"
      WHERE "id" = $1
      LIMIT 1
    `,
    [bookingId]
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    companyId: row.companyId,
    facilityArea: row.facilityArea,
    startTime: parseOptionalDate(row.startTime),
    endTime: parseOptionalDate(row.endTime),
    status: row.status,
    isPaid: row.isPaid === true,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    notes: row.notes,
    createdAt: parseOptionalDate(row.createdAt),
    updatedAt: parseOptionalDate(row.updatedAt)
  };
}

async function writeCanonicalBooking(firestore, booking) {
  await firestore.collection("portalBookings").doc(booking.id).set(
    serializeBookingRecord(booking),
    { merge: true }
  );
}

async function syncCanonicalBookingById(firestore, databaseUrl, bookingId) {
  await withClient(databaseUrl, async (client) => {
    const booking = await loadBookingRow(client, bookingId);
    if (!booking || !booking.startTime || !booking.endTime) return;

    const [payments, courtRates] = await Promise.all([
      loadBookingPayments(client, [bookingId]),
      loadCourtRates(client)
    ]);
    const financials = computeBookingFinancials(booking, payments, courtRates);

    await writeCanonicalBooking(firestore, {
      ...booking,
      ...financials,
      deleted: false
    });
  });
}

async function syncBookingInboxEntry({ firestore, databaseUrl, snapshotId, payload }) {
  const bookingId = normalizeText(payload.bookingId) || normalizeText(payload.id) || snapshotId;
  const facilityArea = resolveBookingCourtNameFromPayload(payload);
  const startTime = parseOptionalDate(payload.startTime ?? payload.startTimeIso);
  const endTime = parseOptionalDate(payload.endTime ?? payload.endTimeIso);
  const customerName = normalizeText(payload.customerName);
  const customerPhone = normalizeText(payload.customerPhone);
  const customerEmail = normalizeNullableText(payload.customerEmail);
  const status = normalizeBookingStatus(payload.status);
  const notes = normalizeText(payload.notes);
  const createdAt =
    parseOptionalDate(payload.createdAt ?? payload.createdAtIso) || new Date();
  const updatedAt =
    parseOptionalDate(payload.updatedAt ?? payload.updatedAtIso) || createdAt;

  if (
    !bookingId ||
    !facilityArea ||
    !startTime ||
    !endTime ||
    !customerName ||
    !customerPhone ||
    endTime.getTime() <= startTime.getTime()
  ) {
    await updateBookingInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: "Missing or invalid booking fields.",
      dbImported: false
    });
    return;
  }

  try {
    const result = await withClient(databaseUrl, async (client) => {
      await ensureBookingInfrastructure(client);
      await client.query("BEGIN");
      try {
        const existing = await client.query(
          `
            SELECT "id"
            FROM "Booking"
            WHERE "id" = $1
            LIMIT 1
          `,
          [bookingId]
        );
        if (existing.rows[0]?.id) {
          await client.query("COMMIT");
          return {
            status: "SYNCED",
            bookingId
          };
        }

        const companyId =
          normalizeText(payload.companyId) || (await resolveActiveCompanyId(client));

        const overlap = await client.query(
          `
            SELECT
              "id",
              "customerName",
              "startTime",
              "endTime"
            FROM "Booking"
            WHERE
              "companyId" = $1
              AND "facilityArea" = $2
              AND "status" <> 'CANCELLED'
              AND "startTime" < $3
              AND "endTime" > $4
            ORDER BY "startTime" ASC
            LIMIT 1
          `,
          [companyId, facilityArea, endTime, startTime]
        );

        if (overlap.rows[0]) {
          await client.query("ROLLBACK");
          const row = overlap.rows[0];
          return {
            status: "CONFLICT",
            syncError: "Time conflicts with an existing booking.",
            conflict: {
              type: "BOOKING_OVERLAP",
              bookingId: row.id,
              customerName: normalizeNullableText(row.customerName),
              startTime: parseOptionalDate(row.startTime)?.toISOString() ?? null,
              endTime: parseOptionalDate(row.endTime)?.toISOString() ?? null
            }
          };
        }

        await client.query(
          `
            INSERT INTO "Booking" (
              "id",
              "companyId",
              "facilityArea",
              "startTime",
              "endTime",
              "status",
              "isPaid",
              "customerName",
              "customerPhone",
              "customerEmail",
              "notes",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13
            )
          `,
          [
            bookingId,
            companyId,
            facilityArea,
            startTime,
            endTime,
            status,
            normalizeBoolean(payload.isPaid, false),
            customerName,
            customerPhone,
            customerEmail,
            withSourceTag(notes || "Mobile app booking", "APP"),
            createdAt,
            updatedAt
          ]
        );

        await client.query("COMMIT");
        return {
          status: "SYNCED",
          bookingId
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    if (result.status === "CONFLICT") {
      await updateBookingInboxEntry(firestore, snapshotId, {
        status: "CONFLICT",
        dbImported: false,
        dbBookingId: null,
        syncError: result.syncError,
        conflict: result.conflict
      });
      return;
    }

    await syncCanonicalBookingById(firestore, databaseUrl, result.bookingId);
    await updateBookingInboxEntry(firestore, snapshotId, {
      status: "SYNCED",
      dbImported: true,
      dbBookingId: result.bookingId,
      syncError: null,
      conflict: null
    });
  } catch (error) {
    await updateBookingInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: error instanceof Error ? error.message : "Booking import failed.",
      dbImported: false
    });
  }
}

async function syncBookingActionInboxEntry({
  firestore,
  databaseUrl,
  snapshotId,
  payload
}) {
  const bookingId = normalizeText(payload.bookingId);
  const actionType = normalizeText(payload.actionType).toUpperCase();
  const confirmBooking = normalizeBoolean(payload.confirmBooking, false);
  const paymentAmount = Math.max(0, Math.round(Number(payload.paymentAmount || 0)));
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
  const transactionRef = `APP_ACTION:${snapshotId}`;

  if (!bookingId || !["CONFIRM_BOOKING", "COLLECT_PAYMENT"].includes(actionType)) {
    await updateBookingActionInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: "Missing or invalid booking action fields.",
      dbImported: false
    });
    return;
  }

  try {
    const result = await withClient(databaseUrl, async (client) => {
      await ensureBookingInfrastructure(client);
      const courtRates = await loadCourtRates(client);
      await client.query("BEGIN");
      try {
        const booking = await loadBookingRow(client, bookingId);
        if (!booking) {
          await client.query("ROLLBACK");
          return {
            status: "ERROR",
            syncError: "Booking not found in portal."
          };
        }

        const currentStatus = normalizeBookingStatus(booking.status);
        if (currentStatus === "CANCELLED") {
          await client.query("ROLLBACK");
          return {
            status: "ERROR",
            syncError: "Cancelled bookings cannot be updated from mobile."
          };
        }

        const currentPayments = await loadBookingPayments(client, [bookingId]);
        const currentFinancials = computeBookingFinancials(
          booking,
          currentPayments,
          courtRates
        );

        let nextStatus = currentStatus;
        if ((confirmBooking || actionType === "CONFIRM_BOOKING") && currentStatus === "PENDING") {
          nextStatus = "CONFIRMED";
        }

        let recordedAmount = 0;
        let syncNote = null;

        if (actionType === "COLLECT_PAYMENT") {
          if (paymentAmount <= 0) {
            await client.query("ROLLBACK");
            return {
              status: "ERROR",
              syncError: "Payment amount must be greater than 0."
            };
          }

          const existingPayment = await client.query(
            `
              SELECT "amount"
              FROM "BookingPayment"
              WHERE "transactionRef" = $1
              LIMIT 1
            `,
            [transactionRef]
          );

          if (existingPayment.rows[0]) {
            recordedAmount = Math.max(
              0,
              Math.round(Number(existingPayment.rows[0].amount || 0))
            );
          } else {
            recordedAmount = Math.min(
              paymentAmount,
              Math.max(0, Math.round(currentFinancials.remainingAmount))
            );

            if (recordedAmount > 0) {
              await client.query(
                `
                  INSERT INTO "BookingPayment" (
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
                  )
                  VALUES ($1, $2, NULL, $3, $4, 'PAID', $5, NULL, NOW(), NOW())
                `,
                [
                  crypto.randomUUID(),
                  bookingId,
                  recordedAmount,
                  paymentMethod,
                  transactionRef
                ]
              );
            } else {
              syncNote = "Booking already has no remaining balance.";
            }
          }
        }

        const finalPayments =
          actionType === "COLLECT_PAYMENT"
            ? await loadBookingPayments(client, [bookingId])
            : currentPayments;
        const finalFinancials = computeBookingFinancials(
          booking,
          finalPayments,
          courtRates
        );
        const nextIsPaid = finalFinancials.paymentStatus === "PAID";

        if (
          nextStatus !== booking.status ||
          nextIsPaid !== booking.isPaid ||
          recordedAmount > 0
        ) {
          await client.query(
            `
              UPDATE "Booking"
              SET
                "status" = $2,
                "isPaid" = $3,
                "updatedAt" = NOW()
              WHERE "id" = $1
            `,
            [bookingId, nextStatus, nextIsPaid]
          );
        }

        await client.query("COMMIT");
        return {
          status: "SYNCED",
          bookingId,
          recordedAmount,
          syncNote,
          paymentMethod: actionType === "COLLECT_PAYMENT" ? paymentMethod : null
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    if (result.status === "ERROR") {
      await updateBookingActionInboxEntry(firestore, snapshotId, {
        status: "ERROR",
        syncError: result.syncError,
        dbImported: false,
        dbBookingId: bookingId || null
      });
      return;
    }

    await syncCanonicalBookingById(firestore, databaseUrl, result.bookingId);
    await updateBookingActionInboxEntry(firestore, snapshotId, {
      status: "SYNCED",
      dbImported: true,
      dbBookingId: result.bookingId,
      syncError: null,
      syncNote: result.syncNote,
      recordedAmount: result.recordedAmount || null,
      paymentMethod: result.paymentMethod
    });
  } catch (error) {
    await updateBookingActionInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: error instanceof Error ? error.message : "Booking action import failed.",
      dbImported: false,
      dbBookingId: bookingId || null
    });
  }
}

async function loadRegistrationRow(client, registrationId) {
  const result = await client.query(
    `
      SELECT
        r."id",
        r."packageName",
        r."customerName",
        r."customerPhone",
        r."customerEmail",
        r."customerAge",
        r."sessionsLeft",
        r."nextPaymentDate",
        r."planLabel",
        r."isPaid",
        r."basePriceJod",
        r."discountType",
        r."discountValue",
        r."discountReason",
        r."finalPriceJod",
        r."periodStartsAt",
        r."periodEndsAt",
        r."isFrozen",
        r."frozenAt",
        r."sessionsBonus",
        r."status",
        r."createdAt",
        r."updatedAt",
        COALESCE(
          SUM(
            CASE
              WHEN rc."status" = 'ACTIVE' AND rc."voidedAt" IS NULL
              THEN rc."amountPaid"
              ELSE 0
            END
          ),
          0
        ) AS "collected"
      FROM "PackageRegistration" r
      LEFT JOIN "Receipt" rc ON rc."registrationId" = r."id"
      WHERE r."id" = $1
      GROUP BY r."id"
      LIMIT 1
    `,
    [registrationId]
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    packageName: row.packageName,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerAge: row.customerAge,
    playerCode: null,
    currentCycle: 1,
    sessionsLeft: row.sessionsLeft,
    nextPaymentDate: parseOptionalDate(row.nextPaymentDate),
    planLabel: row.planLabel,
    isPaid: row.isPaid === true,
    basePriceJod: Number(row.basePriceJod || 0),
    discountType: row.discountType,
    discountValue: row.discountValue == null ? null : Number(row.discountValue),
    discountReason: row.discountReason,
    finalPriceJod: Number(row.finalPriceJod || 0),
    periodStartsAt: parseOptionalDate(row.periodStartsAt),
    periodEndsAt: parseOptionalDate(row.periodEndsAt),
    isFrozen: row.isFrozen === true,
    frozenAt: parseOptionalDate(row.frozenAt),
    sessionsBonus: Number(row.sessionsBonus || 0),
    collected: Number(row.collected || 0),
    status: row.status,
    source: "APP",
    createdAt: parseOptionalDate(row.createdAt),
    updatedAt: parseOptionalDate(row.updatedAt),
    deleted: false
  };
}

async function writeCanonicalRegistration(firestore, registration) {
  await firestore.collection("portalRegistrations").doc(registration.id).set(
    serializeRegistrationRecord(registration),
    { merge: true }
  );
}

async function syncCanonicalRegistrationById(firestore, databaseUrl, registrationId) {
  await withClient(databaseUrl, async (client) => {
    const registration = await loadRegistrationRow(client, registrationId);
    if (!registration) return;
    await writeCanonicalRegistration(firestore, registration);
  });
}

async function syncRegistrationInboxEntry({
  firestore,
  databaseUrl,
  snapshotId,
  payload
}) {
  const registrationId =
    normalizeText(payload.registrationId) || normalizeText(payload.id) || snapshotId;
  const packageName = normalizeText(payload.packageName);
  const customerName = normalizeText(payload.customerName);
  const customerPhone = normalizeText(payload.customerPhone);

  if (!registrationId || !packageName || !customerName || !customerPhone) {
    await updateRegistrationInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: "Missing packageName, customerName, or customerPhone.",
      dbImported: false
    });
    return;
  }

  try {
    const result = await withClient(databaseUrl, async (client) => {
      await client.query("BEGIN");
      try {
        const existingById = await client.query(
          `
            SELECT "id"
            FROM "PackageRegistration"
            WHERE "id" = $1
            LIMIT 1
          `,
          [registrationId]
        );
        if (existingById.rows[0]?.id) {
          await client.query("COMMIT");
          return {
            status: "SYNCED",
            registrationId
          };
        }

        const duplicate = await client.query(
          `
            SELECT "id"
            FROM "PackageRegistration"
            WHERE "packageName" = $1
              AND "customerPhone" = $2
            ORDER BY "updatedAt" DESC
            LIMIT 1
          `,
          [packageName, customerPhone]
        );
        if (duplicate.rows[0]?.id) {
          await client.query("ROLLBACK");
          return {
            status: "CONFLICT",
            dbRegistrationId: duplicate.rows[0].id,
            syncError: "Registration already exists for this package and phone."
          };
        }

        const packageResult = await client.query(
          `
            SELECT "currentPriceJod", "sessionsCount"
            FROM "Package"
            WHERE "name" = $1
            LIMIT 1
          `,
          [packageName]
        );
        const pkg = packageResult.rows[0] || null;
        const createdAt =
          parseOptionalDate(payload.createdAt ?? payload.createdAtIso) || new Date();
        const updatedAt =
          parseOptionalDate(payload.updatedAt ?? payload.updatedAtIso) || createdAt;
        const periodStartsAt = parseOptionalDate(
          payload.periodStartsAt ?? payload.periodStartsAtIso
        );
        const periodEndsAt = periodStartsAt
          ? new Date(periodStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const nextPaymentDate =
          parseOptionalDate(payload.nextPaymentDate ?? payload.nextPaymentDateIso) ||
          periodEndsAt;
        const { billingPeriodKey, priceLockedUntil } = billingPeriodFromDate(createdAt);
        const basePriceJod = Math.max(
          0,
          Math.round(
            Number(payload.basePriceJod ?? pkg?.currentPriceJod ?? 0) || 0
          )
        );
        const discountType =
          normalizeText(payload.discountType || "NONE").toUpperCase() || "NONE";
        const discountValue =
          payload.discountValue == null ? null : Number(payload.discountValue);
        const sessionsLeft =
          payload.sessionsLeft == null
            ? Number(pkg?.sessionsCount || 0) > 0
              ? Math.round(Number(pkg?.sessionsCount || 0))
              : null
            : Math.max(0, Math.round(Number(payload.sessionsLeft || 0)));

        await client.query(
          `
            INSERT INTO "PackageRegistration" (
              "id",
              "packageName",
              "customerName",
              "customerPhone",
              "customerEmail",
              "customerAge",
              "isPaid",
              "basePriceJod",
              "discountType",
              "discountValue",
              "discountReason",
              "finalPriceJod",
              "billingPeriodKey",
              "priceLockedUntil",
              "periodStartsAt",
              "periodEndsAt",
              "sessionsLeft",
              "nextPaymentDate",
              "planLabel",
              "isFrozen",
              "frozenAt",
              "sessionsBonus",
              "status",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              FALSE,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20,
              $21,
              $22,
              $23,
              $24
            )
          `,
          [
            registrationId,
            packageName,
            customerName,
            customerPhone,
            normalizeNullableText(payload.customerEmail),
            payload.customerAge == null
              ? null
              : Math.max(0, Math.round(Number(payload.customerAge || 0))),
            basePriceJod,
            discountType,
            discountType === "NONE" || discountValue == null
              ? null
              : Math.round(discountValue),
            discountType === "NONE"
              ? null
              : normalizeNullableText(payload.discountReason),
            computeFinalPriceJod(basePriceJod, discountType, discountValue),
            billingPeriodKey,
            priceLockedUntil,
            periodStartsAt,
            periodEndsAt,
            sessionsLeft,
            nextPaymentDate,
            normalizeNullableText(payload.planLabel) || packageName,
            normalizeBoolean(payload.isFrozen, false),
            parseOptionalDate(payload.frozenAt ?? payload.frozenAtIso),
            Math.max(0, Math.round(Number(payload.sessionsBonus || 0))),
            normalizeRegistrationStatus(payload.status),
            createdAt,
            updatedAt
          ]
        );

        await client.query("COMMIT");
        return {
          status: "SYNCED",
          registrationId
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    if (result.status === "CONFLICT") {
      await updateRegistrationInboxEntry(firestore, snapshotId, {
        status: "CONFLICT",
        dbImported: false,
        dbRegistrationId: result.dbRegistrationId,
        syncError: result.syncError
      });
      return;
    }

    await syncCanonicalRegistrationById(
      firestore,
      databaseUrl,
      result.registrationId
    );
    await updateRegistrationInboxEntry(firestore, snapshotId, {
      status: "SYNCED",
      dbImported: true,
      dbRegistrationId: result.registrationId,
      syncError: null
    });
  } catch (error) {
    await updateRegistrationInboxEntry(firestore, snapshotId, {
      status: "ERROR",
      syncError: error instanceof Error ? error.message : "Registration import failed.",
      dbImported: false
    });
  }
}

module.exports = {
  syncBookingInboxEntry,
  syncBookingActionInboxEntry,
  syncRegistrationInboxEntry
};
