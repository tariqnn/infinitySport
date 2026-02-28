const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const appDir = __dirname;
const standaloneServer = path.join(appDir, '.next', 'standalone', 'server.js');

// Shared-host environments can have strict thread limits.
process.env.TOKIO_WORKER_THREADS = process.env.TOKIO_WORKER_THREADS || '1';
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '1';
process.env.DB_GUARD_COOLDOWN_MS = process.env.DB_GUARD_COOLDOWN_MS || '15000';
process.env.DB_GUARD_PANIC_COOLDOWN_MS = process.env.DB_GUARD_PANIC_COOLDOWN_MS || '30000';
process.env.PRISMA_CLIENT_ENGINE_TYPE =
  process.env.PRISMA_CLIENT_ENGINE_TYPE || 'library';

if (fs.existsSync(standaloneServer)) {
  process.chdir(path.dirname(standaloneServer));
  require(standaloneServer);
  return;
}

const nextBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const nextStart = spawn(nextBin, ['next', 'start'], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

nextStart.on('error', (error) => {
  console.error('[start-production] failed to start Next.js', error);
  process.exit(1);
});

nextStart.on('exit', (code) => {
  process.exit(code ?? 0);
});
