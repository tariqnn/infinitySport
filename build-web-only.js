// Build script for web-only Hostinger deployment.
// Produces a standalone Next runtime that includes a root-level server.js.

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[copy] ${from} -> ${to}`);
}

const rootDir = process.cwd();
const webDir = path.join(rootDir, "apps", "web");
const webNextDir = path.join(webDir, ".next");
const standaloneDir = path.join(webNextDir, "standalone");
const webStaticDir = path.join(webNextDir, "static");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const webPublicDir = path.join(webDir, "public");
const standalonePublicDir = path.join(standaloneDir, "public");
const webNextServerEntrypoint = path.join(webNextDir, "server.js");

console.log("[hostinger-build] Starting web build");
console.log(`[hostinger-build] cwd: ${rootDir}`);

try {
  console.log("[hostinger-build] 1/4 Generate Prisma client");
  execSync("npm run prisma:generate", {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log("[hostinger-build] 2/4 Build Next.js web app");
  execSync("npm run build:web", {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (!fs.existsSync(standaloneDir)) {
    throw new Error(
      `Standalone build not found: ${standaloneDir}. Make sure output='standalone' is enabled.`,
    );
  }

  console.log("[hostinger-build] 3/4 Prepare standalone runtime assets");
  copyIfExists(webStaticDir, standaloneStaticDir);
  copyIfExists(webPublicDir, standalonePublicDir);

  // Prisma engines/client can be missed in some host traces; copy explicitly to be safe.
  const prismaRuntimeDir = path.join(rootDir, "node_modules", ".prisma");
  const prismaClientDir = path.join(rootDir, "node_modules", "@prisma");
  copyIfExists(
    prismaRuntimeDir,
    path.join(standaloneDir, "node_modules", ".prisma"),
  );
  copyIfExists(
    prismaClientDir,
    path.join(standaloneDir, "node_modules", "@prisma"),
  );

  // Fallback entrypoint for hosts that incorrectly use apps/web/.next as output dir.
  // This file lets lsnode require /public_html/server.js and delegate to standalone.
  fs.writeFileSync(
    webNextServerEntrypoint,
    "process.chdir(__dirname); require('./standalone/server.js');\n",
    "utf8",
  );
  console.log(`[hostinger-build] Wrote fallback entrypoint: ${webNextServerEntrypoint}`);

  console.log("[hostinger-build] 4/4 Sync root .next for local compatibility");
  execSync("node sync-web-next-output.js", {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log("[hostinger-build] Done");
  console.log(
    `[hostinger-build] Deploy output directory should be: ${path.join("apps", "web", ".next", "standalone")}`,
  );
} catch (error) {
  console.error("[hostinger-build] Failed");
  console.error(error && error.message ? error.message : error);
  if (error && error.stdout)
    console.error("STDOUT:", error.stdout.toString());
  if (error && error.stderr)
    console.error("STDERR:", error.stderr.toString());
  process.exit(1);
}
