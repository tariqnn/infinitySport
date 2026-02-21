// Single-process start script (web only). The app reads/writes directly to Neon via Prisma.
const { spawn } = require('child_process');

const WEB_PORT = process.env.PORT || 3000;

console.log('Starting Infinity Sports web app...');
console.log(`Web port: ${WEB_PORT}`);

const webProcess = spawn('npm', ['run', 'start:web'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(WEB_PORT),
    NODE_ENV: 'production',
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
