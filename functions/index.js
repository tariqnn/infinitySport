const { Buffer } = require("node:buffer");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { Client } = require("pg");
const {
  syncBookingInboxEntry,
  syncBookingActionInboxEntry,
  syncRegistrationInboxEntry,
} = require("./directPortalSync");

const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM");
/** Owner WhatsApp in E.164, e.g. +962791234567 */
const OWNER_WHATSAPP = defineSecret("OWNER_WHATSAPP");
const DATABASE_URL_SECRET = defineSecret("DATABASE_URL");

const bookingSecrets = [];
const databaseSecrets = [DATABASE_URL_SECRET];
const bookingInboxSecrets = [...bookingSecrets, ...databaseSecrets];

const APP_NOTIFICATION_TOPIC = "infinity_portal_all";
const APP_NOTIFICATION_CHANNEL_ID = "infinity_portal_high_priority";
const BOOKING_NOTIFICATION_DELIVERIES = "bookingNotificationDeliveries";
const BOOKING_NOTIFICATION_STATE = "bookingNotificationState";
const REGISTRATION_NOTIFICATION_STATE = "registrationNotificationState";
const COMPETITION_NOTIFICATION_STATE = "competitionNotificationState";

if (!admin.apps.length) admin.initializeApp();

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function bookingIdFromData(data) {
  return normalizeText(data.id || data.bookingId || "");
}

function registrationIdFromData(data) {
  return normalizeText(data.id || data.registrationId || "");
}

function defaultCompetitionRate(competitionType) {
  const normalized = normalizeText(competitionType).toUpperCase();
  return normalized === "3X3" ||
    normalized === "3X3_MEN" ||
    normalized === "3X3_WOMEN"
    ? 50
    : 25;
}

function isAppSource(data) {
  return normalizeText(data.source).toUpperCase() === "APP";
}

function isDatabaseMirror(data) {
  return (
    normalizeText(data.mirroredBy) ===
    "checkDatabaseBookingsForOwnerNotification"
  );
}

