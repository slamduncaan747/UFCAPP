import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fighter photos are hot-linked from a mix of sources (UFC CDN, Wikimedia,
    // Sherdog, …) recorded in fighters.photo_url — allow any https host.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [40, 64, 80, 128, 160],
  },
};

export default nextConfig;
