import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as admin from 'firebase-admin';

const globalForFirebase = globalThis as unknown as {
  firebaseAdmin: admin.app.App | undefined;
};

// Portal app root (.../apps/portal), so relative paths in .env.local resolve
// the same no matter what `process.cwd()` is.
const PORTAL_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PORTAL_ROOT, '..', '..');

function readJsonFile(absolutePath: string): string {
  return fs.readFileSync(absolutePath, 'utf8');
}

function resolveJsonFilePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const candidates = [
    path.resolve(PORTAL_ROOT, inputPath),
    path.resolve(process.cwd(), inputPath),
    path.resolve(REPO_ROOT, inputPath),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  return resolved || candidates[0];
}

function findFallbackServiceAccountPath(): string | null {
  const candidateDirs = Array.from(new Set([process.cwd(), PORTAL_ROOT, REPO_ROOT]));

  for (const dir of candidateDirs) {
    try {
      const match = fs
        .readdirSync(dir, { withFileTypes: true })
        .find(
          (entry) =>
            entry.isFile() && /firebase-adminsdk-.*\.json$/i.test(entry.name),
        );
      if (match) {
        return path.join(dir, match.name);
      }
    } catch {
      // Keep scanning remaining candidate directories.
    }
  }

  return null;
}

function loadServiceAccountJson(): string {
  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (configuredPath) {
    const absolute = resolveJsonFilePath(configuredPath);
    try {
      return readJsonFile(absolute);
    } catch {
      throw new Error(`Could not read Firebase service account file: ${absolute}`);
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) return inline;

  const fallbackPath = findFallbackServiceAccountPath();
  if (fallbackPath) {
    console.warn(
      `[firebase-admin] using discovered service account file: ${fallbackPath}`,
    );
    return readJsonFile(fallbackPath);
  }

  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_SERVICE_ACCOUNT, or place the Firebase Admin JSON key in the repo root.',
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
