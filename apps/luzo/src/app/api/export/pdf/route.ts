import { NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/server/pdf-service";
import type { ExportReportModel } from "@/types/pipeline-report";

export async function POST(request: Request) {
  try {
    const reportModel: ExportReportModel = await request.json();

    if (!reportModel) {
      return NextResponse.json({ error: "Missing report data" }, { status: 400 });
    }

    const pdfBuffer = await generateReportPdf(reportModel, reportModel.theme);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportModel.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to generate PDF.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
