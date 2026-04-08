import { Streamdown } from "streamdown";
import type { ExportReportModel } from "@/types/pipeline-report";
import {
  getDefaultSectionOrder,
  type ReportTopLevelSectionKey,
} from "@/features/reports/report-editor";
import {
  PerformanceAppendixTable,
  ReportHeader,
  ReportLayoutContainer,
  ReportList,
  ReportSection,
  ReportStat,
  RequestCard,
} from "./ReportShared";

export function ReportPreviewContent({
  report,
  generatedAt,
}: {
  report: ExportReportModel;
  generatedAt: string;
}) {
  const orderedSections = normalizeSectionOrder(report.sectionOrder);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ReportLayoutContainer>
        <ReportHeader title={report.title}>
          <ReportStat label="Success Rate" value={`${report.metrics.successRate}%`} />
          <ReportStat label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
          <ReportStat label="P95 Latency" value={`${report.metrics.p95LatencyMs}ms`} />
          <ReportStat label="Failures" value={`${report.metrics.failedSteps}`} />
        </ReportHeader>

        <div className="space-y-12">
          {orderedSections.map((sectionKey) => (
            <PreviewSection key={sectionKey} report={report} sectionKey={sectionKey} />
          ))}

          <ReportSection title="Performance Appendix">
            <PerformanceAppendixTable metrics={report.endpointMetrics} />
          </ReportSection>
        </div>

        <footer className="mt-12 flex items-center justify-between border-t pt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
          <span>Generated on {new Date(generatedAt).toLocaleString()}</span>
        </footer>
      </ReportLayoutContainer>
    </div>
  );
}

function PreviewSection({
  report,
  sectionKey,
}: {
  report: ExportReportModel;
  sectionKey: ReportTopLevelSectionKey;
}) {
  if (sectionKey.startsWith("custom:")) {
    const customSection = report.customSections?.find(
      (section) => section.id === sectionKey.slice("custom:".length),
    );

    if (!customSection) return null;

    return (
      <ReportSection title={customSection.title}>
        <Streamdown>{customSection.content}</Streamdown>
      </ReportSection>
    );
  }

  if (sectionKey === "summary") {
    return (
      <ReportSection title="Executive Summary">
        <Streamdown>{report.summary}</Streamdown>
      </ReportSection>
    );
  }

  if (sectionKey === "healthSummary") {
    return (
      <ReportSection title="Health Summary">
        <Streamdown>{report.healthSummary}</Streamdown>
      </ReportSection>
    );
  }

  if (sectionKey === "insights") {
    return <ListSection title="Key Insights" items={report.insights} />;
  }

  if (sectionKey === "recommendations") {
    return <ListSection title="Recommendations" items={report.recommendations} />;
  }

  if (sectionKey === "risks") {
    return <ListSection title="Risks" items={report.risks} />;
  }

  if (sectionKey === "requests") {
    return (
      <ReportSection title="Per Request Breakdown">
        <div className="space-y-4">
          {report.requests.map((request) => (
            <RequestCard
              key={request.stepId}
              method={request.method}
              name={request.name}
              statusCode={request.statusCode}
              latencyMs={request.latencyMs}
              url={request.url}
            >
              <Streamdown>{request.analysis}</Streamdown>
            </RequestCard>
          ))}
        </div>
      </ReportSection>
    );
  }

  return (
    <ReportSection title="Conclusion">
      <Streamdown>{report.conclusion}</Streamdown>
    </ReportSection>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <ReportSection title={title}>
      <ReportList
        items={items.map((item, index) => (
          <Streamdown key={index}>{item}</Streamdown>
        ))}
      />
    </ReportSection>
  );
}

function normalizeSectionOrder(order: string[] | undefined): ReportTopLevelSectionKey[] {
  const fallback = getDefaultSectionOrder();
  const customSections = (order ?? []).filter((key): key is `custom:${string}` =>
    key.startsWith("custom:"),
  );
  const allowedValues = [...fallback, ...customSections];
  const allowed = new Set<ReportTopLevelSectionKey>(allowedValues);
  const unique = (order ?? [])
    .filter((key): key is ReportTopLevelSectionKey => allowed.has(key as ReportTopLevelSectionKey))
    .filter((key, index, array) => array.indexOf(key) === index);

  return [...unique, ...allowedValues.filter((key) => !unique.includes(key))];
}
