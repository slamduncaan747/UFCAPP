import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.ufc.com' },
      { protocol: 'https', hostname: 'dmxg5wxfqgb4u.cloudfront.net' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [40, 64, 80, 128, 160],
  },
};

export default nextConfig;
