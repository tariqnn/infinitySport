const { Buffer } = require("node:buffer");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM");
/** Owner WhatsApp in E.164, e.g. +962791234567 */
const OWNER_WHATSAPP = defineSecret("OWNER_WHATSAPP");

const bookingSecrets = [
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  OWNER_WHATSAPP
];

const APP_NOTIFICATION_TOPIC = "infinity_portal_all";
const APP_NOTIFICATION_CHANNEL_ID = "infinity_portal_high_priority";

if (!admin.apps.length) admin.initializeApp();

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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
    minute: "2-digit"
  }).format(date);
}

function bookingIdFromData(data) {
  return normalizeText(data.id || data.bookingId || "");
}

function registrationIdFromData(data) {
  return normalizeText(data.id || data.registrationId || "");
}

function isAppSource(data) {
  return normalizeText(data.source).toUpperCase() === "APP";
}

function buildTopicNotification({ title, body, data }) {
  return {
    topic: APP_NOTIFICATION_TOPIC,
    notification: {
      title,
      body
    },
    android: {
      priority: "high",
      notification: {
        channelId: APP_NOTIFICATION_CHANNEL_ID,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        defaultSound: true,
        priority: "high",
        sound: "default"
      }
    },
    apns: {
      headers: {
        "apns-priority": "10"
      },
      payload: {
        aps: {
          sound: "default"
        }
      }
    },
    data
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
    console.log("[booking-wa] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM");
    return;
  }
  if (!toE164?.startsWith("+")) {
    console.log("[booking-wa] Skip: phone must be E.164 (start with +):", toE164);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    From: from,
    To: `whatsapp:${toE164}`,
    Body: body
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio WhatsApp failed (${response.status}): ${text}`);
  }
}

async function notifyBookingCreated(snapshot, sourceCollection) {
  const data = snapshot.data() || {};
  const bookingId = normalizeText(data.id || snapshot.id);
  const status = normalizeText(data.status || "PENDING").toUpperCase();
  const facilityArea = normalizeText(data.facilityArea || data.courtName || "-");
  const customerName = normalizeText(data.customerName || data.name || "Guest");
  const customerPhone = normalizeText(data.customerPhone || data.phone || "");
  const startLabel = formatDate(data.startTime || data.startTimeIso);
  const endLabel = formatDate(data.endTime || data.endTimeIso);

  const ownerTo = OWNER_WHATSAPP.value();
  if (!ownerTo) {
    console.log("[booking-wa] Missing OWNER_WHATSAPP secret");
    return;
  }

  const ownerBody = [
    "Infinity Sports - New booking",
    `Source: ${sourceCollection}`,
    `ID: ${bookingId}`,
    `Status: ${status}`,
    `Court: ${facilityArea}`,
    `Start: ${startLabel}`,
    `End: ${endLabel}`,
    `Customer: ${customerName}`,
    `Phone: ${customerPhone || "-"}`
  ].join("\n");

  try {
    await sendTwilioWhatsApp({ toE164: ownerTo, body: ownerBody });
  } catch (e) {
    console.error("[booking-wa] owner message failed", e);
  }

  if (customerPhone && customerPhone.startsWith("+")) {
    const userBody = [
      "Infinity Sports - Booking received",
      `Hi ${customerName},`,
      "We received your booking request.",
      `Court: ${facilityArea}`,
      `Start: ${startLabel}`,
      `End: ${endLabel}`,
      `Status: ${status}`,
      "We will contact you if we need anything else."
    ].join("\n");

    try {
      await sendTwilioWhatsApp({ toE164: customerPhone, body: userBody });
    } catch (e) {
      console.error("[booking-wa] customer message failed", e);
    }
  } else {
    console.log("[booking-wa] No customer WhatsApp (need E.164 phone starting with +)");
  }
}

async function sendBookingPushNotification(data) {
  const title = "New booking";
  const body = `${normalizeText(data.facilityArea || data.courtName || "Court")} | ${normalizeText(data.status || "PENDING")}`;
  try {
    await admin.messaging().send(
      buildTopicNotification({
        title,
        body,
        data: {
          type: "BOOKING_CREATED",
          bookingId: bookingIdFromData(data),
          status: normalizeText(data.status || "PENDING"),
          facilityArea: normalizeText(data.facilityArea || data.courtName || "")
        }
      })
    );
  } catch (error) {
    console.error("[booking-push] broadcast failed", error);
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
          customerName: normalizeText(data.customerName || "")
        }
      })
    );
  } catch (error) {
    console.error("[registration-push] broadcast failed", error);
  }
}

exports.onPortalBookingCreated = onDocumentCreated(
  {
    document: "portalBookings/{bookingId}",
    region: "us-central1",
    secrets: bookingSecrets
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    await Promise.allSettled([
      notifyBookingCreated(event.data, "portalBookings"),
      isAppSource(data) ? Promise.resolve() : sendBookingPushNotification(data)
    ]);
  }
);

exports.onPortalBookingInboxCreated = onDocumentCreated(
  {
    document: "portalBookingInbox/{bookingId}",
    region: "us-central1",
    secrets: bookingSecrets
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    await Promise.allSettled([
      notifyBookingCreated(event.data, "portalBookingInbox"),
      isAppSource(data) ? sendBookingPushNotification(data) : Promise.resolve()
    ]);
  }
);

exports.onPortalRegistrationCreated = onDocumentCreated(
  {
    document: "portalRegistrations/{registrationId}",
    region: "us-central1"
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    if (isAppSource(data)) return;
    await sendRegistrationPushNotification(data);
  }
);

exports.onPortalRegistrationInboxCreated = onDocumentCreated(
  {
    document: "portalRegistrationInbox/{registrationId}",
    region: "us-central1"
  },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data() || {};
    if (!isAppSource(data)) return;
    await sendRegistrationPushNotification(data);
  }
);
