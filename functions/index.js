const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const BOOKING_NOTIFICATION_EMAIL = defineSecret("BOOKING_NOTIFICATION_EMAIL");
const BOOKING_FROM_EMAIL = defineSecret("BOOKING_FROM_EMAIL");

function normalizeText(value) {
  return String(value ?? "").trim();
}

function resolveSender(raw) {
  const candidate = normalizeText(raw);
  const hasEmail = /<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>/.test(candidate);
  const plainEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
  if (hasEmail || plainEmail) return candidate;
  return "onboarding@resend.dev";
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

async function sendResendEmail({ apiKey, from, to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html
    })
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${payload}`);
  }
}

async function notifyBookingCreated(snapshot, sourceCollection) {
  const data = snapshot.data() || {};
  const bookingId = normalizeText(data.id || snapshot.id);
  const status = normalizeText(data.status || "PENDING").toUpperCase();
  const facilityArea = normalizeText(data.facilityArea || data.courtName || "-");
  const customerName = normalizeText(data.customerName || data.name || "-");
  const customerPhone = normalizeText(data.customerPhone || data.phone || "-");
  const customerEmail = normalizeText(data.customerEmail || data.email || "-");
  const startLabel = formatDate(data.startTime || data.startTimeIso);
  const endLabel = formatDate(data.endTime || data.endTimeIso);

  const apiKey = RESEND_API_KEY.value();
  const to = BOOKING_NOTIFICATION_EMAIL.value();
  const from = resolveSender(BOOKING_FROM_EMAIL.value());

  if (!apiKey || !to) {
    console.log(
      "[booking-email] Missing secrets. Set RESEND_API_KEY and BOOKING_NOTIFICATION_EMAIL."
    );
    return;
  }

  const lines = [
    `Collection: ${sourceCollection}`,
    `Booking ID: ${bookingId}`,
    `Status: ${status}`,
    `Facility: ${facilityArea}`,
    `Start: ${startLabel}`,
    `End: ${endLabel}`,
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Email: ${customerEmail}`
  ];

  await sendResendEmail({
    apiKey,
    from,
    to,
    subject: `New Booking Created (${status})`,
    text: lines.join("\n"),
    html: `<h2>New Booking Created</h2><ul>${lines
      .map((line) => `<li>${line}</li>`)
      .join("")}</ul>`
  });
}

exports.onPortalBookingCreated = onDocumentCreated(
  {
    document: "portalBookings/{bookingId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY, BOOKING_NOTIFICATION_EMAIL, BOOKING_FROM_EMAIL]
  },
  async (event) => {
    if (!event.data) return;
    await notifyBookingCreated(event.data, "portalBookings");
  }
);

exports.onPortalBookingInboxCreated = onDocumentCreated(
  {
    document: "portalBookingInbox/{bookingId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY, BOOKING_NOTIFICATION_EMAIL, BOOKING_FROM_EMAIL]
  },
  async (event) => {
    if (!event.data) return;
    await notifyBookingCreated(event.data, "portalBookingInbox");
  }
);