function buildTopicNotification({ title, body, data }) {
  return {
    topic: APP_NOTIFICATION_TOPIC,
    notification: {
      title,
      body,
    },
    android: {
      priority: "high",
      notification: {
        channelId: APP_NOTIFICATION_CHANNEL_ID,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        defaultSound: true,
        priority: "high",
        sound: "default",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
    data,
  };
}

/**
 * Twilio WhatsApp: To must be whatsapp:+E164
 */
async function sendTwilioWhatsApp({ toE164, body }) {
  const sid = TWILIO_ACCOUNT_SID.value();
  const token = TWILIO_AUTH_TOKEN.value();
  const from = TWILIO_WHATSAPP_FROM.value();

  if (!sid || !token || !from) {
    console.log(
      "[booking-wa] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM",
    );
    return false;
  }
  if (!toE164?.startsWith("+")) {
    console.log(
      "[booking-wa] Skip: phone must be E.164 (start with +):",
      toE164,
    );
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    From: from,
    To: `whatsapp:${toE164}`,
    Body: body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio WhatsApp failed (${response.status}): ${text}`);
  }
  return true;
}

function bookingNotificationDocId(bookingId) {
  return `booking_${normalizeText(bookingId).replace(/[^\w.-]/g, "_")}`;
}

async function wasBookingOwnerNotified(bookingId) {
  if (!bookingId) return true;
  const snapshot = await admin
    .firestore()
    .collection(BOOKING_NOTIFICATION_DELIVERIES)
    .doc(bookingNotificationDocId(bookingId))
    .get();
  return snapshot.exists;
}

async function markBookingOwnerNotified(bookingId, source) {
  if (!bookingId) return;
  await admin
    .firestore()
    .collection(BOOKING_NOTIFICATION_DELIVERIES)
    .doc(bookingNotificationDocId(bookingId))
    .set(
      {
        bookingId,
        source,
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function sendOwnerBookingNotification(data, sourceCollection) {
  const bookingId = normalizeText(data.id || data.bookingId || "");
  const status = normalizeText(data.status || "PENDING").toUpperCase();
  const facilityArea = normalizeText(
    data.facilityArea || data.courtName || "-",
  );
  const customerName = normalizeText(data.customerName || data.name || "Guest");
  const customerPhone = normalizeText(data.customerPhone || data.phone || "");
  const startLabel = formatDate(data.startTime || data.startTimeIso);
  const endLabel = formatDate(data.endTime || data.endTimeIso);

  const sent = await sendBookingPushNotification({
    ...data,
    id: bookingId,
    bookingId,
    status,
    facilityArea,
    customerName,
    customerPhone,
    startTime: data.startTime || data.startTimeIso,
    endTime: data.endTime || data.endTimeIso,
    sourceCollection,
  });
  if (sent && bookingId) {
    await markBookingOwnerNotified(bookingId, sourceCollection);
    console.log(
      "[booking-push] owner portal app notification sent",
      bookingId,
      sourceCollection,
    );
  }
  return sent;
}

async function notifyBookingCreated(snapshot, sourceCollection) {
  const data = snapshot.data() || {};
  const bookingId = normalizeText(data.id || snapshot.id);
  const facilityArea = normalizeText(
    data.facilityArea || data.courtName || "-",
  );
  const customerName = normalizeText(data.customerName || data.name || "Guest");
  const customerPhone = normalizeText(data.customerPhone || data.phone || "");
  const startLabel = formatDate(data.startTime || data.startTimeIso);
  const endLabel = formatDate(data.endTime || data.endTimeIso);

  try {
    if (await wasBookingOwnerNotified(bookingId)) {
      console.log("[booking-wa] owner already notified", bookingId);
    } else {
      await sendOwnerBookingNotification(
        { ...data, id: bookingId },
        sourceCollection,
      );
    }
  } catch (e) {
    console.error("[booking-wa] owner message failed", e);
  }

  console.log("[booking-notify] customer WhatsApp skipped; Twilio disabled");
}

async function pollDatabaseBookingsForOwnerNotifications() {
  const databaseUrl = DATABASE_URL_SECRET.value();
  if (!databaseUrl) {
    console.log("[booking-db-wa] Missing DATABASE_URL secret");
    return;
  }

  const firestore = admin.firestore();
  const stateRef = firestore
    .collection(BOOKING_NOTIFICATION_STATE)
    .doc("dbBookingPoller");
  const now = new Date();
  const stateSnapshot = await stateRef.get();
  const lastCheckedAt = stateSnapshot.exists
    ? toDate(stateSnapshot.data()?.lastCheckedAt)
    : null;
  const initialLookbackMs = 30 * 60 * 1000;
  const overlapMs = 2 * 60 * 1000;
  const since = new Date(
    (lastCheckedAt?.getTime() ?? now.getTime() - initialLookbackMs) - overlapMs,
  );
  const mirrorStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const mirrorEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      `
        SELECT
          id,
          "companyId",
          status::text AS status,
          "facilityArea",
          "isPaid",
          "customerName",
          "customerPhone",
          "customerEmail",
          notes,
          "startTime",
          "endTime",
          "createdAt",
          "updatedAt"
        FROM "Booking"
        WHERE (
            "createdAt" > $1
            AND "createdAt" <= $2
          )
          OR (
            "updatedAt" > $1
            AND "updatedAt" <= $2
          )
          OR (
            "startTime" >= $3
            AND "startTime" <= $4
          )
        ORDER BY "createdAt" ASC
        LIMIT 200
      `,
      [since, now, mirrorStart, mirrorEnd],
    );

    let sentCount = 0;
    let mirroredCount = 0;
    for (const row of result.rows) {
      const bookingId = normalizeText(row.id);
      if (!bookingId) continue;

      await mirrorDatabaseBookingToFirestore(row);
      mirroredCount += 1;
      if (await wasBookingOwnerNotified(bookingId)) continue;
      const createdAt = toDate(row.createdAt);
      const isNewBooking = !!createdAt && createdAt > since && createdAt <= now;
      if (!isNewBooking) continue;

      try {
        const sent = await sendOwnerBookingNotification(
          {
            id: bookingId,
            status: row.status,
            facilityArea: row.facilityArea,
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            customerEmail: row.customerEmail,
            startTime: row.startTime,
            endTime: row.endTime,
          },
          "database",
        );
        if (sent) sentCount += 1;
      } catch (error) {
        console.error("[booking-db-wa] owner message failed", bookingId, error);
      }
    }

    await stateRef.set(
      {
        lastCheckedAt: now,
        lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
        checkedCount: result.rows.length,
        mirroredCount,
        sentCount,
      },
      { merge: true },
    );
    console.log(
      "[booking-db-wa] checked database bookings",
      result.rows.length,
      "mirrored",
      mirroredCount,
      "sent",
      sentCount,
    );
  } finally {
    await client.end();
  }
}

function hoursBetween(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return null;
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / 3600000);
}

async function mirrorDatabaseBookingToFirestore(row) {
  const bookingId = normalizeText(row.id);
  if (!bookingId) return;

  const startTime = toDate(row.startTime);
  const endTime = toDate(row.endTime);
  const createdAt = toDate(row.createdAt) || new Date();
  const updatedAt = toDate(row.updatedAt) || createdAt;
  const totalHours = hoursBetween(startTime, endTime);
  const isPaid = Boolean(row.isPaid);

  await admin
    .firestore()
    .collection("portalBookings")
    .doc(bookingId)
    .set(
      {
        id: bookingId,
        companyId: normalizeText(row.companyId) || null,
        courtName: normalizeText(row.facilityArea) || null,
        facilityArea: normalizeText(row.facilityArea) || null,
        startTime: startTime
          ? admin.firestore.Timestamp.fromDate(startTime)
          : null,
        startTimeIso: startTime ? startTime.toISOString() : null,
        endTime: endTime ? admin.firestore.Timestamp.fromDate(endTime) : null,
        endTimeIso: endTime ? endTime.toISOString() : null,
        status: normalizeText(row.status || "PENDING").toUpperCase(),
        source: "WEBSITE",
        isPaid,
        customerName: normalizeText(row.customerName) || null,
        customerPhone: normalizeText(row.customerPhone) || null,
        customerEmail: normalizeText(row.customerEmail) || null,
        notes: normalizeText(row.notes) || null,
        financials: {
          totalHours,
          totalAmount: null,
          paidAmount: null,
          refundAmount: null,
          netPaid: null,
          remainingAmount: null,
          paymentStatus: isPaid ? "PAID" : "UNPAID",
          latestPaymentMethod: null,
        },
        deleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        createdAtIso: createdAt.toISOString(),
        updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
        updatedAtIso: updatedAt.toISOString(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        mirroredBy: "checkDatabaseBookingsForOwnerNotification",
      },
      { merge: true },
    );

  console.log(
    "[booking-db-sync] mirrored booking to portalBookings",
    bookingId,
  );
}

function nullableInteger(value) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function nullableNumber(value) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampOrNull(value) {
  const date = toDate(value);
  return date ? admin.firestore.Timestamp.fromDate(date) : null;
}

function isoOrNull(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function isPackageRegistrationPaid(row) {
  const finalPrice = Math.max(0, Math.round(Number(row.finalPriceJod) || 0));
  const collected = Math.max(0, Math.round(Number(row.collected) || 0));
  if (finalPrice <= 0) return row.isPaid === true || collected > 0;
  return row.isPaid === true || collected >= finalPrice;
}

async function pollDatabasePackageRegistrations() {
  const databaseUrl = DATABASE_URL_SECRET.value();
  if (!databaseUrl) {
    console.log("[registration-db-sync] Missing DATABASE_URL secret");
    return;
  }

  const firestore = admin.firestore();
  const stateRef = firestore
    .collection(REGISTRATION_NOTIFICATION_STATE)
    .doc("dbRegistrationPoller");
  const now = new Date();
  const stateSnapshot = await stateRef.get();
  const lastCheckedAt = stateSnapshot.exists
    ? toDate(stateSnapshot.data()?.lastCheckedAt)
    : null;
  const initialLookbackMs = 30 * 60 * 1000;
  const overlapMs = 2 * 60 * 1000;
  const since = new Date(
    (lastCheckedAt?.getTime() ?? now.getTime() - initialLookbackMs) - overlapMs,
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
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
          r."sessionsUsedOverride",
          r."sessionsPerWeek",
          r."nextPaymentDate",
          r."planLabel",
          r."isPaid",
          r."basePriceJod",
          r."discountType",
          r."discountValue",
          r."discountReason",
          r."finalPriceJod",
          r."durationMonths",
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
        WHERE (
            r."createdAt" > $1
            AND r."createdAt" <= $2
          )
          OR (
            r."updatedAt" > $1
            AND r."updatedAt" <= $2
          )
        GROUP BY r."id"
        ORDER BY r."createdAt" ASC
        LIMIT 200
      `,
      [since, now],
    );

    let mirroredCount = 0;
    for (const row of result.rows) {
      await mirrorDatabasePackageRegistrationToFirestore(row);
      mirroredCount += 1;
    }

    await stateRef.set(
      {
        lastCheckedAt: now,
        lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
        checkedCount: result.rows.length,
        mirroredCount,
      },
      { merge: true },
    );
    console.log(
      "[registration-db-sync] checked database package registrations",
      result.rows.length,
      "mirrored",
      mirroredCount,
    );
  } finally {
    await client.end();
  }
}

async function mirrorDatabasePackageRegistrationToFirestore(row) {
  const registrationId = normalizeText(row.id);
  if (!registrationId) return;

  const createdAt = toDate(row.createdAt) || new Date();
  const updatedAt = toDate(row.updatedAt) || createdAt;

  await admin
    .firestore()
    .collection("portalRegistrations")
    .doc(registrationId)
    .set(
      {
        id: registrationId,
        packageName: normalizeText(row.packageName),
        customerName: normalizeText(row.customerName),
        customerPhone: normalizeText(row.customerPhone),
        customerEmail: normalizeText(row.customerEmail) || null,
        customerAge: nullableInteger(row.customerAge),
        playerCode: null,
        currentCycle: 1,
        sessionsLeft: nullableInteger(row.sessionsLeft),
        sessionsUsedOverride: nullableInteger(row.sessionsUsedOverride),
        sessionsPerWeek: nullableInteger(row.sessionsPerWeek),
        nextPaymentDate: timestampOrNull(row.nextPaymentDate),
        nextPaymentDateIso: isoOrNull(row.nextPaymentDate),
        planLabel: normalizeText(row.planLabel) || null,
        isPaid: isPackageRegistrationPaid(row),
        basePriceJod: Math.max(0, Math.round(Number(row.basePriceJod) || 0)),
        discountType: normalizeText(row.discountType || "NONE"),
        discountValue: nullableNumber(row.discountValue),
        discountReason: normalizeText(row.discountReason) || null,
        finalPriceJod: Math.max(0, Math.round(Number(row.finalPriceJod) || 0)),
        durationMonths: Math.max(1, Math.round(Number(row.durationMonths) || 1)),
        periodStartsAt: timestampOrNull(row.periodStartsAt),
        periodStartsAtIso: isoOrNull(row.periodStartsAt),
        periodEndsAt: timestampOrNull(row.periodEndsAt),
        periodEndsAtIso: isoOrNull(row.periodEndsAt),
        isFrozen: row.isFrozen === true,
        frozenAt: timestampOrNull(row.frozenAt),
        frozenAtIso: isoOrNull(row.frozenAt),
        sessionsBonus: Math.max(0, Math.round(Number(row.sessionsBonus) || 0)),
        collected: Math.max(0, Number(row.collected) || 0),
        status: normalizeText(row.status || "ACTIVE"),
        source: "PORTAL_DB",
        deleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        createdAtIso: createdAt.toISOString(),
        updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
        updatedAtIso: updatedAt.toISOString(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        mirroredBy: "checkDatabasePackageRegistrations",
      },
      { merge: true },
    );

  console.log(
    "[registration-db-sync] mirrored package registration to portalRegistrations",
    registrationId,
  );
}

async function pollDatabaseCompetitionRegistrations() {
  const databaseUrl = DATABASE_URL_SECRET.value();
  if (!databaseUrl) {
    console.log("[competition-db-sync] Missing DATABASE_URL secret");
    return;
  }

  const firestore = admin.firestore();
  const stateRef = firestore
    .collection(COMPETITION_NOTIFICATION_STATE)
    .doc("dbCompetitionPoller");
  const now = new Date();
  const stateSnapshot = await stateRef.get();
  const lastCheckedAt = stateSnapshot.exists
    ? toDate(stateSnapshot.data()?.lastCheckedAt)
    : null;
  const initialLookbackMs = 30 * 60 * 1000;
  const overlapMs = 2 * 60 * 1000;
  const since = new Date(
    (lastCheckedAt?.getTime() ?? now.getTime() - initialLookbackMs) - overlapMs,
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(
      `
        SELECT
          id,
          "competitionType",
          "participantName",
          age,
          gender,
          "customerPhone",
          "teamName",
          "playerOne",
          "playerTwo",
          "playerThree",
          "playerFour",
          "isPaid",
          "amountDue",
          "amountPaid",
          "paymentMethod",
          "paidAt",
          source,
          status,
          "createdAt",
          "updatedAt"
        FROM "CompetitionRegistration"
        WHERE (
            "createdAt" > $1
            AND "createdAt" <= $2
          )
          OR (
            "updatedAt" > $1
            AND "updatedAt" <= $2
          )
        ORDER BY "createdAt" ASC
        LIMIT 200
      `,
      [since, now],
    );

    for (const row of result.rows) {
      await mirrorDatabaseCompetitionToFirestore(row);
    }

    await stateRef.set(
      {
        lastCheckedAt: now,
        lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
        checkedCount: result.rows.length,
        mirroredCount: result.rows.length,
      },
      { merge: true },
    );
    console.log(
      "[competition-db-sync] checked database competition registrations",
      result.rows.length,
    );
  } finally {
    await client.end();
  }
}

async function mirrorDatabaseCompetitionToFirestore(row) {
  const registrationId = normalizeText(row.id);
  if (!registrationId) return;

  const createdAt = toDate(row.createdAt) || new Date();
  const updatedAt = toDate(row.updatedAt) || createdAt;
  const paidAt = toDate(row.paidAt);

  await admin
    .firestore()
    .collection("portalCompetitionRegistrations")
    .doc(registrationId)
    .set(
      {
        id: registrationId,
        competitionType: normalizeText(row.competitionType).toUpperCase(),
        participantName: normalizeText(row.participantName) || null,
        age: Number.isFinite(Number(row.age))
          ? Math.round(Number(row.age))
          : null,
        gender: normalizeText(row.gender).toUpperCase() || null,
        customerPhone: normalizeText(row.customerPhone) || null,
        teamName: normalizeText(row.teamName) || null,
        playerOne: normalizeText(row.playerOne) || null,
        playerTwo: normalizeText(row.playerTwo) || null,
        playerThree: normalizeText(row.playerThree) || null,
        playerFour: normalizeText(row.playerFour) || null,
        isPaid: Boolean(row.isPaid),
        amountDue: Number.isFinite(Number(row.amountDue))
          ? Number(row.amountDue)
          : defaultCompetitionRate(row.competitionType),
        amountPaid: Number.isFinite(Number(row.amountPaid))
          ? Number(row.amountPaid)
          : null,
        paymentMethod: normalizeText(row.paymentMethod).toUpperCase() || null,
        paidAt: paidAt ? admin.firestore.Timestamp.fromDate(paidAt) : null,
        paidAtIso: paidAt ? paidAt.toISOString() : null,
        source: normalizeText(row.source || "WEBSITE").toUpperCase(),
        status: normalizeText(row.status || "NEW").toUpperCase(),
        deleted: false,
        createdAt: admin.firestore.Timestamp.fromDate(createdAt),
        createdAtIso: createdAt.toISOString(),
        updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
        updatedAtIso: updatedAt.toISOString(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        mirroredBy: "checkDatabaseCompetitionRegistrations",
      },
      { merge: true },
    );

  console.log(
    "[competition-db-sync] mirrored registration to portalCompetitionRegistrations",
    registrationId,
  );
}

async function sendBookingPushNotification(data) {
  const title = "New booking";
  const facilityArea = normalizeText(
    data.facilityArea || data.courtName || "Court",
  );
  const status = normalizeText(data.status || "PENDING");
  const customerName = normalizeText(data.customerName || data.name || "");
  const startLabel = formatDate(data.startTime || data.startTimeIso);
  const body = customerName
    ? `${facilityArea} | ${customerName} | ${startLabel}`
    : `${facilityArea} | ${status}`;
  try {
    const messageId = await admin.messaging().send(
      buildTopicNotification({
        title,
        body,
        data: {
          type: "BOOKING_CREATED",
          bookingId: bookingIdFromData(data),
          status: normalizeText(data.status || "PENDING"),
          facilityArea,
          customerName,
          startTime:
            toDate(data.startTime || data.startTimeIso)?.toISOString() || "",
        },
      }),
    );
    console.log(
      "[booking-push] broadcast sent",
      messageId,
      bookingIdFromData(data),
    );
    return true;
  } catch (error) {
    console.error("[booking-push] broadcast failed", error);
    return false;
  }
}

async function sendRegistrationPushNotification(data) {
  const title = "New registration";
  const body = `${normalizeText(data.customerName || "Member")} | ${normalizeText(data.packageName || "Package")}`;
  try {
    await admin.messaging().send(
      buildTopicNotification({
        title,
        body,
        data: {
          type: "REGISTRATION_CREATED",
          registrationId: registrationIdFromData(data),
          packageName: normalizeText(data.packageName || ""),
          customerName: normalizeText(data.customerName || ""),
        },
      }),
    );
  } catch (error) {
    console.error("[registration-push] broadcast failed", error);
  }
}

async function sendCompetitionPushNotification(data) {
  const title = "New competition registration";
  const competitionType = normalizeText(data.competitionType || "Competition");
  const teamName = normalizeText(data.teamName || "");
  const participantName = normalizeText(data.participantName || "");
  const displayName = teamName || participantName || "Player";
  const body = `${displayName} | ${competitionType}`;
  try {
    await admin.messaging().send(
      buildTopicNotification({
        title,
        body,
        data: {
          type: "COMPETITION_REGISTRATION_CREATED",
          competitionRegistrationId: registrationIdFromData(data),
          competitionType,
          teamName,
          participantName,
        },
      }),
    );
  } catch (error) {
    console.error("[competition-push] broadcast failed", error);
  }
}

exports.onPortalBookingCreated = onDocumentCreated(
  {
    document: "portalBookings/{bookingId}",
    region: "us-central1",
    secrets: bookingSecrets,
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    const appSource = isAppSource(data);
    const databaseMirror = isDatabaseMirror(data);
    const skipOwnerNotification = appSource || databaseMirror;
    await Promise.allSettled([
      skipOwnerNotification
        ? Promise.resolve()
        : notifyBookingCreated(event.data, "portalBookings"),
      skipOwnerNotification
        ? Promise.resolve()
        : sendBookingPushNotification(data),
    ]);
  },
);

exports.onPortalBookingInboxCreated = onDocumentCreated(
  {
    document: "portalBookingInbox/{bookingId}",
    region: "us-central1",
    secrets: bookingInboxSecrets,
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    await Promise.allSettled([
      notifyBookingCreated(event.data, "portalBookingInbox"),
      isAppSource(data) ? sendBookingPushNotification(data) : Promise.resolve(),
      syncBookingInboxEntry({
        firestore: admin.firestore(),
        databaseUrl: DATABASE_URL_SECRET.value(),
        snapshotId: event.data.id,
        payload: data,
      }),
    ]);
  },
);

exports.onPortalBookingActionInboxCreated = onDocumentCreated(
  {
    document: "portalBookingActionInbox/{actionId}",
    region: "us-central1",
    secrets: databaseSecrets,
  },
  async (event) => {
    if (!event.data) return;
    await syncBookingActionInboxEntry({
      firestore: admin.firestore(),
      databaseUrl: DATABASE_URL_SECRET.value(),
      snapshotId: event.data.id,
      payload: event.data.data() || {},
    });
  },
);

exports.checkDatabaseBookingsForOwnerNotification = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Amman",
    region: "us-central1",
    secrets: bookingInboxSecrets,
  },
  pollDatabaseBookingsForOwnerNotifications,
);

exports.checkDatabasePackageRegistrations = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Amman",
    region: "us-central1",
    secrets: databaseSecrets,
  },
  pollDatabasePackageRegistrations,
);

