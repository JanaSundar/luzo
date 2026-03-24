import "server-only";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { logger } from "@/lib/utils/logger";

export const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

export async function getBrowser(): Promise<Browser> {
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    logger.info({ mode: "development" }, "Launching local browser (Puppeteer)");
    // On local, we assume a compatible chrome/chromium is available or use puppeteer's default
    // For local dev, you might need to point to your local chrome:
    // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    return puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  logger.info({ mode: "production" }, "Launching remote browser (Puppeteer)");
  const executablePath = await chromium.executablePath(CHROMIUM_REMOTE_URL);
  logger.info({ executablePath }, "Chromium executable path determined");

  return puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true, // Standard for serverless environments
  });
}
