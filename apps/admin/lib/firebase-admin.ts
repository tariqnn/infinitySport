/**
 * Firebase Admin for the admin app (Firestore writes, same project as portal).
 * Resolves FIREBASE_SERVICE_ACCOUNT_PATH relative to apps/admin (not portal).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as admin from "firebase-admin";

const globalForFirebase = globalThis as unknown as {
  firebaseAdmin?: admin.app.App;
};

const ADMIN_APP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadServiceAccountJson(): string {
  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (fromPath) {
    const absolute = path.isAbsolute(fromPath)
      ? fromPath
      : path.resolve(ADMIN_APP_ROOT, fromPath);
    try {
      return fs.readFileSync(absolute, "utf8");
    } catch {
      throw new Error(
        `Could not read FIREBASE_SERVICE_ACCOUNT_PATH: ${absolute}`,
      );
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (inline) return inline;

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT in apps/admin/.env.local (see .env.example).",
  );
}

function initFirebaseAdmin(): admin.app.App {
  if (globalForFirebase.firebaseAdmin) return globalForFirebase.firebaseAdmin;

  const raw = loadServiceAccountJson();
  let credential: admin.credential.Credential;
  let projectId = "infintysports-62c45";
  try {
    const parsed = JSON.parse(raw) as { project_id?: string };
    credential = admin.credential.cert(parsed as admin.ServiceAccount);
    if (typeof parsed.project_id === "string" && parsed.project_id.trim()) {
      projectId = parsed.project_id.trim();
    }
  } catch {
    throw new Error("Firebase service account JSON is invalid.");
  }

  const app = admin.initializeApp({ credential, projectId });
  globalForFirebase.firebaseAdmin = app;
  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  return initFirebaseAdmin().firestore();
}

export function getFirebaseAuth(): admin.auth.Auth {
  return initFirebaseAdmin().auth();
}
