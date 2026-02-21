// Build script for web-only deployment on Hostinger
// This ensures all steps run correctly and shows clear errors

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting build process for web app...');
console.log(`Working directory: ${process.cwd()}`);

try {
  // Step 1: Generate Prisma Client
  console.log('\nStep 1: Generating Prisma Client...');
  execSync('npm run prisma:generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('Prisma Client generated');

  // Step 2: Build Next.js app
  console.log('\nStep 2: Building Next.js app...');
  execSync('npm run build:web', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('Next.js app built');

  // Step 3: Verify app build output
  const buildDir = path.join(process.cwd(), 'apps/web/.next');
  if (!fs.existsSync(buildDir)) {
    throw new Error(`Build output not found at: ${buildDir}`);
  }
  console.log(`Build verified at: ${buildDir}`);

  // Step 4: Mirror build output to root for platforms expecting .next at repo root
  console.log('\nStep 4: Syncing build output to root .next...');
  execSync('node sync-web-next-output.js', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('Root .next synced');

  console.log('\nBuild completed successfully!');
} catch (error) {
  console.error('\nBuild failed!');
  console.error(error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());
  process.exit(1);
}
