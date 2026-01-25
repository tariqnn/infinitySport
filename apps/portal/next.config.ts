import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
