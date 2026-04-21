import * as admin from "firebase-admin";

export type RegistrationPackageSyncInput = {
  id: string;
  sportType?: string | null;
  name: string;
  description?: string | null;
  durationMonths?: number | null;
  sessionsCount?: number | null;
  trackingType?: string | null;
  pricingType?: string | null;
  currentPriceJod?: number | null;
  isActive?: boolean | null;
  showOnWebsite?: boolean | null;
  sortOrder?: number | null;
};

export type RegistrationRealtimeRecordInput = {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
  playerCode?: string | null;
  currentCycle?: number | null;
  sessionsLeft?: number | null;
  nextPaymentDate?: string | Date | admin.firestore.Timestamp | null;
  planLabel?: string | null;
  isPaid?: boolean | null;
  basePriceJod?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountReason?: string | null;
  finalPriceJod?: number | null;
  durationMonths?: number | null;
  periodStartsAt?: string | Date | admin.firestore.Timestamp | null;
  periodEndsAt?: string | Date | admin.firestore.Timestamp | null;
  isFrozen?: boolean | null;
  frozenAt?: string | Date | admin.firestore.Timestamp | null;
  sessionsBonus?: number | null;
  collected?: number | null;
  status?: string | null;
  source?: string | null;
  createdAt?: string | Date | admin.firestore.Timestamp | null;
  updatedAt?: string | Date | admin.firestore.Timestamp | null;
  deleted?: boolean | null;
};

export type RegistrationCanceledSessionSyncInput = {
  id: string;
  packageName: string;
  sessionDate: string | Date | admin.firestore.Timestamp;
  reason?: string | null;
  reasonDetail?: string | null;
  createdAt?: string | Date | admin.firestore.Timestamp | null;
};

