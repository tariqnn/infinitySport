const fs = require('fs');
const http = require('http');
const path = require('path');
const next = require('next');

function resolveNextAppDir() {
  const monorepoWebDir = path.join(__dirname, 'apps', 'web');
  const monorepoBuildDir = path.join(monorepoWebDir, '.next');
  if (fs.existsSync(monorepoBuildDir)) return monorepoWebDir;

  const rootBuildDir = path.join(__dirname, '.next');
  if (fs.existsSync(rootBuildDir)) return __dirname;

  // Default to monorepo web dir so startup error is explicit if build is missing.
  return monorepoWebDir;
}

// Hostinger's Node.js deploys have repeatedly served a build whose `public/`
// folder is missing or empty next to the resolved app dir (favicon/icon
// routes still work because those are compiled into .next/server, but plain
// static files like images and video 404). The real public folder always
// ships with the git checkout at apps/web/public, so self-heal by copying it
// into place before Next starts, instead of depending on every deploy path
// to have synced it correctly.
function ensurePublicDir(dir) {
  const targetPublicDir = path.join(dir, 'public');
  const sourcePublicDir = path.join(__dirname, 'apps', 'web', 'public');
  if (path.resolve(targetPublicDir) === path.resolve(sourcePublicDir)) return;
  if (!fs.existsSync(sourcePublicDir)) return;

  const targetHasFiles =
    fs.existsSync(targetPublicDir) &&
    fs.readdirSync(targetPublicDir).length > 0;
  if (targetHasFiles) return;

  try {
    fs.mkdirSync(path.dirname(targetPublicDir), { recursive: true });
    fs.rmSync(targetPublicDir, { recursive: true, force: true });
    fs.cpSync(sourcePublicDir, targetPublicDir, { recursive: true });
    console.log(`Restored missing public dir: ${sourcePublicDir} -> ${targetPublicDir}`);
  } catch (error) {
    console.error('Failed to restore public dir:', error);
  }
}

const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';
const dir = resolveNextAppDir();
ensurePublicDir(dir);

const app = next({
  dev: false,
  dir,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, host, () => {
        // Keep logs plain for shared-host logs.
        console.log(`Next server listening on ${host}:${port} (dir: ${dir})`);
      });
  })
  .catch((error) => {
    console.error('Failed to start Next server:', error);
    process.exit(1);
  });
