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
    };
  }>;
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

export function buildTrackerChildKey(name: string, age?: number | null): string {
  return `${normalizePlayerName(name)}|${age ?? ''}`;
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

  const existingByRegistrationId = new Map<string, admin.firestore.QueryDocumentSnapshot>();
  const existingByChildKey = new Map<string, admin.firestore.QueryDocumentSnapshot>();
  const existingByName = new Map<string, admin.firestore.QueryDocumentSnapshot>();

  for (const snap of existingPlayersSnapshot.docs) {
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
    if (registrationId && !existingByRegistrationId.has(registrationId)) {
      existingByRegistrationId.set(registrationId, snap);
    }
    if (childKey && !existingByChildKey.has(childKey)) {
      existingByChildKey.set(childKey, snap);
    }
    if (normalizedName && !existingByName.has(normalizedName)) {
      existingByName.set(normalizedName, snap);
    }
  }

  const writtenPlayerIds: string[] = [];
  const writtenPlayers: TrackerSyncResult['players'] = [];

  for (const player of players) {
    const playerName = normalizeText(player.name);
    if (!playerName) continue;

    const hasAge = Object.prototype.hasOwnProperty.call(player, 'age');
    const hasPosition = Object.prototype.hasOwnProperty.call(player, 'primaryPosition');
    const hasSessionsLeft = Object.prototype.hasOwnProperty.call(player, 'sessionsLeft');
    const hasNextPaymentDate = Object.prototype.hasOwnProperty.call(player, 'nextPaymentDate');
    const hasPlanLabel = Object.prototype.hasOwnProperty.call(player, 'planLabel');
    const hasPointsBalance = Object.prototype.hasOwnProperty.call(player, 'pointsBalance');

    const childKey =
      normalizeText(player.childKey) ||
      buildTrackerChildKey(playerName, hasAge ? player.age ?? null : null);
    const registrationId = normalizeText(player.registrationId);

    const existingSnap =
      (registrationId ? existingByRegistrationId.get(registrationId) : undefined) ||
      existingByChildKey.get(childKey) ||
      existingByName.get(normalizePlayerName(playerName));
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
      const nextPaymentTimestamp = toTimestamp(player.nextPaymentDate);
      membershipUpdate.nextPaymentDate = nextPaymentTimestamp;
    }

    if (hasPlanLabel) {
      membershipUpdate.planLabel = normalizeNullableText(player.planLabel);
    }

    const primaryPosition =
      (hasPosition ? normalizeText(player.primaryPosition) : '') ||
      normalizeText(existingData.primaryPosition) ||
      normalizeText(existingData.position) ||
      'Not set';

    const nextAge = hasAge
      ? (player.age == null ? null : Math.max(0, Math.round(coerceOptionalNumber(player.age) ?? 0)))
      : undefined;

    const playerUpdate: Record<string, unknown> = {
      id: playerRef.id,
      name: playerName,
      parentId: uid,
      guardianIds: [uid],
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
    };

    writtenPlayerIds.push(playerRef.id);
    writtenPlayers.push({
      id: playerRef.id,
      name: playerName,
      membership: membershipSummary,
    });

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

  return {
    playerIds,
    players: writtenPlayers,
  };
}
