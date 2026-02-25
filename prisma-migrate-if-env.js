const { spawnSync } = require("child_process");

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || !dbUrl.trim()) {
  console.log("[prisma-migrate-if-env] DATABASE_URL not set, skipping migrate deploy");
  process.exit(0);
}

console.log("[prisma-migrate-if-env] Running prisma migrate deploy");
const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy", "--schema=./prisma/schema.prisma"],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

if ((result.status ?? 1) !== 0) {
  console.error("[prisma-migrate-if-env] Migration failed");
  process.exit(result.status ?? 1);
}

console.log("[prisma-migrate-if-env] Migration deploy completed");
