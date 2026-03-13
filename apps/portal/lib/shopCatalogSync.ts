import * as admin from 'firebase-admin';

export type TrackerShopItemSyncInput = {
  id: string;
  companyId: string;
  name: string;
  category?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  pointsCost: number;
  quantityAvailable?: number | null;
  status?: string | null;
  isFeatured?: boolean | null;
  redemptionNote?: string | null;
  sortOrder?: number | null;
  createdAt?: string | Date | admin.firestore.Timestamp | null;
  updatedAt?: string | Date | admin.firestore.Timestamp | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeNullableText(value: unknown): string | null {
  const next = normalizeText(value);
  return next || null;
}

function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toTimestamp(
  value: string | Date | admin.firestore.Timestamp | null | undefined,
): admin.firestore.Timestamp | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : admin.firestore.Timestamp.fromDate(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : admin.firestore.Timestamp.fromDate(parsed);
}

function toIsoDateTime(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return null;
}

export async function syncTrackerShopCatalog(params: {
  firestore: admin.firestore.Firestore;
  companyId: string;
  items: TrackerShopItemSyncInput[];
}): Promise<{ synced: number; deleted: number }> {
  const { firestore, companyId, items } = params;
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const collection = firestore.collection('portalShopItems');

  const existingSnapshot = await collection.where('companyId', '==', companyId).get();
  const nextIds = new Set(items.map((item) => item.id));

  const batches: admin.firestore.WriteBatch[] = [];
  let batch = firestore.batch();
  let ops = 0;

  const commitBatch = async () => {
    if (ops === 0) return;
    batches.push(batch);
    batch = firestore.batch();
    ops = 0;
  };

  for (const item of items) {
    const createdAt = toTimestamp(item.createdAt);
    const updatedAt = toTimestamp(item.updatedAt);

    batch.set(
      collection.doc(item.id),
      {
        id: item.id,
        companyId,
        name: normalizeText(item.name),
        category: normalizeNullableText(item.category),
        description: normalizeNullableText(item.description),
        imageUrl: normalizeNullableText(item.imageUrl),
        pointsCost: Math.max(1, Math.round(coerceOptionalNumber(item.pointsCost) ?? 1)),
        quantityAvailable:
          item.quantityAvailable == null
            ? null
            : Math.max(0, Math.round(coerceOptionalNumber(item.quantityAvailable) ?? 0)),
        status: normalizeNullableText(item.status) || 'ACTIVE',
        isFeatured: Boolean(item.isFeatured),
        redemptionNote: normalizeNullableText(item.redemptionNote),
        sortOrder: Math.max(0, Math.round(coerceOptionalNumber(item.sortOrder) ?? 0)),
        source: 'portal',
        createdAt,
        createdAtIso: toIsoDateTime(item.createdAt),
        updatedAt,
        updatedAtIso: toIsoDateTime(item.updatedAt),
        syncedAt: serverTimestamp,
      },
      { merge: true },
    );
    ops += 1;
    if (ops >= 400) {
      await commitBatch();
    }
  }

  let deleted = 0;
  for (const doc of existingSnapshot.docs) {
    if (nextIds.has(doc.id)) continue;
    batch.delete(doc.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await commitBatch();
    }
  }

  batch.set(
    firestore.collection('appMeta').doc('portalShop'),
    {
      lastSyncedAt: serverTimestamp,
      companyId,
      itemCount: items.length,
      activeCount: items.filter((item) => normalizeText(item.status || 'ACTIVE') === 'ACTIVE').length,
      featuredCount: items.filter((item) => Boolean(item.isFeatured)).length,
    },
    { merge: true },
  );
  ops += 1;
  await commitBatch();

  for (const writeBatch of batches) {
    await writeBatch.commit();
  }

  return { synced: items.length, deleted };
}
