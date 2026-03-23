import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const portalDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(portalDir, "..", "..");
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  // Use a dedicated dir and rotate from old `.next-portal` when it gets locked/corrupted on Windows/OneDrive.
  distDir: ".next-portal-v2",
  transpilePackages: ["@infinity/ui", "@infinity/types", "@infinity/mock-api"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      }
    ]
  },
};

export default nextConfig;
