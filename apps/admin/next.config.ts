import type { NextConfig } from 'next';

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

