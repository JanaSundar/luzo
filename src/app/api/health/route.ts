import { logger } from "@/utils/logger";

export async function GET() {
  logger.debug({ path: "/api/health" }, "Health check requested");
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
