#!/usr/bin/env node
// Standalone install script for Vercel deployment
// This ensures npm doesn't detect parent workspace

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the directory where this script is located
// In Vercel, we're already in apps/api, but __dirname will be the script location
const apiDir = process.cwd(); // Use current working directory (should be apps/api in Vercel)
const rootDir = path.resolve(apiDir, '..', '..');
const rootPackageJson = path.join(rootDir, 'package.json');
const rootPackageLock = path.join(rootDir, 'package-lock.json');

// Hide root package.json and package-lock.json IMMEDIATELY to prevent workspace detection
let rootPackageHidden = false;
let rootLockHidden = false;
const rootPackageBackup = rootPackageJson + '.vercel-backup';
const rootLockBackup = rootPackageLock + '.vercel-backup';

console.log('=== Vercel Standalone Install Script ===');
console.log('API Directory:', apiDir);
console.log('Root Directory:', rootDir);
console.log('Root package.json:', rootPackageJson);

// Hide root package.json FIRST, before any npm operations
if (fs.existsSync(rootPackageJson)) {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
    // Hide if it has workspaces OR if it has Next.js/React (monorepo root)
    if (rootPkg.workspaces || rootPkg.dependencies?.next || rootPkg.dependencies?.react) {
      console.log('Hiding root package.json (has workspaces or frontend deps)...');
      fs.renameSync(rootPackageJson, rootPackageBackup);
      rootPackageHidden = true;
    }
  } catch (e) {
    console.warn('Could not read root package.json:', e.message);
  }
}

// Also hide package-lock.json if it exists
if (fs.existsSync(rootPackageLock)) {
  try {
    console.log('Hiding root package-lock.json...');
    fs.renameSync(rootPackageLock, rootLockBackup);
    rootLockHidden = true;
  } catch (e) {
    console.warn('Could not hide root package-lock.json:', e.message);
  }
}

try {
  // Run npm install with workspace detection disabled
  console.log('Installing dependencies in apps/api...');
  console.log('Current directory:', apiDir);
  console.log('Root package.json path:', rootPackageJson);
  
  // Set environment variables to disable workspace detection
  const env = {
    ...process.env,
    npm_config_workspaces: 'false',
    npm_config_workspace: 'false',
    NPM_CONFIG_WORKSPACES: 'false'
  };
  
  execSync('npm install --legacy-peer-deps', {
    cwd: apiDir,
    stdio: 'inherit',
    env: env
  });
  console.log('Installation completed successfully!');
} catch (error) {
  console.error('Installation failed:', error.message);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
  process.exit(1);
} finally {
  // Restore root package.json if we hid it
  if (rootPackageHidden && fs.existsSync(rootPackageBackup)) {
    try {
      fs.renameSync(rootPackageBackup, rootPackageJson);
      console.log('✓ Restored root package.json');
    } catch (e) {
      console.warn('Could not restore root package.json:', e.message);
    }
  }
  
  // Restore root package-lock.json if we hid it
  if (rootLockHidden && fs.existsSync(rootLockBackup)) {
    try {
      fs.renameSync(rootLockBackup, rootPackageLock);
      console.log('✓ Restored root package-lock.json');
    } catch (e) {
      console.warn('Could not restore root package-lock.json:', e.message);
    }
  }
}
