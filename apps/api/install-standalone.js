#!/usr/bin/env node
// Standalone install script for Vercel deployment
// Installs in isolated temp directory to avoid workspace detection

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const apiDir = process.cwd(); // Should be apps/api in Vercel
const packageJsonPath = path.join(apiDir, 'package.json');
const tempDir = path.join(os.tmpdir(), 'vercel-api-install-' + Date.now());

console.log('=== Vercel Standalone Install Script ===');
console.log('API Directory:', apiDir);
console.log('Temp Install Directory:', tempDir);

// Verify we have a package.json
if (!fs.existsSync(packageJsonPath)) {
  console.error('ERROR: package.json not found in', apiDir);
  process.exit(1);
}

try {
  // Create temp directory
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Created temp directory:', tempDir);
  
  // Copy package.json to temp directory
  fs.copyFileSync(packageJsonPath, path.join(tempDir, 'package.json'));
  console.log('Copied package.json to temp directory');
  
  // Copy .npmrc if it exists
  const npmrcPath = path.join(apiDir, '.npmrc');
  if (fs.existsSync(npmrcPath)) {
    fs.copyFileSync(npmrcPath, path.join(tempDir, '.npmrc'));
    console.log('Copied .npmrc to temp directory');
  }
  
  // Install in completely isolated temp directory (no parent workspace detection possible)
  console.log('Installing dependencies in isolated temp directory...');
  execSync('npm install --legacy-peer-deps', {
    cwd: tempDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_workspaces: 'false',
      npm_config_workspace: 'false'
    }
  });
  
  // Copy node_modules back to api directory
  const tempNodeModules = path.join(tempDir, 'node_modules');
  const apiNodeModules = path.join(apiDir, 'node_modules');
  
  if (fs.existsSync(tempNodeModules)) {
    console.log('Copying node_modules back to apps/api...');
    if (fs.existsSync(apiNodeModules)) {
      fs.rmSync(apiNodeModules, { recursive: true, force: true });
    }
    fs.cpSync(tempNodeModules, apiNodeModules, { recursive: true });
    console.log('✓ node_modules copied successfully');
  }
  
  // Copy package-lock.json if it was created
  const tempPackageLock = path.join(tempDir, 'package-lock.json');
  const apiPackageLock = path.join(apiDir, 'package-lock.json');
  if (fs.existsSync(tempPackageLock)) {
    fs.copyFileSync(tempPackageLock, apiPackageLock);
    console.log('✓ package-lock.json copied');
  }
  
  console.log('Installation completed successfully!');
  
} catch (error) {
  console.error('Installation failed:', error.message);
  if (error.stdout) console.error('stdout:', error.stdout.toString());
  if (error.stderr) console.error('stderr:', error.stderr.toString());
  process.exit(1);
} finally {
  // Clean up temp directory
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleaned up temp directory');
    }
  } catch (e) {
    console.warn('Could not clean up temp directory:', e.message);
  }
}
