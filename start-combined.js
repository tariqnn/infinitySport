// Combined start script for Hostinger deployment
// Runs both NestJS API and Next.js web app together

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Hostinger will set PORT automatically for the main app (Next.js)
// API runs on a separate internal port for communication
const WEB_PORT = process.env.PORT || 3000; // Hostinger sets this automatically
const API_PORT = process.env.API_PORT || (parseInt(WEB_PORT) + 1000); // Use a different port for API

console.log('🚀 Starting Infinity Sports (API + Web)...');
console.log(`📡 API will run on port ${API_PORT} (internal)`);
console.log(`🌐 Web will run on port ${WEB_PORT} (Hostinger assigned)`);
console.log(`📁 Working directory: ${process.cwd()}`);

// Verify build outputs exist
const apiBuildPath = path.join(process.cwd(), 'apps/api/dist/main.js');
const webBuildPath = path.join(process.cwd(), 'apps/web/.next');

if (!fs.existsSync(apiBuildPath)) {
  console.error(`❌ API build not found at: ${apiBuildPath}`);
  console.error('   Make sure you ran: npm run build');
  process.exit(1);
}

if (!fs.existsSync(webBuildPath)) {
  console.error(`❌ Web build not found at: ${webBuildPath}`);
  console.error('   Make sure you ran: npm run build');
  process.exit(1);
}

console.log('✅ Build outputs verified');

let webProcess = null;
let apiProcess = null;

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down...');
  if (apiProcess) {
    try {
      apiProcess.kill();
    } catch (e) {
      // Ignore
    }
  }
  if (webProcess) {
    try {
      webProcess.kill();
    } catch (e) {
      // Ignore
    }
  }
  process.exit(0);
};

// Start NestJS API
console.log('📡 Starting API...');
apiProcess = spawn('node', ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: API_PORT,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

apiProcess.on('error', (err) => {
  console.error('❌ Failed to start API:', err.message);
  process.exit(1);
});

apiProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ API process exited with code ${code}`);
    if (!webProcess) {
      // If web hasn't started yet, exit
      process.exit(1);
    }
  }
});

// Wait a bit for API to start, then start Next.js Web
setTimeout(() => {
  // Start Next.js Web
  console.log('🌐 Starting Web App...');
  console.log(`   Using PORT: ${WEB_PORT}`);
  console.log(`   API_RUNNING_LOCALLY: ${process.env.API_RUNNING_LOCALLY || 'NOT SET'}`);
  console.log(`   API_PORT: ${API_PORT}`);
  
  webProcess = spawn('npm', ['run', 'start:web'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: WEB_PORT,
      NODE_ENV: 'production',
      API_PORT: String(API_PORT),
      // So Next API routes (e.g. /api/package-registrations) can proxy to the local Nest API
      API_BASE_URL: `http://127.0.0.1:${API_PORT}`,
      // Enable Next rewrites so /api/* (browser) can proxy to Nest when needed
      API_RUNNING_LOCALLY: 'true',
    },
    stdio: 'inherit',
    shell: true,
  });

  webProcess.on('error', (err) => {
    console.error('❌ Failed to start Web app:', err.message);
    cleanup();
  });

  webProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Web process exited with code ${code}`);
      cleanup();
    }
  });
}, 2000);

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Keep process alive
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  cleanup();
});
