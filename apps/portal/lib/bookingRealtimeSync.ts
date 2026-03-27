import * as admin from "firebase-admin";

export type BookingSyncCourtInput = {
  name: string;
  hourlyRate: number;
  rewardPointsPerHour?: number | null;
};

export type BookingRealtimeRecordInput = {
  id: string;
  companyId?: string | null;
  facilityArea?: string | null;
  startTime?: string | Date | admin.firestore.Timestamp | null;
  endTime?: string | Date | admin.firestore.Timestamp | null;
  status?: string | null;
  source?: string | null;
  isPaid?: boolean | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  totalHours?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  refundAmount?: number | null;
  netPaid?: number | null;
  remainingAmount?: number | null;
  paymentStatus?: string | null;
  latestPaymentMethod?: string | null;
  createdAt?: string | Date | admin.firestore.Timestamp | null;
  updatedAt?: string | Date | admin.firestore.Timestamp | null;
  deleted?: boolean | null;
};

export type MobileBookingInboxEntry = {
  id: string;
  data: Record<string, unknown>;
};

export type MobileBookingActionInboxEntry = {
  id: string;
  data: Record<string, unknown>;
};

const BOOKING_COURT_ID_BY_NAME: Record<string, string> = {
  "Basketball AC": "basketball-ac",
  "Basketball 3x3": "basketball-3x3",
  Padel: "padel",
  Volleyball: "volleyball",
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeSource(value: unknown): "WEBSITE" | "APP" | "ADMIN" {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "WEBSITE") return "WEBSITE";
  if (normalized === "ADMIN") return "ADMIN";
  return "APP";
}

function normalizeStatus(value: unknown): string {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED") return "CONFIRMED";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTimestamp(
  value: string | Date | admin.firestore.Timestamp | null | undefined,
): admin.firestore.Timestamp | null {
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

function toIsoString(
  value: string | Date | admin.firestore.Timestamp | null | undefined,
): string | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function bookingCourtIdFromName(name: string | null | undefined): string {
  const normalized = normalizeText(name);
  if (BOOKING_COURT_ID_BY_NAME[normalized]) {
    return BOOKING_COURT_ID_BY_NAME[normalized];
  }
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "court";
}

export function bookingCourtNameFromId(id: string | null | undefined): string | null {
  const normalized = normalizeText(id).toLowerCase();
  const entry = Object.entries(BOOKING_COURT_ID_BY_NAME).find(([, value]) => value === normalized);
  return entry?.[0] ?? null;
}

function serializeCourt(input: BookingSyncCourtInput) {
  const name = normalizeText(input.name);
  return {
    id: bookingCourtIdFromName(name),
    name,
    hourlyRate: Math.max(0, Math.round(Number(input.hourlyRate || 0))),
    rewardPointsPerHour: Math.max(0, Math.round(Number(input.rewardPointsPerHour || 0))),
  };
}

function serializeBookingRecord(input: BookingRealtimeRecordInput) {
  const facilityArea = normalizeNullableText(input.facilityArea);
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;
  const startTime = toTimestamp(input.startTime);
  const endTime = toTimestamp(input.endTime);
  const totalHours = normalizeNumber(input.totalHours);
  const totalAmount = normalizeNumber(input.totalAmount);
  const paidAmount = normalizeNumber(input.paidAmount);
  const refundAmount = normalizeNumber(input.refundAmount);
  const netPaid = normalizeNumber(input.netPaid);
  const remainingAmount = normalizeNumber(input.remainingAmount);

  return {
    id: input.id,
    companyId: normalizeNullableText(input.companyId),
    courtId: bookingCourtIdFromName(facilityArea),
    courtName: facilityArea,
    facilityArea,
    startTime,
    startTimeIso: toIsoString(input.startTime),
    endTime,
    endTimeIso: toIsoString(input.endTime),
    status: normalizeStatus(input.status),
    source: normalizeSource(input.source),
    isPaid: Boolean(input.isPaid),
    customerName: normalizeNullableText(input.customerName),
    customerPhone: normalizeNullableText(input.customerPhone),
    customerEmail: normalizeNullableText(input.customerEmail),
    notes: normalizeNullableText(input.notes),
    financials: {
      totalHours,
      totalAmount,
      paidAmount,
      refundAmount,
      netPaid,
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

export async function syncBookingCourtsToFirestore(params: {
  firestore: admin.firestore.Firestore;
  courts: BookingSyncCourtInput[];
}) {
  const { firestore, courts } = params;
  const serialized = courts
    .map(serializeCourt)
    .filter((court) => !!court.name);

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

export async function syncBookingRecordToFirestore(params: {
  firestore: admin.firestore.Firestore;
  booking: BookingRealtimeRecordInput;
}) {
  const { firestore, booking } = params;
  await firestore
    .collection("portalBookings")
    .doc(booking.id)
    .set(serializeBookingRecord(booking), { merge: true });
}

export async function syncBookingRecordsToFirestore(params: {
  firestore: admin.firestore.Firestore;
  bookings: BookingRealtimeRecordInput[];
}) {
  const { firestore, bookings } = params;
  if (!bookings.length) return;

  let batch = firestore.batch();
  let ops = 0;
  const commits: Promise<admin.firestore.WriteResult[]>[] = [];

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

export async function markBookingDeletedInFirestore(params: {
  firestore: admin.firestore.Firestore;
  bookingId: string;
}) {
  const { firestore, bookingId } = params;
  await firestore.collection("portalBookings").doc(bookingId).set(
    {
      id: bookingId,
      status: "CANCELLED",
      deleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listMobileBookingInboxEntries(params: {
  firestore: admin.firestore.Firestore;
  limit?: number;
}): Promise<MobileBookingInboxEntry[]> {
  const { firestore, limit = 200 } = params;
  let snapshot: admin.firestore.QuerySnapshot;
  try {
    snapshot = await firestore
      .collection("portalBookingInbox")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
  } catch {
    snapshot = await firestore.collection("portalBookingInbox").limit(limit).get();
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: (doc.data() as Record<string, unknown>) ?? {},
  }));
}

export async function updateMobileBookingInboxEntry(params: {
  firestore: admin.firestore.Firestore;
  id: string;
  data: Record<string, unknown>;
}) {
  const { firestore, id, data } = params;
  await firestore.collection("portalBookingInbox").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function listMobileBookingActionInboxEntries(params: {
  firestore: admin.firestore.Firestore;
  limit?: number;
}): Promise<MobileBookingActionInboxEntry[]> {
  const { firestore, limit = 200 } = params;
  let snapshot: admin.firestore.QuerySnapshot;
  try {
    snapshot = await firestore
      .collection("portalBookingActionInbox")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
  } catch {
    snapshot = await firestore.collection("portalBookingActionInbox").limit(limit).get();
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: (doc.data() as Record<string, unknown>) ?? {},
  }));
}

export async function updateMobileBookingActionInboxEntry(params: {
  firestore: admin.firestore.Firestore;
  id: string;
  data: Record<string, unknown>;
}) {
  const { firestore, id, data } = params;
  await firestore.collection("portalBookingActionInbox").doc(id).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  );
}
