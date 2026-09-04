const fs = require("fs");
const path = require("path");

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

function resolveInstalledPackageDir(packageName, fromDir, installRoot) {
  let currentDir = fromDir;
  while (true) {
    const packageDir = path.join(currentDir, "node_modules", packageName);
    if (fs.existsSync(path.join(packageDir, "package.json"))) return packageDir;
    if (currentDir === installRoot) return null;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir || !parentDir.startsWith(installRoot)) return null;
    currentDir = parentDir;
  }
}

function copyRuntimePackageTrees(packageNames, installRoot, targetNodeModulesDir) {
  const queue = packageNames.map((packageName) => ({ packageName, fromDir: installRoot }));
  const copied = new Set();

  while (queue.length > 0) {
    const { packageName, fromDir } = queue.shift();
    if (copied.has(packageName)) continue;

    const packageDir = resolveInstalledPackageDir(packageName, fromDir, installRoot);
    if (!packageDir) continue;

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
    );
    copyIfExists(packageDir, path.join(targetNodeModulesDir, packageName));
    copied.add(packageName);

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.optionalDependencies,
    };
    for (const dependencyName of Object.keys(dependencies)) {
      queue.push({ packageName: dependencyName, fromDir: packageDir });
    }
  }
}

function renameRuntimeModuleDirs(root) {
  const moduleDirs = [];

  function collect(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const entryPath = path.join(currentDir, entry.name);
      collect(entryPath);
      if (entry.name === "node_modules") moduleDirs.push(entryPath);
    }
  }

  collect(root);
  for (const moduleDir of moduleDirs) {
    const runtimeDir = path.join(path.dirname(moduleDir), "runtime_modules");
    fs.renameSync(moduleDir, runtimeDir);
  }
}

