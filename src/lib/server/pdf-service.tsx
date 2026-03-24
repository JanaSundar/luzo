import "server-only";
import type { ExportReportModel } from "@/types/pipeline-report";
import {
  ReportLayoutContainer,
  ReportHeader,
  ReportStat,
  ReportSection,
  ReportList,
  RequestCard,
  PerformanceAppendixTable,
  StaticHtml,
} from "@/components/pipelines/report/ReportShared";
import { markdownToHtml } from "@/lib/utils/markdown-to-html";
import { getBrowser } from "./pdf/browser";
import { getHtmlShell } from "./pdf/html-shell";
import { logger } from "@/lib/utils/logger";

/**
 * Generates a PDF report from the provided report model.
 * This service is modularized to adhere to the 250-line architectural constraint.
 * Headless browser orchestration and HTML/CSS shell logic are extracted to ./pdf/ submodules.
 */
export async function generateReportPdf(
  report: ExportReportModel,
  theme: "light" | "dark" = "light",
): Promise<Buffer> {
  const startTime = Date.now();
  logger.info({ title: report.title, requests: report.requests.length }, "Starting PDF generation");

  const { renderToStaticMarkup } = await import("react-dom/server");

  // 1. Prepare HTML snippets from Markdown
  logger.debug("Preparing HTML snippets from Markdown");
  const summaryHtml = await markdownToHtml(report.summary);
  const healthHtml = await markdownToHtml(report.healthSummary || "");
  const conclusionHtml = await markdownToHtml(report.conclusion);
  const insightsHtml = await Promise.all(report.insights.map((i) => markdownToHtml(i)));
  const recommendationsHtml = await Promise.all(
    report.recommendations.map((i) => markdownToHtml(i)),
  );
  const risksHtml = await Promise.all(report.risks.map((r) => markdownToHtml(r)));

  // 2. Generate Request Card Sections
  logger.debug("Generating request card sections");
  const requestCardGroups = await Promise.all(
    Array.from({ length: Math.ceil(report.requests.length / 1) }, (_, index) =>
      Promise.all(
        report.requests.slice(index, index + 1).map(async (req) => (
          <RequestCard
            key={req.stepId}
            method={req.method}
            name={req.name}
            statusCode={req.statusCode}
            latencyMs={req.latencyMs}
            url={req.url}
            mode="pdf"
          >
            <StaticHtml html={await markdownToHtml(req.analysis)} />
          </RequestCard>
        )),
      ),
    ),
  );

  const requestSections = requestCardGroups.map((group, index) => (
    <div key={`request-group-${index}`} className="break-inside-avoid request-group space-y-3">
      {index === 0 ? (
        <ReportSection title="Per Request Breakdown" mode="pdf">
          <div className="space-y-3">{group}</div>
        </ReportSection>
      ) : (
        <section className="request-group-continued mb-8 border-b border-border/60 bg-transparent px-0 pb-6 last:mb-0 last:border-b-0 last:pb-0">
          <div className="space-y-3">{group}</div>
        </section>
      )}
    </div>
  ));

  // 3. Assemble components into static markup
  logger.debug("Assembling components into static markup");
  const componentOutput = renderToStaticMarkup(
    <ReportLayoutContainer className="pdf-root" mode="pdf">
      <ReportHeader title={report.title} mode="pdf">
        <ReportStat label="Success Rate" value={`${report.metrics.successRate}%`} mode="pdf" />
        <ReportStat label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} mode="pdf" />
        <ReportStat label="P95 Latency" value={`${report.metrics.p95LatencyMs}ms`} mode="pdf" />
        <ReportStat label="Failures" value={`${report.metrics.failedSteps}`} mode="pdf" />
      </ReportHeader>

      <div className="space-y-6">
        <ReportSection title="Executive Summary" mode="pdf">
          <StaticHtml html={summaryHtml} />
        </ReportSection>
        <ReportSection title="Health Summary" mode="pdf">
          <StaticHtml html={healthHtml} />
        </ReportSection>
        <ReportSection title="Key Insights" mode="pdf">
          <ReportList
            items={insightsHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>
        <ReportSection title="Recommendations" mode="pdf">
          <ReportList
            items={recommendationsHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>
        <ReportSection title="Risks" mode="pdf">
          <ReportList
            items={risksHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>
        {requestSections}
        <ReportSection title="Conclusion" mode="pdf">
          <StaticHtml html={conclusionHtml} />
        </ReportSection>
        <ReportSection title="Performance Appendix" mode="pdf">
          <PerformanceAppendixTable metrics={report.endpointMetrics} mode="pdf" />
        </ReportSection>
      </div>

      <footer className="mt-10 pt-4 border-t flex justify-end text-[10px] text-muted-foreground uppercase tracking-widest">
        <span>Generated on {new Date(report.generatedAt || Date.now()).toLocaleString()}</span>
      </footer>
    </ReportLayoutContainer>,
  );

  // 4. Launch browser and generate PDF
  logger.debug("Launching browser for PDF generation");
  const html = getHtmlShell(componentOutput, theme);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1800 });

  try {
    logger.debug("Setting page content and generating PDF");
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const duration = Date.now() - startTime;
    logger.info({ durationMs: duration, sizeBytes: pdfBuffer.length }, "PDF generation completed");

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
