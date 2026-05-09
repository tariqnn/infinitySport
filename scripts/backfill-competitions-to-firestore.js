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
    if (fs.existsSync(file)) loadEnv({ path: file, override: false });
  }
}

loadEnvironment();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

function resolveJsonFilePath(inputPath) {
  if (path.isAbsolute(inputPath)) return inputPath;
  const candidates = [
    path.resolve(process.cwd(), inputPath),
    path.resolve(process.cwd(), "apps", "portal", inputPath),
    path.resolve(process.cwd(), "apps", "web", inputPath),
  ];
  return (
    candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
  );
}

function loadServiceAccountJson() {
  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (fromPath) {
    const absolute = resolveJsonFilePath(fromPath);
    return fs.readFileSync(absolute, "utf8");
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) return inline;

  const fallback = fs
    .readdirSync(process.cwd(), { withFileTypes: true })
    .find(
      (entry) =>
        entry.isFile() && /firebase-adminsdk-.*\.json$/i.test(entry.name),
    );
  if (fallback)
    return fs.readFileSync(path.join(process.cwd(), fallback.name), "utf8");

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT before running the competition backfill.",
  );
}

function getFirestore() {
  if (!admin.apps.length) {
    const parsed = JSON.parse(loadServiceAccountJson());
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

function defaultCompetitionRate(competitionType) {
  const normalized = normalizeText(competitionType).toUpperCase();
  return normalized === "3X3" ||
    normalized === "3X3_MEN" ||
    normalized === "3X3_WOMEN"
    ? 50
    : 25;
}

function toTimestamp(value) {
  if (!value) return null;
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
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function serializeCompetition(input) {
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;
  return {
    id: normalizeText(input.id),
    competitionType: normalizeText(input.competitionType).toUpperCase(),
    participantName: normalizeNullableText(input.participantName),
    age: normalizeInteger(input.age),
    gender: normalizeNullableText(input.gender)?.toUpperCase() ?? null,
    customerPhone: normalizeNullableText(input.customerPhone),
    teamName: normalizeNullableText(input.teamName),
    playerOne: normalizeNullableText(input.playerOne),
    playerTwo: normalizeNullableText(input.playerTwo),
    playerThree: normalizeNullableText(input.playerThree),
    playerFour: normalizeNullableText(input.playerFour),
    isPaid: input.isPaid === true,
    amountDue:
      normalizeNumber(input.amountDue) ??
      defaultCompetitionRate(input.competitionType),
    amountPaid: normalizeNumber(input.amountPaid),
    paymentMethod:
      normalizeNullableText(input.paymentMethod)?.toUpperCase() ?? null,
    paidAt: toTimestamp(input.paidAt),
    paidAtIso: toIsoString(input.paidAt),
    source: normalizeText(input.source || "WEBSITE").toUpperCase(),
    status: normalizeText(input.status || "NEW").toUpperCase(),
    deleted: false,
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function main() {
  const firestore = getFirestore();
  const rows = await prisma.competitionRegistration.findMany({
    orderBy: { createdAt: "desc" },
  });

  let batch = firestore.batch();
  let ops = 0;
  let total = 0;

  for (const row of rows) {
    batch.set(
      firestore.collection("portalCompetitionRegistrations").doc(row.id),
      serializeCompetition(row),
      { merge: true },
    );
    ops += 1;
    total += 1;
    if (ops === 400) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  console.log(`Backfilled ${total} competition registrations to Firestore.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
