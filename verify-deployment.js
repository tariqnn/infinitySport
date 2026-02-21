// Verification script for web-only deployment
// Run this after deployment to verify required artifacts exist.

const fs = require('fs');
const path = require('path');

console.log('Verifying deployment setup...\n');

const checks = [];

// Check 1: Next.js build output exists
const nextBuildPath = path.join(__dirname, 'apps/web/.next');
if (fs.existsSync(nextBuildPath)) {
  console.log('OK: Next.js build output exists:', nextBuildPath);
  checks.push(true);
} else {
  console.log('FAIL: Next.js build output missing:', nextBuildPath);
  checks.push(false);
}

// Check 2: start-combined.js exists
const startScript = path.join(__dirname, 'start-combined.js');
if (fs.existsSync(startScript)) {
  console.log('OK: Start script exists:', startScript);
  checks.push(true);
} else {
  console.log('FAIL: Start script missing:', startScript);
  checks.push(false);
}

// Check 3: package.json has a usable hostinger start script
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
if (packageJson.scripts && packageJson.scripts['start:hostinger']) {
  console.log('OK: package.json hostinger start script exists');
  checks.push(true);
} else {
  console.log('FAIL: package.json hostinger start script missing');
  checks.push(false);
}

// Check 4: Environment variables
console.log('\nEnvironment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Summary
console.log('\nSummary:');
const allPassed = checks.every((check) => check === true);
if (allPassed) {
  console.log('OK: All checks passed. Deployment should run.');
} else {
  console.log('FAIL: Some checks failed. Review errors above.');
  process.exit(1);
}
