// Start script for web-only deployment on Hostinger
// This ensures we're in the correct directory and the build exists

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const webDir = path.join(process.cwd(), 'apps/web');
const buildDir = path.join(webDir, '.next');

console.log('🌐 Starting Next.js Web App...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`📁 Web directory: ${webDir}`);
console.log(`📁 Build directory: ${buildDir}`);

// Check if build exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build not found!');
  console.error(`   Expected build at: ${buildDir}`);
  console.error('   Make sure the build command ran successfully.');
  console.error('   Build command should be: npm run build:hostinger:web-only');
  process.exit(1);
}

console.log('✅ Build found, starting Next.js...');

// Start Next.js
const webProcess = spawn('npm', ['run', 'start'], {
  cwd: webDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000,
  },
  stdio: 'inherit',
  shell: true,
});

webProcess.on('error', (err) => {
  console.error('❌ Failed to start Web app:', err.message);
  process.exit(1);
});

webProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Web process exited with code ${code}`);
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  webProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  webProcess.kill();
  process.exit(0);
});
