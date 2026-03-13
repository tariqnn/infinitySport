import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { prisma } from '../../../lib/db';
import { getFirebaseAuth, getFirestore } from '../../../lib/firebase-admin';
import { buildRegistrationMembershipSummaries } from '../../../lib/registrationMembership';
import { loadTrackerReceiptSyncInputsForContact } from '../../../lib/registrationReceiptSync';
import {
  buildTrackerChildKey,
  syncTrackerUserReceipts,
  syncTrackerUserAndPlayers,
  type TrackerPlayerSyncInput,
} from '../../../lib/trackerAccountSync';

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < length; i += 1) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
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

function buildParentPlayerInputs(body: Record<string, unknown>): TrackerPlayerSyncInput[] {
  const rawPlayers = Array.isArray(body.players) ? body.players : [];

  if (rawPlayers.length === 0) {
    const fallbackName = normalizeText(body.name);
    return [
      {
        childKey: buildTrackerChildKey(fallbackName, coerceOptionalNumber(body.age)),
        registrationId: normalizeText(body.registrationId) || null,
        name: fallbackName,
        age: coerceOptionalNumber(body.age),
        primaryPosition: normalizeText(body.primaryPosition || body.position) || null,
        sessionsLeft: coerceOptionalNumber(body.sessionsLeft),
        nextPaymentDate: normalizeText(body.nextPaymentDate) || null,
        planLabel: normalizeText(body.planLabel) || null,
        isPaid: typeof body.isPaid === 'boolean' ? body.isPaid : null,
        paymentStatus: normalizeText(body.paymentStatus) || null,
        finalPriceJod: coerceOptionalNumber(body.finalPriceJod),
        collectedJod: coerceOptionalNumber(body.collectedJod),
        remainingJod: coerceOptionalNumber(body.remainingJod),
        registrationStatus: normalizeText(body.registrationStatus) || null,
      },
    ];
  }

  return rawPlayers.map((player) => {
    const data = (player ?? {}) as Record<string, unknown>;
    const playerName = normalizeText(data.name);
    const playerAge = coerceOptionalNumber(data.age);
    return {
      childKey:
        normalizeText(data.childKey) ||
        buildTrackerChildKey(playerName, playerAge),
      registrationId: normalizeText(data.registrationId) || null,
      name: playerName,
      age: playerAge,
      primaryPosition: normalizeText(data.primaryPosition || data.position) || null,
      sessionsLeft: coerceOptionalNumber(data.sessionsLeft),
      nextPaymentDate: normalizeText(data.nextPaymentDate) || null,
      planLabel: normalizeText(data.planLabel) || null,
      isPaid: typeof data.isPaid === 'boolean' ? data.isPaid : null,
      paymentStatus: normalizeText(data.paymentStatus) || null,
      finalPriceJod: coerceOptionalNumber(data.finalPriceJod),
      collectedJod: coerceOptionalNumber(data.collectedJod),
      remainingJod: coerceOptionalNumber(data.remainingJod),
      registrationStatus: normalizeText(data.registrationStatus) || null,
    };
  });
}

function validateParentPlayers(players: TrackerPlayerSyncInput[]): string | null {
  if (players.length === 0) {
    return 'At least one linked player is required for parent accounts.';
  }

  for (const player of players) {
    const playerName = normalizeText(player.name);
    if (!playerName) {
      return 'Each linked player must have a name.';
    }

    const sessionsLeft = coerceOptionalNumber(player.sessionsLeft);
    if (sessionsLeft == null || sessionsLeft < 0) {
      return `sessionsLeft is required for ${playerName}.`;
    }

    const nextPaymentDate = normalizeText(player.nextPaymentDate);
    if (!nextPaymentDate || !toIsoDate(nextPaymentDate)) {
      return `nextPaymentDate is required for ${playerName}.`;
    }
  }

  return null;
}

function summarizeMembership(players: Awaited<ReturnType<typeof syncTrackerUserAndPlayers>>['players']) {
  return players[0]?.membership ?? null;
}

