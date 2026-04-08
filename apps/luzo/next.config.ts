import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["curlconverter", "puppeteer-core", "@sparticuz/chromium-min"],
  transpilePackages: ["@luzo/flow-builder", "@luzo/flow-core", "@luzo/flow-types"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
