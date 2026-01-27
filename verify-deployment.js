// Verification script to check if deployment is correct
// Run this after deployment to verify everything is in place

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Hostinger Deployment Setup...\n');

const checks = [];

// Check 1: Next.js build output exists
const nextBuildPath = path.join(__dirname, 'apps/web/.next');
if (fs.existsSync(nextBuildPath)) {
  console.log('✅ Next.js build output exists:', nextBuildPath);
  checks.push(true);
} else {
  console.log('❌ Next.js build output missing:', nextBuildPath);
  checks.push(false);
}

// Check 2: API build output exists
const apiBuildPath = path.join(__dirname, 'apps/api/dist');
if (fs.existsSync(apiBuildPath)) {
  console.log('✅ API build output exists:', apiBuildPath);
  checks.push(true);
} else {
  console.log('❌ API build output missing:', apiBuildPath);
  checks.push(false);
}

// Check 3: start-combined.js exists
const startScript = path.join(__dirname, 'start-combined.js');
if (fs.existsSync(startScript)) {
  console.log('✅ Start script exists:', startScript);
  checks.push(true);
} else {
  console.log('❌ Start script missing:', startScript);
  checks.push(false);
}

// Check 4: package.json has correct scripts
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
if (packageJson.scripts && packageJson.scripts.start === 'node start-combined.js') {
  console.log('✅ package.json start script is correct');
  checks.push(true);
} else {
  console.log('❌ package.json start script is incorrect');
  checks.push(false);
}

// Check 5: Environment variables
console.log('\n📋 Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  API_PORT:', process.env.API_PORT || 'NOT SET');
console.log('  API_RUNNING_LOCALLY:', process.env.API_RUNNING_LOCALLY || 'NOT SET');
console.log('  NEXT_PUBLIC_API_SAME_DOMAIN:', process.env.NEXT_PUBLIC_API_SAME_DOMAIN || 'NOT SET');

// Summary
console.log('\n📊 Summary:');
const allPassed = checks.every(check => check === true);
if (allPassed) {
  console.log('✅ All checks passed! Deployment should work.');
  console.log('\n⚠️  IMPORTANT: This is a Node.js app, NOT a static site.');
  console.log('   Hostinger must run it as a Node.js application, not serve from public_html.');
  console.log('   Make sure you\'re using Node.js hosting, not Apache/shared hosting.');
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  process.exit(1);
}
