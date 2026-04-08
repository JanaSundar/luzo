import "server-only";
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { logger } from "@/utils/logger";

const DEFAULT_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

function getLaunchOptions(executablePath?: string): LaunchOptions {
  return {
    headless: true,
    executablePath,
    args: executablePath ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
  };
}

export async function getBrowser(): Promise<Browser> {
  const configuredExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const configuredRemoteUrl = process.env.PUPPETEER_CHROMIUM_REMOTE_URL?.trim();
  const isLocal = process.env.NODE_ENV === "development";

  if (configuredExecutablePath) {
    logger.info({ executablePath: configuredExecutablePath }, "Launching configured Chromium");
    return puppeteer.launch(getLaunchOptions(configuredExecutablePath));
  }

  if (isLocal) {
    logger.info("Launching local Chromium with bundled Puppeteer configuration");
    return puppeteer.launch(getLaunchOptions());
  }

  try {
    const remoteUrl = configuredRemoteUrl || DEFAULT_REMOTE_URL;
    const executablePath = await chromium.executablePath(remoteUrl);
    logger.info({ executablePath, remoteUrl }, "Launching remote Chromium");
    return puppeteer.launch(getLaunchOptions(executablePath));
  } catch (error) {
    logger.error({ error }, "Failed to resolve Chromium executable path");
    throw new Error(
      "Unable to launch Chromium for PDF generation. Set PUPPETEER_EXECUTABLE_PATH or PUPPETEER_CHROMIUM_REMOTE_URL.",
    );
  }
}
