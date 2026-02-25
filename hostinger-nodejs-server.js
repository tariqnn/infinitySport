const fs = require('fs');
const path = require('path');

const runtimeEnvCandidates = [
  path.join(__dirname, 'hostinger-output', 'runtime-env.json'),
  path.join(__dirname, '..', 'public_html', 'runtime-env.json'),
];

if (!process.env.DATABASE_URL) {
  for (const file of runtimeEnvCandidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.trim()) {
        process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
        console.log('[nodejs bootstrap] DATABASE_URL loaded from', file);
        break;
      }
    } catch (err) {
      console.error('[nodejs bootstrap] Failed to read runtime env:', file, err);
    }
  }
}

const targets = [
  path.join(__dirname, 'hostinger-output', 'server.js'),
  path.join(__dirname, '.next', 'standalone', 'server.js'),
];

const target = targets.find((p) => fs.existsSync(p));
if (!target) {
  console.error('[nodejs bootstrap] No app entrypoint found. Checked:');
  for (const p of targets) console.error(' -', p);
  process.exit(1);
}

process.chdir(path.dirname(target));
require(target);

