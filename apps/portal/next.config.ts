import type { NextConfig } from "next";

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
