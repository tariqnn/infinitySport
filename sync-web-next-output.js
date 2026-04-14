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
const runtimeEnvFile = path.join(hostingerOutputDir, "runtime-env.json");

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

const buildDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  "";
if (buildDbUrl && buildDbUrl.trim()) {
  fs.writeFileSync(
    runtimeEnvFile,
    JSON.stringify({ DATABASE_URL: buildDbUrl.trim() }, null, 2),
    "utf8",
  );
  console.log(`[sync-web-next-output] Wrote runtime env file: ${runtimeEnvFile}`);
}

console.log(`[sync-web-next-output] Prepared deploy dir: ${hostingerOutputDir}`);

// Hostinger lsnode in this account expects /public_html/server.js.
// When build runs under /public_html/.builds/source/repository, write a bootstrap file there.
const publicHtmlDir = path.resolve(rootDir, "..", "..", "..");
if (path.basename(publicHtmlDir) === "public_html") {
  const hostingerBootstrap = path.join(publicHtmlDir, "server.js");
  const bootstrapSource =
    "const fs=require('fs');\n" +
    "const path=require('path');\n" +
    "process.env.TOKIO_WORKER_THREADS=process.env.TOKIO_WORKER_THREADS||'1';\n" +
    "process.env.UV_THREADPOOL_SIZE=process.env.UV_THREADPOOL_SIZE||'1';\n" +
    "process.env.DB_GUARD_COOLDOWN_MS=process.env.DB_GUARD_COOLDOWN_MS||'15000';\n" +
    "process.env.DB_GUARD_PANIC_COOLDOWN_MS=process.env.DB_GUARD_PANIC_COOLDOWN_MS||'30000';\n" +
    "process.env.PRISMA_CLIENT_ENGINE_TYPE=process.env.PRISMA_CLIENT_ENGINE_TYPE||'library';\n" +
    "const envCandidates=[\n" +
    "path.join(__dirname,'hostinger-output','runtime-env.json'),\n" +
    "path.join(__dirname,'.builds','source','repository','hostinger-output','runtime-env.json'),\n" +
    "path.join(__dirname,'..','nodejs','hostinger-output','runtime-env.json')\n" +
    "];\n" +
    "if(!process.env.DATABASE_URL){\n" +
    "for(const p of envCandidates){\n" +
    "try{\n" +
    "if(!fs.existsSync(p)) continue;\n" +
    "const parsed=JSON.parse(fs.readFileSync(p,'utf8'));\n" +
    "if(parsed && typeof parsed.DATABASE_URL==='string' && parsed.DATABASE_URL.trim()){\n" +
    "process.env.DATABASE_URL=parsed.DATABASE_URL.trim();\n" +
    "console.log('[hostinger bootstrap] DATABASE_URL loaded from '+p);\n" +
    "break;\n" +
    "}\n" +
    "}catch(err){console.error('[hostinger bootstrap] Failed reading env file '+p,err);}\n" +
    "}\n" +
    "}\n" +
    "const candidates=[\n" +
    "path.join(__dirname,'hostinger-output','server.js'),\n" +
    "path.join(__dirname,'.builds','source','repository','hostinger-output','server.js'),\n" +
    "path.join(__dirname,'..','nodejs','hostinger-output','server.js'),\n" +
    "path.join(__dirname,'..','nodejs','server.js'),\n" +
    "path.join(__dirname,'.builds','source','repository','server.js')\n" +
    "];\n" +
    "const existing=candidates.filter((p)=>fs.existsSync(p));\n" +
    "if(existing.length===0){\n" +
    "console.error('[hostinger bootstrap] No startup target found. Checked:');\n" +
    "for(const p of candidates) console.error(' - '+p);\n" +
    "process.exit(1);\n" +
    "}\n" +
    "let lastErr=null;\n" +
    "for(const target of existing){\n" +
    "try{\n" +
    "process.chdir(path.dirname(target));\n" +
    "require(target);\n" +
    "lastErr=null;\n" +
    "break;\n" +
    "}catch(err){\n" +
    "lastErr=err;\n" +
    "console.error('[hostinger bootstrap] Failed target: '+target);\n" +
    "console.error(err);\n" +
    "}\n" +
    "}\n" +
    "if(lastErr){\n" +
    "console.error('[hostinger bootstrap] All startup targets failed.');\n" +
    "process.exit(1);\n" +
    "}\n";
  try {
    fs.writeFileSync(hostingerBootstrap, bootstrapSource, "utf8");
    console.log(`[sync-web-next-output] Wrote host bootstrap: ${hostingerBootstrap}`);
  } catch (error) {
    console.warn(`[sync-web-next-output] Failed writing host bootstrap: ${error}`);
  }

  // Touch tmp/restart.txt to signal Hostinger Passenger/lsnode to restart Node.js
  const tmpDir = path.join(publicHtmlDir, "tmp");
  const restartFile = path.join(tmpDir, "restart.txt");
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(restartFile, `restart-${Date.now()}\n`, "utf8");
    console.log(`[sync-web-next-output] Touched restart file: ${restartFile}`);
  } catch (error) {
    console.warn(`[sync-web-next-output] Failed touching restart file: ${error}`);
  }
}
