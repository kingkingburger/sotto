import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'www.foodsafetykorea.go.kr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.foodsafetykorea.go.kr',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