exports.checkDatabaseCompetitionRegistrations = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Amman",
    region: "us-central1",
    secrets: databaseSecrets,
  },
  pollDatabaseCompetitionRegistrations,
);

exports.onPortalRegistrationCreated = onDocumentCreated(
  {
    document: "portalRegistrations/{registrationId}",
    region: "us-central1",
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    if (isAppSource(data)) return;
    await sendRegistrationPushNotification(data);
  },
);

exports.onPortalCompetitionRegistrationCreated = onDocumentCreated(
  {
    document: "portalCompetitionRegistrations/{registrationId}",
    region: "us-central1",
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    if (isAppSource(data) || data.deleted === true) return;
    await sendCompetitionPushNotification({
      ...data,
      id: normalizeText(data.id || event.data.id),
    });
  },
);

exports.onPortalRegistrationInboxCreated = onDocumentCreated(
  {
    document: "portalRegistrationInbox/{registrationId}",
    region: "us-central1",
    secrets: databaseSecrets,
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    await Promise.allSettled([
      isAppSource(data)
        ? sendRegistrationPushNotification(data)
        : Promise.resolve(),
      syncRegistrationInboxEntry({
        firestore: admin.firestore(),
        databaseUrl: DATABASE_URL_SECRET.value(),
        snapshotId: event.data.id,
        payload: data,
      }),
    ]);
  },
);
