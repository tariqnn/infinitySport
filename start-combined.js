// Combined start script for Hostinger deployment
// Runs both NestJS API and Next.js web app together

const { spawn } = require('child_process');
const path = require('path');

// Hostinger will set PORT automatically for the main app (Next.js)
// API runs on a separate internal port for communication
const WEB_PORT = process.env.PORT || 3000; // Hostinger sets this automatically
const API_PORT = process.env.API_PORT || (parseInt(WEB_PORT) + 1000); // Use a different port for API

console.log('🚀 Starting Infinity Sports (API + Web)...');
console.log(`📡 API will run on port ${API_PORT} (internal)`);
console.log(`🌐 Web will run on port ${WEB_PORT} (Hostinger assigned)`);

let webProcess = null;

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down...');
  if (apiProcess) apiProcess.kill();
  if (webProcess) webProcess.kill();
  process.exit(0);
};

// Start NestJS API
console.log('📡 Starting API...');
const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: API_PORT,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

apiProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ API process exited with code ${code}`);
    cleanup();
  }
});

// Wait a bit for API to start, then start Next.js Web
setTimeout(() => {
  // Start Next.js Web
  console.log('🌐 Starting Web App...');
  webProcess = spawn('npm', ['run', 'start:web'], {
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

  webProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Web process exited with code ${code}`);
      cleanup();
    }
  });
}, 2000);

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
