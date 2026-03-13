import * as admin from "firebase-admin";

export type BlockedSlotRealtimeInput = {
  id: string;
  dayOfWeek: string;
  courtType: string;
  time: string;
  isBlocked: boolean;
  label?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function serializeBlockedSlot(input: BlockedSlotRealtimeInput) {
  return {
    id: input.id,
    dayOfWeek: normalizeText(input.dayOfWeek).toUpperCase(),
    courtType: normalizeText(input.courtType),
    time: normalizeText(input.time),
    isBlocked: input.isBlocked !== false,
    label: normalizeNullableText(input.label),
    startDate: toIsoDate(input.startDate),
    endDate: toIsoDate(input.endDate),
  };
}

export async function syncBlockedSlotsSnapshotToFirestore(params: {
  firestore: admin.firestore.Firestore;
  blockedSlots: BlockedSlotRealtimeInput[];
}) {
  const { firestore, blockedSlots } = params;
  const serialized = blockedSlots
    .map(serializeBlockedSlot)
    .sort((a, b) => {
      const labelA = a.label || "";
      const labelB = b.label || "";
      if (labelA !== labelB) return labelA.localeCompare(labelB);
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek.localeCompare(b.dayOfWeek);
      if (a.courtType !== b.courtType) return a.courtType.localeCompare(b.courtType);
      return a.time.localeCompare(b.time);
    });

  await firestore.collection("portalBookingAvailability").doc("current").set(
    {
      blockedSlots: serialized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      source: "portal",
    },
    { merge: true },
  );
}