function trackerPlayerIdentityKey(player: {
  registrationId?: string | null;
  childKey?: string | null;
  name?: string | null;
  age?: number | null;
}): string {
  const registrationId = normalizeText(player.registrationId);
  if (registrationId) return `registration:${registrationId}`;

  const childKey = normalizeText(player.childKey);
  if (childKey) return `child:${childKey}`;

  return `name:${buildTrackerChildKey(normalizeText(player.name), coerceOptionalNumber(player.age))}`;
}

function trackerSummaryToPlayerInput(summary: Awaited<ReturnType<typeof buildRegistrationMembershipSummaries>>[number]): TrackerPlayerSyncInput {
  return {
    childKey: buildTrackerChildKey(summary.studentName, summary.customerAge),
    registrationId: summary.id,
    name: summary.studentName,
    age: summary.customerAge,
    primaryPosition: null,
    sessionsLeft: summary.sessionsRemaining,
    nextPaymentDate: summary.nextPaymentDate,
    planLabel: summary.planLabel || summary.packageName,
    pointsBalance: summary.pointsBalance,
    isPaid: summary.isPaid,
    paymentStatus: summary.paymentStatus,
    finalPriceJod: summary.finalPriceJod,
    collectedJod: summary.collectedJod,
    remainingJod: summary.remainingJod,
    registrationStatus: summary.status,
  };
}

