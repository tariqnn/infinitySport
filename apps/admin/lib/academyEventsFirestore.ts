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
  slug: string | null;
  location: string;
  startAt: Date | null;
  endAt: Date | null;
  description: string | null;
  published: boolean;
  /** Extra field for website / admin; mobile app may ignore. */
  imageUrl: string | null;
  videoUrl: string | null;
  galleryUrls: string[];
  contentType: "GALLERY" | "VIDEO" | "LIVE";
  registrationUrl: string | null;
  registrationEnabled: boolean;
  tournamentOptions: string[];
  jerseySizes: string[];
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
  const contentType = d.contentType === "LIVE" ? "LIVE" : d.contentType === "VIDEO" ? "VIDEO" : "GALLERY";
  return {
    id,
    title: String(d.title ?? ""),
    slug: d.slug != null ? String(d.slug) : null,
    location: String(d.location ?? ""),
    startAt: firestoreTimestampToDate(d.startAt),
    endAt: firestoreTimestampToDate(d.endAt),
    description: d.description != null ? String(d.description) : null,
    published: Boolean(d.published),
    imageUrl: d.imageUrl != null ? String(d.imageUrl) : null,
    videoUrl: d.videoUrl != null ? String(d.videoUrl) : null,
    galleryUrls: Array.isArray(d.galleryUrls)
      ? d.galleryUrls
          .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [],
    contentType,
    registrationUrl:
      d.registrationUrl != null ? String(d.registrationUrl) : null,
    registrationEnabled: Boolean(d.registrationEnabled),
    tournamentOptions: Array.isArray(d.tournamentOptions)
      ? d.tournamentOptions
          .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [],
    jerseySizes: Array.isArray(d.jerseySizes)
      ? d.jerseySizes
          .map((value: unknown) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
      : [],
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
  slug?: string | null;
  location?: string;
  startAt: Date;
  endAt?: Date | null;
  description?: string | null;
  published: boolean;
  imageUrl?: string | null;
  videoUrl?: string | null;
  galleryUrls?: string[];
  contentType?: "GALLERY" | "VIDEO" | "LIVE";
  registrationUrl?: string | null;
  registrationEnabled?: boolean;
  tournamentOptions?: string[];
  jerseySizes?: string[];
}): Promise<string> {
  const db = getFirestore();
  const id = randomUUID();
  const ref = db.collection(ACADEMY_EVENTS_COLLECTION).doc(id);
  await ref.set({
    title: input.title,
    slug: input.slug ?? null,
    location: input.location ?? "",
    startAt: Timestamp.fromDate(input.startAt),
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    description: input.description ?? "",
    published: input.published,
    imageUrl: input.imageUrl ?? null,
    videoUrl: input.videoUrl ?? null,
    galleryUrls: input.galleryUrls ?? [],
    contentType: input.contentType ?? "GALLERY",
    registrationUrl: input.registrationUrl ?? null,
    registrationEnabled: input.registrationEnabled ?? false,
    tournamentOptions: input.tournamentOptions ?? [],
    jerseySizes: input.jerseySizes ?? [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function updateAcademyEvent(
  id: string,
  patch: {
    title?: string;
    slug?: string | null;
    location?: string;
    startAt?: Date;
    endAt?: Date | null;
    description?: string | null;
    published?: boolean;
    imageUrl?: string | null;
    videoUrl?: string | null;
    galleryUrls?: string[];
    contentType?: "GALLERY" | "VIDEO" | "LIVE";
    registrationUrl?: string | null;
    registrationEnabled?: boolean;
    tournamentOptions?: string[];
    jerseySizes?: string[];
  },
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(ACADEMY_EVENTS_COLLECTION).doc(id);
  const data: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.slug !== undefined) data.slug = patch.slug;
  if (patch.location !== undefined) data.location = patch.location;
  if (patch.startAt !== undefined) data.startAt = Timestamp.fromDate(patch.startAt);
  if (patch.endAt !== undefined) {
    data.endAt = patch.endAt ? Timestamp.fromDate(patch.endAt) : null;
  }
  if (patch.description !== undefined) data.description = patch.description ?? "";
  if (patch.published !== undefined) data.published = patch.published;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  if (patch.videoUrl !== undefined) data.videoUrl = patch.videoUrl;
  if (patch.galleryUrls !== undefined) data.galleryUrls = patch.galleryUrls;
  if (patch.contentType !== undefined) data.contentType = patch.contentType;
  if (patch.registrationUrl !== undefined) {
    data.registrationUrl = patch.registrationUrl;
  }
  if (patch.registrationEnabled !== undefined) {
    data.registrationEnabled = patch.registrationEnabled;
  }
  if (patch.tournamentOptions !== undefined) {
    data.tournamentOptions = patch.tournamentOptions;
  }
  if (patch.jerseySizes !== undefined) data.jerseySizes = patch.jerseySizes;
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
    slug: row.slug ?? undefined,
    date: (row.startAt ?? new Date()).toISOString(),
    endAt: row.endAt ? row.endAt.toISOString() : null,
    location: row.location || "Infinity Sports",
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? "",
    videoUrl: row.videoUrl ?? "",
    galleryUrls: row.galleryUrls,
    contentType: row.contentType,
    registrationUrl: row.registrationUrl ?? "",
    registrationEnabled: row.registrationEnabled,
    tournamentOptions: row.tournamentOptions,
    jerseySizes: row.jerseySizes,
    highlight: row.published,
    published: row.published,
  };
}
