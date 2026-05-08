import * as admin from 'firebase-admin';

export type TrackerPlayerSyncInput = {
  childKey?: string | null;
  registrationId?: string | null;
  name: string;
  age?: number | null;
  primaryPosition?: string | null;
  sessionsLeft?: number | null;
  nextPaymentDate?: string | Date | admin.firestore.Timestamp | null;
  planLabel?: string | null;
  pointsBalance?: number | null;
  isPaid?: boolean | null;
  paymentStatus?: string | null;
  finalPriceJod?: number | null;
  collectedJod?: number | null;
  remainingJod?: number | null;
  registrationStatus?: string | null;
};

export type TrackerSyncResult = {
  playerIds: string[];
  players: Array<{
    id: string;
    name: string;
    membership: {
      sessionsLeft: number | null;
      pointsBalance: number;
      nextPaymentDate: string | null;
      planLabel: string | null;
      isPaid: boolean | null;
      paymentStatus: string | null;
      finalPriceJod: number | null;
      collectedJod: number | null;
      remainingJod: number | null;
      registrationStatus: string | null;
    };
  }>;
};

type TrackerSyncedPlayer = TrackerSyncResult['players'][number];

type TrackerPlayerLookupMaps = {
  byRegistrationId: Map<string, admin.firestore.QueryDocumentSnapshot>;
  byChildKey: Map<string, admin.firestore.QueryDocumentSnapshot>;
  byName: Map<string, admin.firestore.QueryDocumentSnapshot>;
};

