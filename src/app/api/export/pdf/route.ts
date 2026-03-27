import { NextResponse } from "next/server";
import { generateReportPdf } from "@/services/server/pdf-service";
import type { ExportReportModel } from "@/types/pipeline-report";
import { logger } from "@/utils/logger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const reportModel: ExportReportModel = await request.json();

    if (!reportModel) {
      logger.warn({ requestId }, "Missing report data in PDF export request");
      return NextResponse.json({ error: "Missing report data" }, { status: 400 });
    }

    logger.info({ requestId, title: reportModel.title }, "PDF export request received");
    const pdfBuffer = await generateReportPdf(reportModel, reportModel.theme);

    logger.info({ requestId, sizeBytes: pdfBuffer.length }, "PDF exported successfully");

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportModel.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ requestId, error: errorMessage }, "Failed to generate PDF");
    return NextResponse.json(
      {
        error: "Failed to generate PDF.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
