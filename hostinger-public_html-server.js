const fs = require('fs');
const path = require('path');

// Resource limits for shared hosting
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '2';
process.env.PRISMA_ENGINES_MIRROR = 'none';
process.env.PRISMA_QUERY_ENGINE_BINARY = 'none';

const nodejsDir = path.join(__dirname, '..', 'nodejs');
const runtimeEnvCandidates = [
  path.join(nodejsDir, 'hostinger-output', 'runtime-env.json'),
  path.join(__dirname, 'runtime-env.json'),
];

if (!process.env.DATABASE_URL) {
  for (const file of runtimeEnvCandidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.trim()) {
        process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
        console.log('[bootstrap] DATABASE_URL loaded from', file);
        break;
      }
    } catch (err) {
      console.error('[bootstrap] Failed to read runtime env:', file, err);
    }
  }
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://USER:PASSWORD@HOST/DB?sslmode=require&pgbouncer=true&connect_timeout=5&pool_timeout=5';
}

const targets = [
  path.join(nodejsDir, 'hostinger-output', 'server.js'),
  path.join(nodejsDir, 'server.js'),
];

const target = targets.find((p) => fs.existsSync(p));
if (!target) {
  console.error('[bootstrap] No Node target found. Checked:');
  for (const p of targets) console.error(' -', p);
  process.exit(1);
}

process.chdir(path.dirname(target));
require(target);

