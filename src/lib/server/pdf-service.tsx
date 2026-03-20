import "server-only";
import { chromium } from "playwright-core";
import chromium_stealth from "@sparticuz/chromium";
import type { ExportReportModel } from "@/types/pipeline-report";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Lightbulb,
  Target,
  Activity,
} from "lucide-react";
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

export async function generateReportPdf(
  report: ExportReportModel,
  theme: "light" | "dark" = "light",
): Promise<Buffer> {
  const { renderToStaticMarkup } = await import("react-dom/server");

  const summaryHtml = await markdownToHtml(report.summary);
  const healthHtml = await markdownToHtml(report.healthSummary || "");
  const conclusionHtml = await markdownToHtml(report.conclusion);
  const insightsHtml = await Promise.all(report.insights.map((i) => markdownToHtml(i)));
  const recommendationsHtml = await Promise.all(
    report.recommendations.map((i) => markdownToHtml(i)),
  );
  const risksHtml = await Promise.all(report.risks.map((r) => markdownToHtml(r)));

  const requestCards = await Promise.all(
    report.requests.map(async (req) => (
      <RequestCard
        key={req.stepId}
        method={req.method}
        name={req.name}
        statusCode={req.statusCode}
        latencyMs={req.latencyMs}
        url={req.url}
      >
        <StaticHtml html={await markdownToHtml(req.analysis)} />
      </RequestCard>
    )),
  );

  const componentOutput = renderToStaticMarkup(
    <ReportLayoutContainer className="pdf-shield">
      <ReportHeader title={report.title}>
        <ReportStat label="Success Rate" value={`${report.metrics.successRate}%`} />
        <ReportStat label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
        <ReportStat label="P95 Latency" value={`${report.metrics.p95LatencyMs}ms`} />
        <ReportStat label="Failures" value={`${report.metrics.failedSteps}`} />
      </ReportHeader>

      <div className="space-y-6">
        <ReportSection title="Executive Summary" icon={<Target className="h-4 w-4" />}>
          <StaticHtml html={summaryHtml} />
        </ReportSection>

        <ReportSection title="Health Summary" icon={<Activity className="h-4 w-4" />}>
          <StaticHtml html={healthHtml} />
        </ReportSection>

        <ReportSection title="Key Insights" icon={<Lightbulb className="h-4 w-4" />}>
          <ReportList
            items={insightsHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>

        <ReportSection title="Recommendations" icon={<Info className="h-4 w-4" />}>
          <ReportList
            items={recommendationsHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>

        <ReportSection title="Risks" icon={<AlertTriangle className="h-4 w-4" />}>
          <ReportList
            items={risksHtml.map((html, i) => (
              <StaticHtml key={i} html={html} />
            ))}
          />
        </ReportSection>

        <ReportSection title="Per Request Breakdown" icon={<ChevronRight className="h-4 w-4" />}>
          <div className="space-y-3">{requestCards}</div>
        </ReportSection>

        <ReportSection title="Conclusion" icon={<CheckCircle2 className="h-4 w-4" />}>
          <StaticHtml html={conclusionHtml} />
        </ReportSection>

        <ReportSection title="Performance Appendix" icon={<ChevronRight className="h-4 w-4" />}>
          <PerformanceAppendixTable metrics={report.endpointMetrics} />
        </ReportSection>
      </div>

      <footer className="mt-10 pt-4 border-t flex justify-end text-[10px] text-muted-foreground uppercase tracking-widest">
        <span>Generated on {new Date(report.generatedAt || Date.now()).toLocaleString()}</span>
      </footer>
    </ReportLayoutContainer>,
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
  ${
    theme === "dark"
      ? `
    --background: #09090b;
    --foreground: #fafafa;
    --border: #27272a;
    --muted: #18181b;
    --muted-foreground: #a1a1aa;
  `
      : `
    --background: #ffffff;
    --foreground: #09090b;
    --border: #e4e4e7;
    --muted: #f4f4f5;
    --muted-foreground: #71717a;
  `
  }
}

* {
  box-sizing: border-box;
}

/* A4 base */
html, body {
  margin: 0;
  padding: 0;
  width: 794px;
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

/* container */
.pdf-shield {
  padding: 48px 40px !important;
  width: 100%;
}

/* Typography */
body {
  letter-spacing: 0.01em !important;
}

h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.01em; line-height: 1.15; margin-bottom: 24px; color: #111111; }
h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin-bottom: 16px; }

/* 🔥 pagination fix */
header, section, div {
  break-inside: auto !important;
  page-break-inside: auto !important;
}

.break-inside-avoid {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

/* Sections */
section {
  margin-bottom: 32px !important;
  padding-bottom: 24px !important;
  border-bottom: 1px solid #f5f5f5 !important;
}
section:last-of-type { border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }

/* Metrics Grid */
.grid-cols-4 {
  display: grid !important;
  grid-template-cols: repeat(4, 1fr) !important;
  border: 1px solid #e5e5e5 !important;
  overflow: hidden !important;
  background: #fafafa !important;
}
.grid-cols-4 > div { border-right: 1px solid #e5e5e5 !important; }
.grid-cols-4 > div:last-child { border-right: none !important; }

/* Stats */
.stat-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #a3a3a3; margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 900; color: #111111; letter-spacing: -0.02em; }

/* Cards */
.rounded-xl { 
  border: 1px solid #f5f5f5;
  background: #ffffff;
}

/* Markdown */
.markdown-content { font-size: 13px !important; line-height: 1.7 !important; color: #404040 !important; font-weight: 500 !important; }
.markdown-content p { margin: 0 0 16px 0 !important; }
.markdown-content ul { padding-left: 20px; margin-bottom: 16px; list-style: none; }
.markdown-content li { margin-bottom: 10px; position: relative; }
.markdown-content li::before { 
  content: "•"; 
  position: absolute; 
  left: -18px; 
  color: #a3a3a3; 
  font-weight: 800;
  font-size: 16px;
  top: -2px;
}

@page {
  size: A4;
  margin: 10mm 5mm;
}
</style>

<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" }
      }
    }
  }
}
</script>

</head>

<body class="${theme}">
  <div class="pdf-shield">
    ${componentOutput}
  </div>
</body>
</html>
`;

  const browser =
    process.env.VERCEL === "1"
      ? await chromium.launch({
          args: chromium_stealth.args,
          executablePath: await chromium_stealth.executablePath(),
          headless: true,
        })
      : await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 1800 },
  });

  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    await page.emulateMedia({ media: "print" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
