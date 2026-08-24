import * as admin from "firebase-admin";

export type CompetitionRealtimeRecordInput = {
  id: string;
  eventId?: string | null;
  eventTitle?: string | null;
  competitionType: string;
  participantName?: string | null;
  age?: number | null;
  gender?: string | null;
  customerPhone?: string | null;
  jerseySize?: string | null;
  teamName?: string | null;
  playerOne?: string | null;
  playerTwo?: string | null;
  playerThree?: string | null;
  playerFour?: string | null;
  players?: unknown;
  isPaid?: boolean | null;
  amountDue?: number | null;
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paidAt?: string | Date | admin.firestore.Timestamp | null;
  source?: string | null;
  status?: string | null;
  createdAt?: string | Date | admin.firestore.Timestamp | null;
  updatedAt?: string | Date | admin.firestore.Timestamp | null;
  deleted?: boolean | null;
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

function normalizePlayers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const player = entry as Record<string, unknown>;
      const name = normalizeText(player.name);
      const age = normalizeInteger(player.age);
      const jerseySize = normalizeText(player.jerseySize).toUpperCase();
      if (!name || !age || !jerseySize) return null;
      return { name, age, jerseySize };
    })
    .filter((player): player is { name: string; age: number; jerseySize: string } => Boolean(player));
}

function defaultCompetitionRate(competitionType: string): number {
  const normalized = normalizeText(competitionType).toUpperCase();
  return normalized === "3X3" ||
    normalized === "3X3_MEN" ||
    normalized === "3X3_WOMEN"
    ? 50
    : 25;
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

function serializeCompetition(input: CompetitionRealtimeRecordInput) {
  const createdAtIso = toIsoString(input.createdAt) || new Date().toISOString();
  const updatedAtIso = toIsoString(input.updatedAt) || createdAtIso;

  return {
    id: normalizeText(input.id),
    eventId: normalizeNullableText(input.eventId),
    eventTitle: normalizeNullableText(input.eventTitle),
    competitionType: normalizeText(input.competitionType).toUpperCase(),
    participantName: normalizeNullableText(input.participantName),
    age: normalizeInteger(input.age),
    gender: normalizeNullableText(input.gender)?.toUpperCase() ?? null,
    customerPhone: normalizeNullableText(input.customerPhone),
    jerseySize: normalizeNullableText(input.jerseySize)?.toUpperCase() ?? null,
    teamName: normalizeNullableText(input.teamName),
    playerOne: normalizeNullableText(input.playerOne),
    playerTwo: normalizeNullableText(input.playerTwo),
    playerThree: normalizeNullableText(input.playerThree),
    playerFour: normalizeNullableText(input.playerFour),
    players: normalizePlayers(input.players),
    isPaid: normalizeBoolean(input.isPaid, false),
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
    deleted: normalizeBoolean(input.deleted, false),
    createdAt: toTimestamp(input.createdAt),
    createdAtIso,
    updatedAt: toTimestamp(input.updatedAt),
    updatedAtIso,
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export async function syncCompetitionRecordToFirestore(params: {
  firestore: admin.firestore.Firestore;
  registration: CompetitionRealtimeRecordInput;
}) {
  await params.firestore
    .collection("portalCompetitionRegistrations")
    .doc(params.registration.id)
    .set(serializeCompetition(params.registration), { merge: true });
}

export async function syncCompetitionRecordsToFirestore(params: {
  firestore: admin.firestore.Firestore;
  registrations: CompetitionRealtimeRecordInput[];
}) {
  if (!params.registrations.length) return;

  let batch = params.firestore.batch();
  let ops = 0;
  const commits: Promise<admin.firestore.WriteResult[]>[] = [];

  for (const registration of params.registrations) {
    batch.set(
      params.firestore
        .collection("portalCompetitionRegistrations")
        .doc(registration.id),
      serializeCompetition(registration),
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

export async function markCompetitionDeletedInFirestore(params: {
  firestore: admin.firestore.Firestore;
  registrationId: string;
}) {
  await params.firestore
    .collection("portalCompetitionRegistrations")
    .doc(params.registrationId)
    .set(
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
