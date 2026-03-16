import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["curlconverter"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
