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

function normalizeSource(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "PORTAL_DB") return "PORTAL_DB";
  return "APP";
}

function serializePackage(input) {
  return {
    id: normalizeText(input.id),
    sportType: normalizeText(input.sportType),
    name: normalizeText(input.name),
    description: normalizeNullableText(input.description),
    sessionsCount: Math.max(0, normalizeInteger(input.sessionsCount) ?? 0),
    trackingType: normalizeText(input.trackingType || "SESSIONS"),
    pricingType: normalizeText(input.pricingType || "FIXED"),
    currentPriceJod: normalizeNumber(input.currentPriceJod),
    isActive: normalizeBoolean(input.isActive, true),
    sortOrder: normalizeInteger(input.sortOrder) ?? 0,
  };
}

function serializeRegistration(input) {
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

function serializeCanceledSession(input) {
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

async function syncPackagesToFirestore({ firestore, packages }) {
  const serialized = packages
    .map(serializePackage)
    .filter((item) => item.id && item.name)
    .sort((a, b) => {
      const order = a.sortOrder - b.sortOrder;
      return order !== 0 ? order : a.name.localeCompare(b.name);
    });

  await firestore.collection("portalRegistrationConfig").doc("current").set(
    {
      packages: serialized,
      packagesUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      packagesUpdatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

async function syncCanceledSessionsToFirestore({ firestore, sessions }) {
  const serialized = sessions
    .map(serializeCanceledSession)
    .filter((item) => item.id && item.packageName && item.sessionDateIso)
    .sort((a, b) => {
      if (a.packageName !== b.packageName) {
        return a.packageName.localeCompare(b.packageName);
      }
      return String(b.sessionDateIso || "").localeCompare(
        String(a.sessionDateIso || ""),
      );
    });

  await firestore.collection("portalRegistrationConfig").doc("current").set(
    {
      canceledSessions: serialized,
      canceledSessionsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      canceledSessionsUpdatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}

async function syncRegistrationRecordsToFirestore({ firestore, registrations }) {
  if (!registrations.length) return;

  let batch = firestore.batch();
  let ops = 0;
  const commits = [];

  for (const registration of registrations) {
    batch.set(
      firestore.collection("portalRegistrations").doc(registration.id),
      serializeRegistration(registration),
      { merge: true },
    );
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

async function run() {
  const firestore = getFirestore();

  const [registrations, packages, canceledSessions] = await Promise.all([
    prisma.packageRegistration.findMany({
      include: { receipts: { where: { status: "ACTIVE", voidedAt: null } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        sportType: true,
        name: true,
        description: true,
        sessionsCount: true,
        trackingType: true,
        pricingType: true,
        currentPriceJod: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    prisma.packageSessionCanceled.findMany({
      orderBy: [{ packageName: "asc" }, { sessionDate: "desc" }],
      select: {
        id: true,
        packageName: true,
        sessionDate: true,
        reason: true,
        reasonDetail: true,
        createdAt: true,
      },
    }),
  ]);

  await syncPackagesToFirestore({
    firestore,
    packages,
  });

  await syncCanceledSessionsToFirestore({
    firestore,
    sessions: canceledSessions,
  });

  await syncRegistrationRecordsToFirestore({
    firestore,
    registrations: registrations.map((row) => ({
      id: row.id,
      packageName: row.packageName,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      customerAge: row.customerAge,
      playerCode: null,
      currentCycle: 1,
      sessionsLeft: row.sessionsLeft,
      nextPaymentDate: row.nextPaymentDate,
      planLabel: row.planLabel,
      isPaid: row.isPaid,
      basePriceJod: row.basePriceJod,
      discountType: row.discountType,
      discountValue: row.discountValue,
      discountReason: row.discountReason,
      finalPriceJod: row.finalPriceJod,
      periodStartsAt: row.periodStartsAt,
      periodEndsAt: row.periodEndsAt,
      isFrozen: row.isFrozen,
      frozenAt: row.frozenAt,
      sessionsBonus: row.sessionsBonus,
      collected: (row.receipts || []).reduce(
        (runningTotal, receipt) =>
          runningTotal + Number(receipt.amountPaid || 0),
        0,
      ),
      status: row.status,
      source: "PORTAL_DB",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deleted: false,
    })),
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        registrationsSynced: registrations.length,
        packagesSynced: packages.length,
        canceledSessionsSynced: canceledSessions.length,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error("[backfill-registrations-to-firestore] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