async function enrichParentPlayers(
  players: TrackerPlayerSyncInput[],
  identity: {
    email?: string | null;
    phone?: string | null;
  },
): Promise<TrackerPlayerSyncInput[]> {
  const submittedRegistrationIds = Array.from(
    new Set(
      players
        .map((player) => normalizeText(player.registrationId))
        .filter(Boolean),
    ),
  );

  const normalizedEmail = normalizeEmail(identity.email);
  const normalizedPhone = normalizeText(identity.phone);
  const whereOr: Array<Record<string, unknown>> = [];

  if (normalizedEmail) {
    whereOr.push({
      customerEmail: { equals: normalizedEmail, mode: 'insensitive' },
    });
  }

  if (normalizedPhone) {
    whereOr.push({ customerPhone: normalizedPhone });
  }

  if (submittedRegistrationIds.length > 0) {
    whereOr.push({ id: { in: submittedRegistrationIds } });
  }

  if (whereOr.length === 0) return players;

  const registrations = await prisma.packageRegistration.findMany({
    where: whereOr.length === 1 ? whereOr[0] : { OR: whereOr },
    include: {
      receipts: {
        where: {
          status: 'ACTIVE',
          voidedAt: null,
        },
      },
    },
  });

  const summaries = await buildRegistrationMembershipSummaries(prisma, registrations);
  const summaryByRegistrationId = new Map(summaries.map((summary) => [summary.id, summary]));
  const summaryByChildKey = new Map(
    summaries.map((summary) => [
      buildTrackerChildKey(summary.studentName, summary.customerAge),
      summary,
    ]),
  );

  const merged = new Map<string, TrackerPlayerSyncInput>();

  for (const summary of summaries) {
    const summaryPlayer = trackerSummaryToPlayerInput(summary);
    merged.set(trackerPlayerIdentityKey(summaryPlayer), summaryPlayer);
  }

  for (const player of players) {
    const registrationId = normalizeText(player.registrationId);
    const normalizedChildKey =
      normalizeText(player.childKey) ||
      buildTrackerChildKey(normalizeText(player.name), coerceOptionalNumber(player.age));
    const summary = (registrationId
      ? summaryByRegistrationId.get(registrationId)
      : undefined) || summaryByChildKey.get(normalizedChildKey);
    const summaryChildKey = summary
      ? buildTrackerChildKey(summary.studentName, summary.customerAge)
      : null;

    const nextPlayer: TrackerPlayerSyncInput = {
      ...player,
      childKey: normalizedChildKey || summaryChildKey || null,
      registrationId: registrationId || summary?.id || null,
      name: normalizeText(player.name) || summary?.studentName || '',
      age: player.age ?? summary?.customerAge ?? null,
      sessionsLeft: summary?.sessionsRemaining ?? player.sessionsLeft ?? null,
      nextPaymentDate: summary?.nextPaymentDate ?? player.nextPaymentDate ?? null,
      planLabel: normalizeText(player.planLabel) || summary?.planLabel || summary?.packageName || null,
      isPaid: summary?.isPaid ?? player.isPaid ?? null,
      paymentStatus: summary?.paymentStatus ?? (normalizeText(player.paymentStatus) || null),
      finalPriceJod: summary?.finalPriceJod ?? coerceOptionalNumber(player.finalPriceJod),
      collectedJod: summary?.collectedJod ?? coerceOptionalNumber(player.collectedJod),
      remainingJod: summary?.remainingJod ?? coerceOptionalNumber(player.remainingJod),
      registrationStatus: summary?.status ?? (normalizeText(player.registrationStatus) || null),
    };

    merged.set(trackerPlayerIdentityKey(nextPlayer), nextPlayer);
  }

  return Array.from(merged.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeText(body.name);
    const email = normalizeEmail(body.email);
    const role = normalizeText(body.role);

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required to create a Firebase account.' }, { status: 400 });
    }
    if (role !== 'parent' && role !== 'coach') {
      return NextResponse.json({ error: 'Role must be "parent" or "coach".' }, { status: 400 });
    }

    const auth = getFirebaseAuth();
    const firestore = getFirestore();

    const parentPlayers = role === 'parent'
      ? await enrichParentPlayers(buildParentPlayerInputs(body), {
          email,
          phone: normalizeText(body.phone),
        })
      : [];
    if (role === 'parent') {
      const validationError = validateParentPlayers(parentPlayers);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    let userRecord: admin.auth.UserRecord | null = null;
    let created = false;
    let password: string | null = null;

    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: unknown) {
      const fbError = error as { code?: string };
      if (fbError.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (!userRecord) {
      password = generatePassword(10);
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });
      created = true;
    } else if (userRecord.displayName !== name) {
      userRecord = await auth.updateUser(userRecord.uid, { displayName: name });
    }

    const existingUserSnap = await firestore.collection('users').doc(userRecord.uid).get();
    const existingUserData = existingUserSnap.exists
      ? ((existingUserSnap.data() as Record<string, unknown>) ?? {})
      : {};
    const existingRole = normalizeText(existingUserData.role);
    if (existingRole && existingRole !== role) {
      return NextResponse.json(
        { error: `Existing Firebase user is already assigned to role "${existingRole}".` },
        { status: 409 },
      );
    }

    const syncResult = await syncTrackerUserAndPlayers({
      firestore,
      uid: userRecord.uid,
      email,
      name,
      role: role as 'parent' | 'coach',
      players: role === 'parent' ? parentPlayers : undefined,
    });

    if (role === 'parent') {
      const receiptSyncRows = await loadTrackerReceiptSyncInputsForContact({
        customerEmail: email,
        customerPhone: normalizeText(body.phone),
      });

      await syncTrackerUserReceipts({
        firestore,
        uid: userRecord.uid,
        receipts: receiptSyncRows,
      });
    }

    console.info('[tracker-account] membership sync', {
      uid: userRecord.uid,
      email,
      role,
      created,
      playerIds: syncResult.playerIds,
      membership: summarizeMembership(syncResult.players),
    });

    return NextResponse.json({
      ok: true,
      created,
      updatedExisting: !created,
      user: {
        uid: userRecord.uid,
        email,
        role,
      },
      ...(password ? { password } : {}),
      playerIds: syncResult.playerIds,
      membership: summarizeMembership(syncResult.players),
      players: syncResult.players.map((player) => ({
        id: player.id,
        name: player.name,
        membership: {
          sessionsLeft: player.membership.sessionsLeft,
          pointsBalance: player.membership.pointsBalance,
          nextPaymentDate: toIsoDate(player.membership.nextPaymentDate),
          planLabel: player.membership.planLabel,
          isPaid: player.membership.isPaid,
          paymentStatus: player.membership.paymentStatus,
          finalPriceJod: player.membership.finalPriceJod,
          collectedJod: player.membership.collectedJod,
          remainingJod: player.membership.remainingJod,
          registrationStatus: player.membership.registrationStatus,
        },
      })),
    });
  } catch (error) {
    const err = error as Error;
    console.error('[tracker-account] Error:', err?.message ?? String(error));
    return NextResponse.json(
      { error: err?.message || 'Failed to create account.' },
      { status: 500 },
    );
  }
}
