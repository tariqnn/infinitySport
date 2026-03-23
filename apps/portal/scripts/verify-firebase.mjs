/**
 * Quick check: can we read the key file and query Firestore guestAccess?
 * Run from apps/portal: npm run verify-firebase
 * Loads apps/portal/.env.local automatically (no dotenv package required).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.join(__dirname, "..");
const envLocal = path.join(portalRoot, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envLocal)) {
    console.error("Missing", envLocal);
    console.error("Create it with FIREBASE_SERVICE_ACCOUNT_PATH=... or FIREBASE_SERVICE_ACCOUNT=...");
    process.exit(1);
  }
  const text = fs.readFileSync(envLocal, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // .env.local wins over inherited shell env (avoids stale Desktop path, etc.)
    process.env[key] = val;
  }
}

loadEnvLocal();

const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
let raw;
let keyAbsolutePath = "";
if (fromPath) {
  keyAbsolutePath = path.isAbsolute(fromPath)
    ? fromPath
    : path.resolve(portalRoot, fromPath);
  raw = fs.readFileSync(keyAbsolutePath, "utf8");
} else if (inline) {
  raw = inline;
} else {
  console.error("Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT in .env.local");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error("Invalid JSON in service account");
  process.exit(1);
}

const projectId = parsed.project_id || "infintysports-62c45";

console.log("— Diagnostics (no secrets printed) —");
if (keyAbsolutePath) console.log("Key file:", keyAbsolutePath);
console.log("project_id:", projectId);
console.log("client_email:", parsed.client_email || "(missing)");
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn(
    "WARNING: GOOGLE_APPLICATION_CREDENTIALS is set. Unset it for this test (may conflict):\n",
    "  PowerShell:  Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS",
  );
}
const pk = parsed.private_key;
if (typeof pk !== "string" || !pk.includes("BEGIN PRIVATE KEY")) {
  console.error(
    "private_key field is missing or broken (must contain BEGIN PRIVATE KEY). Re-download the JSON; do not paste the key by hand.",
  );
  process.exit(1);
}

// Step 1: can we obtain an OAuth token with this key?
try {
  const { JWT } = await import("google-auth-library");
  const jwtClient = new JWT({
    email: parsed.client_email,
    key: pk,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  await jwtClient.authorize();
  console.log("OAuth: access token obtained OK (JWT signed successfully).");
} catch (jwtErr) {
  const msg = String(jwtErr.message || jwtErr);
  console.error("OAuth/JWT FAILED — Google rejected the key before Firestore:", msg);
  if (/iat|exp|timeframe|short-lived/i.test(msg)) {
    console.error(
      "\n★ Most common cause: your PC date/time is wrong.\n  Windows: Settings → Time & language → Date & time → turn ON “Set time automatically” → “Sync now”.\n  Then run npm run verify-firebase again.",
    );
  }
  console.error(
    "\n→ If the clock is correct: Firebase Console → Project settings → Service accounts → Generate new private key.\n→ Save as UTF-8, replace your JSON; do not edit the private_key lines.",
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(parsed),
  projectId,
});

try {
  const snap = await admin.firestore().collection("guestAccess").limit(5).get();
  console.log("OK — Firestore read works. guestAccess sample size:", snap.size);
  process.exit(0);
} catch (e) {
  console.error("FAIL — Firestore after OK OAuth:", e.message || e);
  console.error(
    "\n→ Google Cloud Console (same project): APIs & Services → enable **Cloud Firestore API**.\n→ IAM: ensure this service account has **Cloud Datastore User** or **Firebase Admin** / Editor.\n→ Confirm Firestore database exists in project:",
    projectId,
  );
  process.exit(1);
}
