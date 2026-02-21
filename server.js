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

const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';
const dir = resolveNextAppDir();

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
