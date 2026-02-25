const { spawnSync } = require("child_process");

const dbUrl = process.env.DATABASE_URL;
const maxAttempts = Math.max(
  1,
  Number(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS || "3"),
);
const retryDelayMs = Math.max(
  1000,
  Number(process.env.PRISMA_MIGRATE_RETRY_MS || "6000"),
);
const strictMode = process.env.PRISMA_MIGRATE_STRICT === "1";

if (!dbUrl || !dbUrl.trim()) {
  console.log(
    "[prisma-migrate-if-env] DATABASE_URL not set, skipping migrate deploy",
  );
  process.exit(0);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isAdvisoryLockTimeout(output) {
  return (
    /P1002/.test(output) &&
    /(pg_advisory_lock|advisory lock|Timed out trying to acquire)/i.test(output)
  );
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(
    `[prisma-migrate-if-env] Running prisma migrate deploy (attempt ${attempt}/${maxAttempts})`,
  );
  const result = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema=./prisma/schema.prisma"],
    {
      stdio: "pipe",
      encoding: "utf8",
      shell: true,
      env: process.env,
    },
  );

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  if ((result.status ?? 1) === 0) {
    console.log("[prisma-migrate-if-env] Migration deploy completed");
    process.exit(0);
  }

  const merged = `${stdout}\n${stderr}`;
  const lockTimeout = isAdvisoryLockTimeout(merged);
  if (lockTimeout && attempt < maxAttempts) {
    console.warn(
      `[prisma-migrate-if-env] Advisory lock timeout; retrying in ${retryDelayMs}ms`,
    );
    sleep(retryDelayMs);
    continue;
  }

  if (strictMode) {
    console.error("[prisma-migrate-if-env] Migration failed (strict mode)");
    process.exit(result.status ?? 1);
  }

  console.warn(
    "[prisma-migrate-if-env] Migration failed; continuing build (non-strict mode)",
  );
  process.exit(0);
}
