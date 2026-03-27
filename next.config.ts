import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["curlconverter", "puppeteer-core", "@sparticuz/chromium-min"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