export type TrackerReceiptSyncInput = {
  id: string;
  receiptId: string;
  registrationId?: string | null;
  childKey?: string | null;
  studentName?: string | null;
  studentAge?: number | null;
  packageName?: string | null;
  personName?: string | null;
  personPhone?: string | null;
  dateTimeIssued?: string | Date | admin.firestore.Timestamp | null;
  paymentPeriodKey?: string | null;
  amountPaid?: number | null;
  paymentMethod?: string | null;
  status?: string | null;
  voidedAt?: string | Date | admin.firestore.Timestamp | null;
  voidReason?: string | null;
  detailPath?: string | null;
  pdfPath?: string | null;
  planLabel?: string | null;
  nextPaymentDate?: string | Date | admin.firestore.Timestamp | null;
  paymentStatus?: string | null;
  finalPriceJod?: number | null;
  collectedJod?: number | null;
  remainingJod?: number | null;
  registrationStatus?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizePlayerName(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeNullableText(value: unknown): string | null {
  const next = normalizeText(value);
  return next || null;
}

function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coerceOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
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
  if (Number.isNaN(parsed.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(parsed);
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
  }
  return null;
}

function toIsoDateTime(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  return null;
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return isRecord(value) ? value : {};
}

function getExistingPlayerIds(source: Record<string, unknown>): string[] {
  const value = source.playerIds;
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function getExistingGuardianIds(source: Record<string, unknown>): string[] {
  const value = source.guardianIds;
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

export function buildTrackerChildKey(name: string, age?: number | null): string {
  return `${normalizePlayerName(name)}|${age ?? ''}`;
}

function createTrackerPlayerLookupMaps(): TrackerPlayerLookupMaps {
  return {
    byRegistrationId: new Map(),
    byChildKey: new Map(),
    byName: new Map(),
  };
}

function indexTrackerPlayerSnapshot(
  lookup: TrackerPlayerLookupMaps,
  snap: admin.firestore.QueryDocumentSnapshot,
) {
  const data = (snap.data() as Record<string, unknown>) ?? {};
  const syncData = getNestedRecord(data, 'portalSync');
  const registrationId = normalizeText(syncData.registrationId);
  const childKey =
    normalizeText(syncData.childKey) ||
    buildTrackerChildKey(
      normalizeText(data.name),
      coerceOptionalNumber(data.age),
    );
  const normalizedName = normalizePlayerName(data.name);
  if (registrationId && !lookup.byRegistrationId.has(registrationId)) {
    lookup.byRegistrationId.set(registrationId, snap);
  }
  if (childKey && !lookup.byChildKey.has(childKey)) {
    lookup.byChildKey.set(childKey, snap);
  }
  if (normalizedName && !lookup.byName.has(normalizedName)) {
    lookup.byName.set(normalizedName, snap);
  }
}

async function findExistingTrackerPlayerSnapshot(params: {
  firestore: admin.firestore.Firestore;
  player: TrackerPlayerSyncInput;
  lookup?: TrackerPlayerLookupMaps;
}): Promise<admin.firestore.QueryDocumentSnapshot | null> {
  const registrationId = normalizeText(params.player.registrationId);
  const playerName = normalizeText(params.player.name);
  const childKey =
    normalizeText(params.player.childKey) ||
    buildTrackerChildKey(playerName, coerceOptionalNumber(params.player.age));

  const fromLookup =
    (registrationId ? params.lookup?.byRegistrationId.get(registrationId) : undefined) ||
    (childKey ? params.lookup?.byChildKey.get(childKey) : undefined) ||
    params.lookup?.byName.get(normalizePlayerName(playerName));
  if (fromLookup) return fromLookup;

  if (registrationId) {
    const registrationSnapshot = await params.firestore
      .collection('players')
      .where('portalSync.registrationId', '==', registrationId)
      .limit(1)
      .get();
    if (!registrationSnapshot.empty) {
      const snap = registrationSnapshot.docs[0];
      if (params.lookup) indexTrackerPlayerSnapshot(params.lookup, snap);
      return snap;
    }
  }

  if (childKey) {
    const childKeySnapshot = await params.firestore
      .collection('players')
      .where('portalSync.childKey', '==', childKey)
      .limit(1)
      .get();
    if (!childKeySnapshot.empty) {
      const snap = childKeySnapshot.docs[0];
      if (params.lookup) indexTrackerPlayerSnapshot(params.lookup, snap);
      return snap;
    }
  }

  return null;
}

export async function syncTrackerPlayerProfile(params: {
  firestore: admin.firestore.Firestore;
  player: TrackerPlayerSyncInput;
  parentUid?: string | null;
  lookup?: TrackerPlayerLookupMaps;
}): Promise<TrackerSyncedPlayer> {
  const { firestore, player, parentUid = null, lookup } = params;
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const playerName = normalizeText(player.name);
  if (!playerName) {
    throw new Error('Player name is required.');
  }

  const hasAge = Object.prototype.hasOwnProperty.call(player, 'age');
  const hasPosition = Object.prototype.hasOwnProperty.call(player, 'primaryPosition');
  const hasSessionsLeft = Object.prototype.hasOwnProperty.call(player, 'sessionsLeft');
  const hasNextPaymentDate = Object.prototype.hasOwnProperty.call(player, 'nextPaymentDate');
  const hasPlanLabel = Object.prototype.hasOwnProperty.call(player, 'planLabel');
  const hasPointsBalance = Object.prototype.hasOwnProperty.call(player, 'pointsBalance');
  const hasIsPaid = Object.prototype.hasOwnProperty.call(player, 'isPaid');
  const hasPaymentStatus = Object.prototype.hasOwnProperty.call(player, 'paymentStatus');
  const hasFinalPriceJod = Object.prototype.hasOwnProperty.call(player, 'finalPriceJod');
  const hasCollectedJod = Object.prototype.hasOwnProperty.call(player, 'collectedJod');
  const hasRemainingJod = Object.prototype.hasOwnProperty.call(player, 'remainingJod');
  const hasRegistrationStatus = Object.prototype.hasOwnProperty.call(player, 'registrationStatus');

  const childKey =
    normalizeText(player.childKey) ||
    buildTrackerChildKey(playerName, hasAge ? player.age ?? null : null);
  const existingSnap = await findExistingTrackerPlayerSnapshot({
    firestore,
    player: { ...player, childKey, name: playerName },
    lookup,
  });
  const existingData = existingSnap
    ? ((existingSnap.data() as Record<string, unknown>) ?? {})
    : {};
  const existingOverview = getNestedRecord(existingData, 'portalOverview');
  const existingSync = getNestedRecord(existingData, 'portalSync');
  const playerRef = existingSnap
    ? existingSnap.ref
    : firestore.collection('players').doc();

  const nextPointsBalance =
    hasPointsBalance
      ? Math.max(0, coerceOptionalNumber(player.pointsBalance) ?? 0)
      : Math.max(0, coerceOptionalNumber(existingOverview.pointsBalance) ?? 0);

  const membershipUpdate: Record<string, unknown> = {
    pointsBalance: nextPointsBalance,
  };

  if (hasSessionsLeft) {
    membershipUpdate.sessionsLeft =
      player.sessionsLeft == null
        ? null
        : Math.max(0, Math.round(coerceOptionalNumber(player.sessionsLeft) ?? 0));
  }

  if (hasNextPaymentDate) {
    membershipUpdate.nextPaymentDate = toTimestamp(player.nextPaymentDate);
  }

  if (hasPlanLabel) {
    membershipUpdate.planLabel = normalizeNullableText(player.planLabel);
  }

  if (hasIsPaid) {
    membershipUpdate.isPaid = coerceOptionalBoolean(player.isPaid);
  }

  if (hasPaymentStatus) {
    membershipUpdate.paymentStatus = normalizeNullableText(player.paymentStatus);
  }

  if (hasFinalPriceJod) {
    const amount = coerceOptionalNumber(player.finalPriceJod);
    membershipUpdate.finalPriceJod = amount == null ? null : Math.max(0, Math.round(amount));
  }

  if (hasCollectedJod) {
    const amount = coerceOptionalNumber(player.collectedJod);
    membershipUpdate.collectedJod = amount == null ? null : Math.max(0, Math.round(amount));
  }

  if (hasRemainingJod) {
    const amount = coerceOptionalNumber(player.remainingJod);
    membershipUpdate.remainingJod = amount == null ? null : Math.max(0, Math.round(amount));
  }

  if (hasRegistrationStatus) {
    membershipUpdate.registrationStatus = normalizeNullableText(player.registrationStatus);
  }

  const primaryPosition =
    (hasPosition ? normalizeText(player.primaryPosition) : '') ||
    normalizeText(existingData.primaryPosition) ||
    normalizeText(existingData.position) ||
    'Not set';

  const nextAge = hasAge
    ? (player.age == null ? null : Math.max(0, Math.round(coerceOptionalNumber(player.age) ?? 0)))
    : undefined;

  const guardianIds = Array.from(
    new Set([
      ...getExistingGuardianIds(existingData),
      ...(parentUid ? [parentUid] : []),
    ]),
  );

  const playerUpdate: Record<string, unknown> = {
    id: playerRef.id,
    name: playerName,
    parentId: normalizeNullableText(parentUid) || normalizeNullableText(existingData.parentId),
    guardianIds,
    primaryPosition,
    position: primaryPosition,
    portalOverview: membershipUpdate,
    portalSync: {
      source: 'portal',
      childKey,
      registrationId:
        normalizeNullableText(player.registrationId) ||
        normalizeNullableText(existingSync.registrationId),
      syncedAt: serverTimestamp,
    },
    updatedAt: serverTimestamp,
  };

  if (nextAge !== undefined) {
    playerUpdate.age = nextAge;
  } else if (!existingSnap) {
    playerUpdate.age = null;
  }

  if (!existingSnap) {
    playerUpdate.createdAt = serverTimestamp;
  }

  await playerRef.set(playerUpdate, { merge: true });

  const membershipSummary = {
    sessionsLeft:
      hasSessionsLeft
        ? (player.sessionsLeft == null
            ? null
            : Math.max(0, Math.round(coerceOptionalNumber(player.sessionsLeft) ?? 0)))
        : coerceOptionalNumber(existingOverview.sessionsLeft),
    pointsBalance: nextPointsBalance,
    nextPaymentDate:
      hasNextPaymentDate
        ? toIsoDate(player.nextPaymentDate)
        : toIsoDate(existingOverview.nextPaymentDate),
    planLabel:
      hasPlanLabel
        ? normalizeNullableText(player.planLabel)
        : normalizeNullableText(existingOverview.planLabel),
    isPaid:
      hasIsPaid
        ? coerceOptionalBoolean(player.isPaid)
        : coerceOptionalBoolean(existingOverview.isPaid),
    paymentStatus:
      hasPaymentStatus
        ? normalizeNullableText(player.paymentStatus)
        : normalizeNullableText(existingOverview.paymentStatus),
    finalPriceJod:
      hasFinalPriceJod
        ? coerceOptionalNumber(player.finalPriceJod)
        : coerceOptionalNumber(existingOverview.finalPriceJod),
    collectedJod:
      hasCollectedJod
        ? coerceOptionalNumber(player.collectedJod)
        : coerceOptionalNumber(existingOverview.collectedJod),
    remainingJod:
      hasRemainingJod
        ? coerceOptionalNumber(player.remainingJod)
        : coerceOptionalNumber(existingOverview.remainingJod),
    registrationStatus:
      hasRegistrationStatus
        ? normalizeNullableText(player.registrationStatus)
        : normalizeNullableText(existingOverview.registrationStatus),
  };

  if (lookup) {
    const refreshedSnap = await playerRef.get();
    if (refreshedSnap.exists) {
      indexTrackerPlayerSnapshot(
        lookup,
        refreshedSnap as admin.firestore.QueryDocumentSnapshot,
      );
    }
  }

  return {
    id: playerRef.id,
    name: playerName,
    membership: membershipSummary,
  };
}

export async function syncTrackerPlayerAccount(params: {
  firestore: admin.firestore.Firestore;
  uid: string;
  email: string;
  name: string;
  playerId: string;
}): Promise<TrackerSyncResult> {
  const { firestore, uid, email, name, playerId } = params;
  const normalizedPlayerId = normalizeText(playerId);
  if (!normalizedPlayerId) {
    throw new Error('playerId is required for player accounts.');
  }

  const userRef = firestore.collection('users').doc(uid);
  const playerRef = firestore.collection('players').doc(normalizedPlayerId);
  const [existingUserSnap, playerSnap] = await Promise.all([userRef.get(), playerRef.get()]);
  if (!playerSnap.exists) {
    throw new Error('Linked player profile was not found.');
  }

  const existingUserData = existingUserSnap.exists
    ? ((existingUserSnap.data() as Record<string, unknown>) ?? {})
    : {};
  const playerData = (playerSnap.data() as Record<string, unknown>) ?? {};
  const overview = getNestedRecord(playerData, 'portalOverview');

  await userRef.set(
    {
      name: normalizeText(name) || normalizeText(playerData.name) || normalizeText(existingUserData.name),
      email: normalizeText(email) || normalizeText(existingUserData.email),
      role: 'player',
      playerId: normalizedPlayerId,
      playerIds: [normalizedPlayerId],
      photoUrl: normalizeText(existingUserData.photoUrl) || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    playerIds: [normalizedPlayerId],
    players: [
      {
        id: normalizedPlayerId,
        name: normalizeText(playerData.name),
        membership: {
          sessionsLeft: coerceOptionalNumber(overview.sessionsLeft),
          pointsBalance: Math.max(0, coerceOptionalNumber(overview.pointsBalance) ?? 0),
          nextPaymentDate: toIsoDate(overview.nextPaymentDate),
          planLabel: normalizeNullableText(overview.planLabel),
          isPaid: coerceOptionalBoolean(overview.isPaid),
          paymentStatus: normalizeNullableText(overview.paymentStatus),
          finalPriceJod: coerceOptionalNumber(overview.finalPriceJod),
          collectedJod: coerceOptionalNumber(overview.collectedJod),
          remainingJod: coerceOptionalNumber(overview.remainingJod),
          registrationStatus: normalizeNullableText(overview.registrationStatus),
        },
      },
    ],
  };
}

function mapGuestPlayerStatus(registrationStatus: unknown): string {
  const normalized = normalizeText(registrationStatus).toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'EXPIRING_SOON' || !normalized) return 'active';
  if (normalized === 'FROZEN') return 'frozen';
  if (normalized === 'EXPIRED') return 'expired';
  return normalized.toLowerCase();
}

export async function syncGuestAccessSnapshot(params: {
  firestore: admin.firestore.Firestore;
  uid?: string | null;
  email: string;
  name?: string | null;
  playerIds?: string[];
  photoUrl?: string | null;
  pointsBalance?: number | null;
  bookingPointsBalance?: number | null;
  manualPointsBalance?: number | null;
  source?: string | null;
}) {
  const normalizedEmail = normalizeText(params.email).toLowerCase();
  if (!normalizedEmail) return;

  const guestRef = params.firestore.collection('guestAccess').doc(normalizedEmail);
  const existingGuestSnap = await guestRef.get();
  const existingGuestData = existingGuestSnap.exists
    ? ((existingGuestSnap.data() as Record<string, unknown>) ?? {})
    : {};

  let playerIds = Array.isArray(params.playerIds)
    ? params.playerIds.map((playerId) => normalizeText(playerId)).filter(Boolean)
    : getExistingPlayerIds(existingGuestData);
  const parentUid =
    normalizeNullableText(params.uid) || normalizeNullableText(existingGuestData.parentUid);

  if (playerIds.length === 0 && parentUid) {
    const parentSnap = await params.firestore.collection('users').doc(parentUid).get();
    const parentData = parentSnap.exists
      ? ((parentSnap.data() as Record<string, unknown>) ?? {})
      : {};
    playerIds = getExistingPlayerIds(parentData);
  }

  const playerSnapshots = await Promise.all(
    playerIds.map((playerId) =>
      params.firestore.collection('players').doc(playerId).get(),
    ),
  );

  const players = playerSnapshots
    .filter((snap) => snap.exists)
    .map((snap) => {
      const data = (snap.data() as Record<string, unknown>) ?? {};
      const overview = getNestedRecord(data, 'portalOverview');
      return {
        id: snap.id,
        name: normalizeText(data.name),
        age: coerceOptionalNumber(data.age),
        primaryPosition:
          normalizeText(data.primaryPosition) ||
          normalizeText(data.position) ||
          'Not set',
        photoUrl: normalizeText(data.photoUrl) || '',
        sessionsLeft: coerceOptionalNumber(overview.sessionsLeft),
        pointsBalance: Math.max(0, coerceOptionalNumber(overview.pointsBalance) ?? 0),
        planLabel: normalizeNullableText(overview.planLabel),
        paymentStatus: normalizeNullableText(overview.paymentStatus),
        registrationStatus: normalizeNullableText(overview.registrationStatus),
        status: mapGuestPlayerStatus(overview.registrationStatus),
      };
    });

  await guestRef.set(
    {
      email: normalizedEmail,
      name: normalizeText(params.name) || normalizeText(existingGuestData.name),
      photoUrl:
        normalizeText(params.photoUrl) ||
        normalizeText(existingGuestData.photoUrl) ||
        '',
      parentUid,
      playerIds,
      players,
      pointsBalance:
        params.pointsBalance != null
          ? Math.max(0, coerceOptionalNumber(params.pointsBalance) ?? 0)
          : Math.max(0, coerceOptionalNumber(existingGuestData.pointsBalance) ?? 0),
      bookingPointsBalance:
        params.bookingPointsBalance != null
          ? Math.max(0, coerceOptionalNumber(params.bookingPointsBalance) ?? 0)
          : Math.max(0, coerceOptionalNumber(existingGuestData.bookingPointsBalance) ?? 0),
      manualPointsBalance:
        params.manualPointsBalance != null
          ? Math.max(0, coerceOptionalNumber(params.manualPointsBalance) ?? 0)
          : Math.max(0, coerceOptionalNumber(existingGuestData.manualPointsBalance) ?? 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source:
        normalizeText(params.source) ||
        normalizeText(existingGuestData.source) ||
        'portal',
    },
    { merge: true },
  );
}

export async function syncTrackerUserAndPlayers(params: {
  firestore: admin.firestore.Firestore;
  uid: string;
  email: string;
  name: string;
  role: 'parent' | 'coach';
  players?: TrackerPlayerSyncInput[];
}): Promise<TrackerSyncResult> {
  const { firestore, uid, email, name, role, players = [] } = params;
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const userRef = firestore.collection('users').doc(uid);
  const existingUserSnap = await userRef.get();
  const existingUserData = existingUserSnap.exists
    ? ((existingUserSnap.data() as Record<string, unknown>) ?? {})
    : {};

  const accountName = normalizeText(name) || normalizeText(existingUserData.name);
  const accountEmail = normalizeText(email) || normalizeText(existingUserData.email);

  if (role === 'coach' || players.length === 0) {
    await userRef.set(
      {
        name: accountName,
        email: accountEmail,
        role,
        photoUrl: normalizeText(existingUserData.photoUrl) || '',
        updatedAt: serverTimestamp,
      },
      { merge: true },
    );

    return {
      playerIds: getExistingPlayerIds(existingUserData),
      players: [],
    };
  }

  const existingPlayersSnapshot = await firestore
    .collection('players')
    .where('parentId', '==', uid)
    .get();
  const lookup = createTrackerPlayerLookupMaps();
  for (const snap of existingPlayersSnapshot.docs) {
    indexTrackerPlayerSnapshot(lookup, snap);
  }

  const writtenPlayerIds: string[] = [];
  const writtenPlayers: TrackerSyncResult['players'] = [];

  for (const player of players) {
    const syncedPlayer = await syncTrackerPlayerProfile({
      firestore,
      player,
      parentUid: uid,
      lookup,
    });
    writtenPlayerIds.push(syncedPlayer.id);
    writtenPlayers.push(syncedPlayer);
  }

  const existingPlayerIds = getExistingPlayerIds(existingUserData);
  const playerIds = Array.from(
    new Set([
      ...writtenPlayerIds,
      ...existingPlayerIds.filter((id) => !writtenPlayerIds.includes(id)),
    ]),
  );

  await userRef.set(
    {
      name: accountName,
      email: accountEmail,
      role: 'parent',
      playerId: playerIds[0] ?? null,
      playerIds,
      photoUrl: normalizeText(existingUserData.photoUrl) || '',
      updatedAt: serverTimestamp,
    },
    { merge: true },
  );

  await syncGuestAccessSnapshot({
    firestore,
    uid,
    email: accountEmail,
    name: accountName,
    playerIds,
    photoUrl: normalizeText(existingUserData.photoUrl) || '',
  });

  return {
    playerIds,
    players: writtenPlayers,
  };
}

export async function syncTrackerUserReceipts(params: {
  firestore: admin.firestore.Firestore;
  uid: string;
  receipts?: TrackerReceiptSyncInput[];
}): Promise<{ synced: number }> {
  const { firestore, uid, receipts = [] } = params;
  const userRef = firestore.collection('users').doc(uid);
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  if (receipts.length === 0) {
    await userRef.set(
      {
        portalReceiptsSyncedAt: serverTimestamp,
        updatedAt: serverTimestamp,
      },
      { merge: true },
    );
    return { synced: 0 };
  }

  const writeChunks: TrackerReceiptSyncInput[][] = [];
  for (let i = 0; i < receipts.length; i += 400) {
    writeChunks.push(receipts.slice(i, i + 400));
  }

  for (const chunk of writeChunks) {
    const batch = firestore.batch();

    for (const receipt of chunk) {
      const docRef = userRef.collection('portalReceipts').doc(receipt.id);
      const issuedAt = toTimestamp(receipt.dateTimeIssued);
      const nextPaymentDate = toTimestamp(receipt.nextPaymentDate);
      const voidedAt = toTimestamp(receipt.voidedAt);

      batch.set(
        docRef,
        {
          id: receipt.id,
          receiptId: normalizeText(receipt.receiptId) || receipt.id,
          registrationId: normalizeNullableText(receipt.registrationId),
          childKey: normalizeNullableText(receipt.childKey),
          studentName: normalizeNullableText(receipt.studentName) || normalizeNullableText(receipt.personName),
          studentAge:
            receipt.studentAge == null
              ? null
              : Math.max(0, Math.round(coerceOptionalNumber(receipt.studentAge) ?? 0)),
          packageName: normalizeNullableText(receipt.packageName),
          personName: normalizeNullableText(receipt.personName),
          personPhone: normalizeNullableText(receipt.personPhone),
          dateTimeIssued: issuedAt,
          dateTimeIssuedIso: toIsoDateTime(receipt.dateTimeIssued),
          paymentPeriodKey: normalizeNullableText(receipt.paymentPeriodKey),
          amountPaid: Math.max(0, Math.round(coerceOptionalNumber(receipt.amountPaid) ?? 0)),
          paymentMethod: normalizeNullableText(receipt.paymentMethod),
          status: normalizeNullableText(receipt.status) || 'ACTIVE',
          voidedAt,
          voidedAtIso: toIsoDateTime(receipt.voidedAt),
          voidReason: normalizeNullableText(receipt.voidReason),
          detailPath: normalizeNullableText(receipt.detailPath),
          pdfPath: normalizeNullableText(receipt.pdfPath),
          source: 'portal',
          documentType: 'REGISTRATION_RECEIPT',
          portalOverview: {
            planLabel: normalizeNullableText(receipt.planLabel),
            nextPaymentDate,
            nextPaymentDateIso: toIsoDate(receipt.nextPaymentDate),
            paymentStatus: normalizeNullableText(receipt.paymentStatus),
            finalPriceJod: coerceOptionalNumber(receipt.finalPriceJod),
            collectedJod: coerceOptionalNumber(receipt.collectedJod),
            remainingJod: coerceOptionalNumber(receipt.remainingJod),
            registrationStatus: normalizeNullableText(receipt.registrationStatus),
          },
          syncedAt: serverTimestamp,
          updatedAt: serverTimestamp,
        },
        { merge: true },
      );
    }

    batch.set(
      userRef,
      {
        portalReceiptsSyncedAt: serverTimestamp,
        updatedAt: serverTimestamp,
      },
      { merge: true },
    );

    await batch.commit();
  }

  return { synced: receipts.length };
}
