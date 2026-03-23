import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as admin from 'firebase-admin';

const globalForFirebase = globalThis as unknown as { firebaseAdmin: admin.app.App | undefined };

/** Portal app root (…/apps/portal), so relative paths in .env.local resolve the same no matter what `process.cwd()` is. */
const PORTAL_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadServiceAccountJson(): string {
  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (fromPath) {
    const absolute = path.isAbsolute(fromPath)
      ? fromPath
      : path.resolve(PORTAL_ROOT, fromPath);
    try {
      return fs.readFileSync(absolute, 'utf8');
    } catch {
      throw new Error(
        `Could not read FIREBASE_SERVICE_ACCOUNT_PATH file: ${absolute}`,
      );
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) return inline;

  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_PATH (path to your Firebase Admin JSON key) or FIREBASE_SERVICE_ACCOUNT (JSON string).',
  );
}

function initFirebaseAdmin(): admin.app.App {
  if (globalForFirebase.firebaseAdmin) return globalForFirebase.firebaseAdmin;

  const raw = loadServiceAccountJson();

  let credential: admin.credential.Credential;
  let projectId = 'infintysports-62c45';
  try {
    const parsed = JSON.parse(raw) as { project_id?: string };
    credential = admin.credential.cert(parsed as admin.ServiceAccount);
    if (typeof parsed.project_id === 'string' && parsed.project_id.trim()) {
      projectId = parsed.project_id.trim();
    }
  } catch {
    throw new Error(
      'Firebase service account file or FIREBASE_SERVICE_ACCOUNT is not valid JSON.',
    );
  }

  const app = admin.initializeApp({ credential, projectId });
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