function makeStandaloneModulesPortable(standaloneDir) {
  const serverFile = path.join(standaloneDir, "server.js");
  const nodeModulesDir = path.join(standaloneDir, "node_modules");
  const portableModulesDir = path.join(standaloneDir, ".next", "hostinger_modules");
  const publicDir = path.join(standaloneDir, "public");
  const portablePublicDir = path.join(standaloneDir, ".next", "hostinger_public");

  if (!fs.existsSync(serverFile) || !fs.existsSync(nodeModulesDir)) return false;

  // Hostinger filters some framework packages from the standalone
  // `node_modules` directory. Keep the complete traced runtime inside `.next`,
  // which Hostinger copies intact, and link the packages back during startup.
  renameRuntimeModuleDirs(nodeModulesDir);
  fs.mkdirSync(path.dirname(portableModulesDir), { recursive: true });
  fs.renameSync(nodeModulesDir, portableModulesDir);

  // Hostinger's deploy sync has also been observed dropping the top-level
  // `public` folder next to server.js (images/video 404 while pages still
  // render). Keep a backup copy inside `.next`, alongside the module
  // snapshot above, and restore it at boot if it goes missing.
  if (fs.existsSync(publicDir)) {
    copyIfExists(publicDir, portablePublicDir);
  }

  const serverSource = fs.readFileSync(serverFile, "utf8");
  const nextRequire = "require('next')";
  if (!serverSource.includes(nextRequire)) {
    throw new Error(`[sync-web-next-output] Could not patch Next entrypoint: ${serverFile}`);
  }

  const runtimeLoader =
    "const fs = require('fs')\n" +
    "const portableModulesDir = path.join(__dirname, '.next', 'hostinger_modules')\n" +
    "const runtimeModuleDirs = []\n" +
    "function collectRuntimeModuleDirs(currentDir) {\n" +
    "  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {\n" +
    "    if (!entry.isDirectory()) continue\n" +
    "    const entryPath = path.join(currentDir, entry.name)\n" +
    "    collectRuntimeModuleDirs(entryPath)\n" +
    "    if (entry.name === 'runtime_modules') runtimeModuleDirs.push(entryPath)\n" +
    "  }\n" +
    "}\n" +
    "function linkPackage(source, target) {\n" +
    "  if (fs.existsSync(target)) return\n" +
    "  try {\n" +
    "    fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir')\n" +
    "  } catch (error) {\n" +
    "    if (error.code !== 'EEXIST') throw error\n" +
    "  }\n" +
    "}\n" +
    "if (fs.existsSync(portableModulesDir)) {\n" +
    "  collectRuntimeModuleDirs(portableModulesDir)\n" +
    "  for (const runtimeDir of runtimeModuleDirs) {\n" +
    "    const nodeModulesDir = path.join(path.dirname(runtimeDir), 'node_modules')\n" +
    "    if (!fs.existsSync(runtimeDir) || fs.existsSync(nodeModulesDir)) continue\n" +
    "    try { fs.renameSync(runtimeDir, nodeModulesDir) } catch (error) {\n" +
    "      if (error.code !== 'EEXIST' && error.code !== 'ENOENT') throw error\n" +
    "    }\n" +
    "  }\n" +
    "  const targetModulesDir = path.join(__dirname, 'node_modules')\n" +
    "  fs.mkdirSync(targetModulesDir, { recursive: true })\n" +
    "  for (const entry of fs.readdirSync(portableModulesDir, { withFileTypes: true })) {\n" +
    "    if (!entry.isDirectory()) continue\n" +
    "    const sourcePath = path.join(portableModulesDir, entry.name)\n" +
    "    if (!entry.name.startsWith('@')) {\n" +
    "      linkPackage(sourcePath, path.join(targetModulesDir, entry.name))\n" +
    "      continue\n" +
    "    }\n" +
    "    const targetScopeDir = path.join(targetModulesDir, entry.name)\n" +
    "    fs.mkdirSync(targetScopeDir, { recursive: true })\n" +
    "    for (const packageEntry of fs.readdirSync(sourcePath, { withFileTypes: true })) {\n" +
    "      if (packageEntry.isDirectory()) {\n" +
    "        linkPackage(path.join(sourcePath, packageEntry.name), path.join(targetScopeDir, packageEntry.name))\n" +
    "      }\n" +
    "    }\n" +
    "  }\n" +
    "}\n" +
    "const publicDir = path.join(__dirname, 'public')\n" +
    "const portablePublicDir = path.join(__dirname, '.next', 'hostinger_public')\n" +
    "try {\n" +
    "  const publicIsEmpty = !fs.existsSync(publicDir) || fs.readdirSync(publicDir).length === 0\n" +
    "  if (publicIsEmpty && fs.existsSync(portablePublicDir)) {\n" +
    "    fs.rmSync(publicDir, { recursive: true, force: true })\n" +
    "    fs.cpSync(portablePublicDir, publicDir, { recursive: true })\n" +
    "    console.log('Restored missing public dir from ' + portablePublicDir)\n" +
    "  }\n" +
    "} catch (error) {\n" +
    "  console.error('Failed to restore public dir:', error)\n" +
    "}\n\n";

  fs.writeFileSync(
    serverFile,
    serverSource.replace(nextRequire, `${runtimeLoader}${nextRequire}`),
    "utf8",
  );
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

// The monorepo install is hoisted, so Next's file trace can omit packages that
// are resolved above apps/web. Copy the small runtime set that the server and
// API routes load directly before making the standalone artifact portable.
copyRuntimePackageTrees(
  [
    "react",
    "react-dom",
    "styled-jsx",
    "pg",
    "@neondatabase/serverless",
    "firebase-admin",
  ],
  rootDir,
  path.join(rootStandaloneDir, "node_modules"),
);

if (makeStandaloneModulesPortable(rootStandaloneDir)) {
  console.log(
    `[sync-web-next-output] Preserved standalone runtime modules for Hostinger: ${rootStandaloneDir}`,
  );
}

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

// Hostinger's custom-output validator looks for a standalone server inside the
// configured output directory. Keep the deployable server at the output root,
// and provide lightweight compatibility entrypoints for both layouts used by
// its Next.js detector.
const hostingerCompatibilityEntrypoints = [
  {
    file: path.join(hostingerOutputDir, "standalone", "server.js"),
    rootExpression: "path.resolve(__dirname, '..')",
    serverPath: "../server.js",
  },
  {
    file: path.join(hostingerOutputDir, ".next", "standalone", "server.js"),
    rootExpression: "path.resolve(__dirname, '..', '..')",
    serverPath: "../../server.js",
  },
];
for (const entrypoint of hostingerCompatibilityEntrypoints) {
  fs.mkdirSync(path.dirname(entrypoint.file), { recursive: true });
  fs.writeFileSync(
    entrypoint.file,
    `const path=require('path');\nprocess.chdir(${entrypoint.rootExpression});\nrequire('${entrypoint.serverPath}');\n`,
    "utf8",
  );
  console.log(`[sync-web-next-output] Wrote Hostinger compatibility entrypoint: ${entrypoint.file}`);
}

copyIfExists(path.join(rootNextDir, "static"), path.join(hostingerOutputDir, ".next", "static"));
copyIfExists(path.join(webDir, "public"), path.join(hostingerOutputDir, "public"));

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
    "process.env.UV_THREADPOOL_SIZE=process.env.UV_THREADPOOL_SIZE||'2';\n" +
    "process.env.NODE_OPTIONS=process.env.NODE_OPTIONS||'--max-old-space-size=256';\n" +
    "process.env.DB_GUARD_COOLDOWN_MS=process.env.DB_GUARD_COOLDOWN_MS||'15000';\n" +
    "process.env.DB_GUARD_PANIC_COOLDOWN_MS=process.env.DB_GUARD_PANIC_COOLDOWN_MS||'30000';\n" +
    "process.env.PRISMA_ENGINES_MIRROR='none';\n" +
    "process.env.PRISMA_QUERY_ENGINE_BINARY='none';\n" +
    "process.env.PRISMA_CLIENT_ENGINE_TYPE='library';\n" +
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
