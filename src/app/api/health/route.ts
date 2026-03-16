import { isDatabaseConfigured } from "@/lib/db/index";

export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: isDatabaseConfigured() ? "configured" : "not-configured",
  });
}
