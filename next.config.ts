import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vlayer/sdk", "@vlayer/react"],
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
      };
    }
    return config;
  },
};

export default nextConfig;
