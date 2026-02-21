const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const webNextDir = path.join(rootDir, 'apps', 'web', '.next');
const rootNextDir = path.join(rootDir, '.next');

if (!fs.existsSync(webNextDir)) {
  console.error(`[sync-web-next-output] Missing source build dir: ${webNextDir}`);
  process.exit(1);
}

if (fs.existsSync(rootNextDir)) {
  fs.rmSync(rootNextDir, { recursive: true, force: true });
}

fs.cpSync(webNextDir, rootNextDir, { recursive: true });
console.log(`[sync-web-next-output] Synced ${webNextDir} -> ${rootNextDir}`);
