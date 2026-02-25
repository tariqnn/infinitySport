const fs = require("fs");
const path = require("path");

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

const rootDir = process.cwd();
const webDir = path.join(rootDir, "apps", "web");
const webNextDir = path.join(webDir, ".next");
const rootNextDir = path.join(rootDir, ".next");
const rootStandaloneDir = path.join(rootNextDir, "standalone");
const hostingerOutputDir = path.join(rootDir, "hostinger-output");

if (!fs.existsSync(webNextDir)) {
  console.error(`[sync-web-next-output] Missing source build dir: ${webNextDir}`);
  process.exit(1);
}

if (fs.existsSync(rootNextDir)) {
  fs.rmSync(rootNextDir, { recursive: true, force: true });
}
copyIfExists(webNextDir, rootNextDir);
console.log(`[sync-web-next-output] Synced ${webNextDir} -> ${rootNextDir}`);

// Guarantee .next/server.js exists for hosts that deploy ".next" as output.
if (fs.existsSync(rootStandaloneDir)) {
  const rootNextEntrypoint = path.join(rootNextDir, "server.js");
  fs.writeFileSync(
    rootNextEntrypoint,
    "process.chdir(__dirname); require('./standalone/server.js');\n",
    "utf8",
  );
  console.log(`[sync-web-next-output] Wrote fallback entrypoint: ${rootNextEntrypoint}`);
}

// Also produce a non-hidden deploy folder for hosts that skip ".next" paths.
if (fs.existsSync(hostingerOutputDir)) {
  fs.rmSync(hostingerOutputDir, { recursive: true, force: true });
}
if (!copyIfExists(rootStandaloneDir, hostingerOutputDir)) {
  console.warn(`[sync-web-next-output] Standalone output not found: ${rootStandaloneDir}`);
  process.exit(0);
}

copyIfExists(path.join(rootNextDir, "static"), path.join(hostingerOutputDir, ".next", "static"));
copyIfExists(path.join(webDir, "public"), path.join(hostingerOutputDir, "public"));
copyIfExists(path.join(rootDir, "node_modules", ".prisma"), path.join(hostingerOutputDir, "node_modules", ".prisma"));
copyIfExists(path.join(rootDir, "node_modules", "@prisma"), path.join(hostingerOutputDir, "node_modules", "@prisma"));

console.log(`[sync-web-next-output] Prepared deploy dir: ${hostingerOutputDir}`);

// Hostinger lsnode in this account expects /public_html/server.js.
// When build runs under /public_html/.builds/source/repository, write a bootstrap file there.
const publicHtmlDir = path.resolve(rootDir, "..", "..", "..");
if (path.basename(publicHtmlDir) === "public_html") {
  const hostingerBootstrap = path.join(publicHtmlDir, "server.js");
  const bootstrapSource =
    "const path=require('path');\n" +
    "const target=path.join(__dirname,'.builds','source','repository','hostinger-output','server.js');\n" +
    "process.chdir(path.dirname(target));\n" +
    "require(target);\n";
  try {
    fs.writeFileSync(hostingerBootstrap, bootstrapSource, "utf8");
    console.log(`[sync-web-next-output] Wrote host bootstrap: ${hostingerBootstrap}`);
  } catch (error) {
    console.warn(`[sync-web-next-output] Failed writing host bootstrap: ${error}`);
  }
}
