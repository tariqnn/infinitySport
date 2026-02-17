import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use separate dir to avoid OneDrive/lock issues (like admin); ensures chunks like registrations/page.js are written
  distDir: ".next-portal",
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
