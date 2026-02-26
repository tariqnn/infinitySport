const fs = require('fs');
const path = require('path');

const envCandidates = [
  path.join(__dirname, 'hostinger-output', 'runtime-env.json'),
  path.join(__dirname, '..', 'nodejs', 'hostinger-output', 'runtime-env.json'),
];

if (!process.env.DATABASE_URL) {
  for (const envFile of envCandidates) {
    try {
      if (!fs.existsSync(envFile)) continue;
      const parsed = JSON.parse(fs.readFileSync(envFile, 'utf8'));
      if (parsed && typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.trim()) {
        process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
        console.log('DATABASE_URL loaded from:', envFile);
        break;
      }
    } catch (e) {
      console.error('Failed reading runtime-env.json:', envFile, e);
    }
  }
}

// hard fallback
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://neondb_owner:npg_nZdJDv0WuIx7@ep-calm-mountain-ahustq8p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=5&pool_timeout=5';
}

console.log('DATABASE_URL present at bootstrap:', Boolean(process.env.DATABASE_URL));

const serverCandidates = [
  path.join(__dirname, 'hostinger-output', 'server.js'),
  path.join(__dirname, '..', 'nodejs', 'hostinger-output', 'server.js'),
];

const target = serverCandidates.find((p) => fs.existsSync(p));

if (!target) {
  console.error('No server.js target found. Checked:');
  for (const p of serverCandidates) console.error(' -', p);
  process.exit(1);
}

process.chdir(path.dirname(target));
require(target);