export type MobileRegistrationInboxEntry = {
  id: string;
  data: Record<string, unknown>;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return fallback;
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

function toIsoDate(
  value: string | Date | admin.firestore.Timestamp | null | undefined,
): string | null {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

function normalizeSource(
  value: unknown,
): "APP" | "ADMIN" | "PORTAL_DB" | "WEBSITE" {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "PORTAL_DB") return "PORTAL_DB";
  if (normalized === "WEBSITE") return "WEBSITE";
  return "APP";
}

function serializePackage(input: RegistrationPackageSyncInput) {
  return {
    id: normalizeText(input.id),
    sportType: normalizeText(input.sportType),
    name: normalizeText(input.name),
    description: normalizeNullableText(input.description),
    durationMonths: Math.max(1, normalizeInteger(input.durationMonths) ?? 1),
    sessionsCount: Math.max(0, normalizeInteger(input.sessionsCount) ?? 0),
    trackingType: normalizeText(input.trackingType || "SESSIONS"),
    pricingType: normalizeText(input.pricingType || "FIXED"),
    currentPriceJod: normalizeNumber(input.currentPriceJod),
    isActive: normalizeBoolean(input.isActive, true),
    showOnWebsite: normalizeBoolean(input.showOnWebsite, true),
    sortOrder: normalizeInteger(input.sortOrder) ?? 0,
  };
}

function serializeRegistration(input: RegistrationRealtimeRecordInput) {
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
    durationMonths: Math.max(1, normalizeInteger(input.durationMonths) ?? 1),
    periodStartsAt: toTimestamp(input.periodStartsAt),
    periodStartsAtIso: toIsoString(input.periodStartsAt),
    periodEndsAt: toTimestamp(input.periodEndsAt),
    periodEndsAtIso: toIsoString(input.periodEndsAt),
    isFrozen: normalizeBoolean(input.isFrozen, false),
    frozenAt: toTimestamp(input.frozenAt),
    frozenAtIso: toIsoString(input.frozenAt),
    sessionsBonus: Math.max(0, normalizeInteger(input.sessionsBonus) ?? 0),
    collected: Math.max(0, normalizeNumber(input.collected) ?? 0),
    status: normalizeText(input.status || "ACTIVE"),
    source: normalizeSource(input.source),
    deleted: normalizeBoolean(input.deleted, false),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function serializeCanceledSession(input: RegistrationCanceledSessionSyncInput) {
  return {
    id: normalizeText(input.id),
    packageName: normalizeText(input.packageName),
    sessionDate: toTimestamp(input.sessionDate),
    sessionDateIso: toIsoDate(input.sessionDate),
    reason: normalizeText(input.reason || "OTHER"),
    reasonDetail: normalizeNullableText(input.reasonDetail),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso: toIsoString(input.createdAt),
  };
}

export async function syncPackagesToFirestore(params: {
  firestore: admin.firestore.Firestore;
  packages: RegistrationPackageSyncInput[];
}) {
  const serialized = params.packages
    .map(serializePackage)
    .filter((item) => item.id && item.name)
    .sort((a, b) => {
      const order = a.sortOrder - b.sortOrder;
      return order !== 0 ? order : a.name.localeCompare(b.name);
    });

  await params.firestore.collection("portalRegistrationConfig").doc("current").set(
    {
      packages: serialized,
      packagesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      packagesUpdatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

export async function syncCanceledSessionsToFirestore(params: {
  firestore: admin.firestore.Firestore;
  sessions: RegistrationCanceledSessionSyncInput[];
}) {
  const serialized = params.sessions
    .map(serializeCanceledSession)
    .filter((item) => item.id && item.packageName && item.sessionDateIso)
    .sort((a, b) => {
      if (a.packageName !== b.packageName) {
        return a.packageName.localeCompare(b.packageName);
      }
      return String(b.sessionDateIso || "").localeCompare(String(a.sessionDateIso || ""));
    });

  await params.firestore.collection("portalRegistrationConfig").doc("current").set(
    {
      canceledSessions: serialized,
      canceledSessionsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      canceledSessionsUpdatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

export async function syncRegistrationRecordToFirestore(params: {
  firestore: admin.firestore.Firestore;
  registration: RegistrationRealtimeRecordInput;
}) {
  await params.firestore
    .collection("portalRegistrations")
    .doc(params.registration.id)
    .set(serializeRegistration(params.registration), { merge: true });
}

export async function syncRegistrationRecordsToFirestore(params: {
  firestore: admin.firestore.Firestore;
  registrations: RegistrationRealtimeRecordInput[];
}) {
  if (!params.registrations.length) return;

  let batch = params.firestore.batch();
  let ops = 0;
  const commits: Promise<admin.firestore.WriteResult[]>[] = [];

  for (const registration of params.registrations) {
    batch.set(
      params.firestore.collection("portalRegistrations").doc(registration.id),
      serializeRegistration(registration),
      { merge: true },
    );
    ops += 1;
    if (ops === 400) {
      commits.push(batch.commit());
      batch = params.firestore.batch();
      ops = 0;
    }
  }

  if (ops > 0) commits.push(batch.commit());
  await Promise.all(commits);
}

export async function markRegistrationDeletedInFirestore(params: {
  firestore: admin.firestore.Firestore;
  registrationId: string;
}) {
  await params.firestore.collection("portalRegistrations").doc(params.registrationId).set(
    {
      id: params.registrationId,
      deleted: true,
      status: "DELETED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listMobileRegistrationInboxEntries(params: {
  firestore: admin.firestore.Firestore;
  limit?: number;
}): Promise<MobileRegistrationInboxEntry[]> {
  const { firestore, limit = 200 } = params;
  let snapshot: admin.firestore.QuerySnapshot;
  try {
    snapshot = await firestore
      .collection("portalRegistrationInbox")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
  } catch {
    snapshot = await firestore.collection("portalRegistrationInbox").limit(limit).get();
  }

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: (doc.data() as Record<string, unknown>) ?? {},
  }));
}

export async function updateMobileRegistrationInboxEntry(params: {
  firestore: admin.firestore.Firestore;
  id: string;
  data: Record<string, unknown>;
}) {
  await params.firestore.collection("portalRegistrationInbox").doc(params.id).set(
    {
      ...params.data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true },
  );
}
