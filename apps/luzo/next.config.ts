import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["curlconverter"],
  transpilePackages: ["@luzo/flow-builder", "@luzo/flow-types"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
