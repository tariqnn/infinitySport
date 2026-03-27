/**
 * Reads Twilio vars from apps/portal/.env.local and sets Firebase Function secrets,
 * then deploys the bookingmailer codebase.
 *
 * Usage: npm run firebase:twilio-secrets
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, "apps", "portal", ".env.local");
const PROJECT = "infintysports-62c45";

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
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
    out[key] = val;
  }
  return out;
}

function setSecret(name, value) {
  console.log(`\n[firebase:twilio-secrets] Setting secret ${name}…`);
  const r = spawnSync(
    "firebase",
    ["functions:secrets:set", name, "--project", PROJECT, "--data-file=-", "--force"],
    {
      input: value,
      encoding: "utf8",
      shell: true,
      cwd: root,
    },
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    console.error(`\n[firebase:twilio-secrets] Failed to set ${name} (exit ${r.status}).`);
    process.exit(r.status ?? 1);
  }
}

function main() {
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${path.relative(root, envPath)}`);
    process.exit(1);
  }

  const env = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  const sid = env.TWILIO_ACCOUNT_SID?.trim();
  const token = env.TWILIO_AUTH_TOKEN?.trim();
  const from = (env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886").trim();
  const owner = env.OWNER_WHATSAPP?.trim();

  if (!sid || !token || !owner) {
    console.error(`
[firebase:twilio-secrets] Missing Twilio values in apps/portal/.env.local

Add these lines (from Twilio Console → Account / Messaging sandbox):

  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
  OWNER_WHATSAPP=+9627xxxxxxxx

Save the file, then run again:

  npm run firebase:twilio-secrets
`);
    process.exit(1);
  }

  setSecret("TWILIO_ACCOUNT_SID", sid);
  setSecret("TWILIO_AUTH_TOKEN", token);
  setSecret("TWILIO_WHATSAPP_FROM", from);
  setSecret("OWNER_WHATSAPP", owner);

  console.log("\n[firebase:twilio-secrets] Deploying functions:bookingmailer…\n");
  const deploy = spawnSync(
    "firebase",
    ["deploy", "--only", "functions:bookingmailer", "--project", PROJECT],
    { stdio: "inherit", shell: true, cwd: root },
  );
  process.exit(deploy.status ?? 0);
}

main();
