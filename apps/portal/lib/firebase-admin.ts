import * as admin from 'firebase-admin';

const globalForFirebase = globalThis as unknown as { firebaseAdmin: admin.app.App | undefined };

function initFirebaseAdmin(): admin.app.App {
  if (globalForFirebase.firebaseAdmin) return globalForFirebase.firebaseAdmin;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set. Provide the Firebase service account JSON string.');
  }

  let credential: admin.credential.Credential;
  try {
    const parsed = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(parsed);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the full service account key JSON as the env value.');
  }

  const app = admin.initializeApp({ credential, projectId: 'infintysports-62c45' });
  globalForFirebase.firebaseAdmin = app;
  return app;
}

export function getFirebaseAuth(): admin.auth.Auth {
  const app = initFirebaseAdmin();
  return app.auth();
}

export function getFirestore(): admin.firestore.Firestore {
  const app = initFirebaseAdmin();
  return app.firestore();
}
