import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAuth, getFirestore } from '../../../lib/firebase-admin';
import * as admin from 'firebase-admin';

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, age, role, position } = body ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required to create a Firebase account.' }, { status: 400 });
    }
    if (!role || (role !== 'parent' && role !== 'coach')) {
      return NextResponse.json({ error: 'Role must be "parent" or "coach".' }, { status: 400 });
    }

    const auth = getFirebaseAuth();
    const firestore = getFirestore();

    // Check if user already exists in Firebase
    try {
      const existing = await auth.getUserByEmail(email);
      return NextResponse.json({
        error: `An account already exists for ${email} (uid: ${existing.uid}).`,
      }, { status: 409 });
    } catch (e: unknown) {
      const fbError = e as { code?: string };
      if (fbError.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    const password = generatePassword(10);

    // 1) Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    });

    const uid = userRecord.uid;

    // 2) Create users/{uid} doc
    const userDoc: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      role,
      playerId: null,
    };

    // 3) If role is parent, create players/{playerId} doc and link it
    if (role === 'parent') {
      const playerRef = firestore.collection('players').doc();
      const playerDoc: Record<string, unknown> = {
        id: playerRef.id,
        name: name.trim(),
        age: typeof age === 'number' && age > 0 ? age : null,
        position: typeof position === 'string' && position.trim() ? position.trim() : 'Not set',
        parentId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await playerRef.set(playerDoc);

      // 4) Link player to user doc
      userDoc.playerId = playerRef.id;
    }

    await firestore.collection('users').doc(uid).set(userDoc);

    return NextResponse.json({
      success: true,
      uid,
      email: email.trim(),
      password,
      role,
      playerId: userDoc.playerId || null,
    });
  } catch (e) {
    const err = e as Error;
    console.error('[tracker-account] Error:', err?.message ?? String(e));
    return NextResponse.json(
      { error: err?.message || 'Failed to create account.' },
      { status: 500 },
    );
  }
}
