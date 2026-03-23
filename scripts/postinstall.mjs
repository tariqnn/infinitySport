/**
 * Cross-platform postinstall (Windows cmd breaks on parentheses in root package.json paths).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNpm(args) {
  const r = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  return r.status === 0;
}

console.log("[postinstall] prisma generate…");
if (!runNpm(["run", "prisma:generate"])) {
  console.warn("[postinstall] prisma:generate skipped or failed (OK if prisma not configured yet).");
}

console.log("[postinstall] @swc/helpers…");
if (!runNpm(["install", "@swc/helpers@0.5.18", "--ignore-scripts"])) {
  console.warn("[postinstall] @swc/helpers install failed.");
}
