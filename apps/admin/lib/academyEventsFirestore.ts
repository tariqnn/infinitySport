/**
 * Academy events for Infinity Track mobile app — Firestore collection `academyEvents`.
 * Writes use Firebase Admin SDK only (client SDKs are denied by security rules).
 * @see docs/PORTAL_ACADEMY_EVENTS_FIREBASE.md
 */
import { randomUUID } from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { getFirestore } from "./firebase-admin";

export const ACADEMY_EVENTS_COLLECTION = "academyEvents";

export type AcademyEventRecord = {
  id: string;
  title: string;
  location: string;
  startAt: Date | null;
  endAt: Date | null;
  description: string | null;
  published: boolean;
  /** Extra field for website / admin; mobile app may ignore. */
  imageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function firestoreTimestampToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export function docToAcademyEvent(
  id: string,
  data: DocumentData | undefined,
): AcademyEventRecord {
  const d = data ?? {};
  return {
    id,
    title: String(d.title ?? ""),
    location: String(d.location ?? ""),
    startAt: firestoreTimestampToDate(d.startAt),
    endAt: firestoreTimestampToDate(d.endAt),
    description: d.description != null ? String(d.description) : null,
    published: Boolean(d.published),
    imageUrl: d.imageUrl != null ? String(d.imageUrl) : null,
    createdAt: firestoreTimestampToDate(d.createdAt),
    updatedAt: firestoreTimestampToDate(d.updatedAt),
  };
}

export async function listAcademyEvents(): Promise<AcademyEventRecord[]> {
  const db = getFirestore();
  const snap = await db.collection(ACADEMY_EVENTS_COLLECTION).get();
  const rows = snap.docs.map((doc) => docToAcademyEvent(doc.id, doc.data()));
  rows.sort((a, b) => {
    const ta = a.startAt?.getTime() ?? 0;
    const tb = b.startAt?.getTime() ?? 0;
    return ta - tb;
  });
  return rows;
}

export async function getAcademyEvent(
  id: string,
): Promise<AcademyEventRecord | null> {
  const db = getFirestore();
  const snap = await db.collection(ACADEMY_EVENTS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return docToAcademyEvent(id, snap.data());
}

export async function createAcademyEvent(input: {
  title: string;
  location?: string;
  startAt: Date;
  endAt?: Date | null;
  description?: string | null;
  published: boolean;
  imageUrl?: string | null;
}): Promise<string> {
  const db = getFirestore();
  const id = randomUUID();
  const ref = db.collection(ACADEMY_EVENTS_COLLECTION).doc(id);
  await ref.set({
    title: input.title,
    location: input.location ?? "",
    startAt: Timestamp.fromDate(input.startAt),
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    description: input.description ?? "",
    published: input.published,
    imageUrl: input.imageUrl ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function updateAcademyEvent(
  id: string,
  patch: {
    title?: string;
    location?: string;
    startAt?: Date;
    endAt?: Date | null;
    description?: string | null;
    published?: boolean;
    imageUrl?: string | null;
  },
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(ACADEMY_EVENTS_COLLECTION).doc(id);
  const data: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.location !== undefined) data.location = patch.location;
  if (patch.startAt !== undefined) data.startAt = Timestamp.fromDate(patch.startAt);
  if (patch.endAt !== undefined) {
    data.endAt = patch.endAt ? Timestamp.fromDate(patch.endAt) : null;
  }
  if (patch.description !== undefined) data.description = patch.description ?? "";
  if (patch.published !== undefined) data.published = patch.published;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  await ref.update(data);
}

export async function deleteAcademyEvent(id: string): Promise<void> {
  const db = getFirestore();
  await db.collection(ACADEMY_EVENTS_COLLECTION).doc(id).delete();
}

/** Shape returned to admin API / EventsManager (matches prior Prisma event JSON). */
export function academyEventToAdminApi(row: AcademyEventRecord) {
  return {
    id: row.id,
    title: row.title,
    date: (row.startAt ?? new Date()).toISOString(),
    endAt: row.endAt ? row.endAt.toISOString() : null,
    location: row.location || "Infinity Campus",
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? "",
    highlight: row.published,
    published: row.published,
  };
}
