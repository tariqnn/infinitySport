// Build script for web-only deployment on Hostinger
// This ensures all steps run correctly and shows clear errors

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Starting build process for web app...');
console.log(`📁 Working directory: ${process.cwd()}`);

try {
  // Step 1: Generate Prisma Client
  console.log('\n📦 Step 1: Generating Prisma Client...');
  execSync('npm run prisma:generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('✅ Prisma Client generated');

  // Step 2: Build Next.js app
  console.log('\n🏗️  Step 2: Building Next.js app...');
  execSync('npm run build:web', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  console.log('✅ Next.js app built');

  // Step 3: Verify build output
  const buildDir = path.join(process.cwd(), 'apps/web/.next');
  if (!fs.existsSync(buildDir)) {
    throw new Error(`Build output not found at: ${buildDir}`);
  }
  console.log(`✅ Build verified at: ${buildDir}`);

  console.log('\n🎉 Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed!');
  console.error(error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());
  process.exit(1);
}
