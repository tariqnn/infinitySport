import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Load repo root `.env` / `.env.local` so DATABASE_URL works when only defined there (monorepo).
const adminDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(adminDir, '..', '..');
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  // NOTE: On Windows + OneDrive, `.next/trace` can become locked (EPERM/Access denied),
  // which prevents Next from writing build artifacts and causes `_next/static` 404s.
  // Use a separate dist directory to avoid the locked `.next` folder.
  distDir: '.next-admin',
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;

