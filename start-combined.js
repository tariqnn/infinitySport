// Combined start script for Hostinger deployment
// Runs both NestJS API and Next.js web app together

const { spawn } = require('child_process');
const path = require('path');

const API_PORT = process.env.API_PORT || 4000;
const WEB_PORT = process.env.PORT || 3000;

console.log('🚀 Starting Infinity Sports (API + Web)...');
console.log(`📡 API will run on port ${API_PORT}`);
console.log(`🌐 Web will run on port ${WEB_PORT}`);

// Start NestJS API
const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: API_PORT,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

// Start Next.js Web
const webProcess = spawn('npm', ['run', 'start:web'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: WEB_PORT,
    NODE_ENV: 'production',
    // Don't set NEXT_PUBLIC_API_BASE_URL - let it use relative URLs via rewrites
    // NEXT_PUBLIC_API_SAME_DOMAIN and API_RUNNING_LOCALLY should be set via env vars
  },
  stdio: 'inherit',
  shell: true,
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down...');
  apiProcess.kill();
  webProcess.kill();
  process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

apiProcess.on('exit', (code) => {
  console.error(`❌ API process exited with code ${code}`);
  cleanup();
});

webProcess.on('exit', (code) => {
  console.error(`❌ Web process exited with code ${code}`);
  cleanup();
});
