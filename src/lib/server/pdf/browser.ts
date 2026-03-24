import "server-only";
import { chromium as playwrightChromium, type Browser } from "playwright-core";
import chromium from "@sparticuz/chromium-min";

export const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.tar";

export async function getBrowser(): Promise<Browser> {
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    return playwrightChromium.launch({ headless: true });
  }

  return playwrightChromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(CHROMIUM_REMOTE_URL),
    headless: true,
  });
}
