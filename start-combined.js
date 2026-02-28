// Single-process start script (web only). The app reads/writes directly to Neon via Prisma.
const { spawn } = require('child_process');

const WEB_PORT = process.env.PORT || 3000;

function mergeNodeOptions(existing) {
  const flags = ['--single-threaded', '--single-threaded-gc', '--v8-pool-size=1'];
  const current = (existing || '').trim();
  const all = new Set(current ? current.split(/\s+/) : []);
  for (const flag of flags) all.add(flag);
  return Array.from(all).join(' ').trim();
}

console.log('Starting Infinity Sports web app...');
console.log(`Web port: ${WEB_PORT}`);

const webProcess = spawn('npm', ['run', 'start:web'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(WEB_PORT),
    NODE_ENV: 'production',
    TOKIO_WORKER_THREADS: process.env.TOKIO_WORKER_THREADS || '1',
    PRISMA_CLIENT_ENGINE_TYPE: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'library',
    DB_GUARD_COOLDOWN_MS: process.env.DB_GUARD_COOLDOWN_MS || '15000',
    DB_GUARD_PANIC_COOLDOWN_MS: process.env.DB_GUARD_PANIC_COOLDOWN_MS || '30000',
    UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '1',
    NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS),
  },
  stdio: 'inherit',
  shell: true,
});

webProcess.on('error', (err) => {
  console.error('Failed to start web app:', err.message);
  process.exit(1);
});

webProcess.on('exit', (code) => {
  process.exit(code ?? 0);
});
