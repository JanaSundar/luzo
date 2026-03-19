"use client";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { sanitizeForPdf } from "@/lib/utils/pdf-sanitize";
import type { ExportReportModel } from "@/types/pipeline-debug";

const INTER_WOFF_BASE = "https://unpkg.com/@fontsource/inter@5.0.8/files";
Font.register({
  family: "Inter",
  fonts: [
    { src: `${INTER_WOFF_BASE}/inter-latin-400-normal.woff`, fontWeight: 400 },
    { src: `${INTER_WOFF_BASE}/inter-latin-700-normal.woff`, fontWeight: 700 },
  ],
});

const PAGE_PADDING = 40;

const styles = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: "Inter", fontSize: 10, color: "#111827" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#111827", marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  statLabel: { fontSize: 7, textTransform: "uppercase", color: "#6b7280", marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 700 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  paragraph: { lineHeight: 1.5, marginBottom: 8 },
  requestCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  requestMeta: { fontSize: 8, color: "#6b7280", marginBottom: 4 },
  requestTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  bullet: { width: 8, fontWeight: 700 },
  bulletText: { flex: 1, lineHeight: 1.45 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 8,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: { fontSize: 8, color: "#6b7280" },
  header: {
    position: "absolute",
    top: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 8,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

interface ReportPdfDocumentProps {
  report: ExportReportModel;
}

export function ReportPdfDocument({ report }: ReportPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header title={report.title} pipelineName={report.pipelineName} />
        <Text style={styles.title}>{sanitizeForPdf(report.title)}</Text>
        <Text style={styles.meta}>
          {sanitizeForPdf(report.pipelineName)} · {sanitizeForPdf(report.tone.toUpperCase())}
        </Text>
        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <StatCard label="Success Rate" value={`${report.metrics.successRate}%`} />
          <StatCard label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
          <StatCard label="P95 Latency" value={`${report.metrics.p95LatencyMs}ms`} />
          <StatCard label="Failures" value={`${report.metrics.failedSteps}`} />
        </View>

        <Section title="Executive Summary">
          <Text style={styles.paragraph}>{sanitizeForPdf(report.summary)}</Text>
        </Section>

        <Section title="Health Summary">
          <Text style={styles.paragraph}>{sanitizeForPdf(report.healthSummary)}</Text>
        </Section>

        <Footer generatedAt={report.generatedAt} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header title={report.title} pipelineName={report.pipelineName} />

        <Section title="Per Request Breakdown">
          {report.requests.map((request, index) => (
            <View key={request.stepId ?? `request-${index}`} style={styles.requestCard}>
              <Text style={styles.requestTitle}>{sanitizeForPdf(request.name)}</Text>
              <Text style={styles.requestMeta}>
                {sanitizeForPdf(request.method)} · {sanitizeForPdf(request.url)}
              </Text>
              <Text style={styles.requestMeta}>
                Status {request.statusCode ?? "N/A"} · {request.latencyMs ?? 0}ms
              </Text>
              <Text style={styles.paragraph}>{sanitizeForPdf(request.analysis)}</Text>
            </View>
          ))}
        </Section>

        <Footer generatedAt={report.generatedAt} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header title={report.title} pipelineName={report.pipelineName} />

        <Section title="Key Insights">
          <BulletList items={report.insights} />
        </Section>

        <Section title="Recommendations">
          <BulletList items={report.recommendations} />
        </Section>

        <Section title="Risks">
          <BulletList items={report.risks} />
        </Section>

        <Footer generatedAt={report.generatedAt} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header title={report.title} pipelineName={report.pipelineName} />

        <Section title="Conclusion">
          <Text style={styles.paragraph}>{sanitizeForPdf(report.conclusion)}</Text>
        </Section>

        <View
          style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}
        >
          <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 8 }}>Report Metrics</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <MetricItem label="Total Steps" value={String(report.metrics.totalSteps)} />
            <MetricItem label="Failed Steps" value={String(report.metrics.failedSteps)} />
            <MetricItem label="Success Rate" value={`${report.metrics.successRate}%`} />
            <MetricItem label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
            <MetricItem label="P95 Latency" value={`${report.metrics.p95LatencyMs}ms`} />
            <MetricItem label="Total Duration" value={`${report.metrics.totalDurationMs}ms`} />
          </View>
        </View>

        <Footer generatedAt={report.generatedAt} />
      </Page>
    </Document>
  );
}

function Header({ title, pipelineName }: { title: string; pipelineName: string }) {
  return (
    <View style={styles.header} fixed>
      <Text>{sanitizeForPdf(pipelineName)}</Text>
      <Text>{sanitizeForPdf(title)}</Text>
    </View>
  );
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{sanitizeForPdf(new Date(generatedAt).toLocaleString())}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{sanitizeForPdf(label)}</Text>
      <Text style={styles.statValue}>{sanitizeForPdf(value)}</Text>
    </View>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8, minWidth: 80 }}>
      <Text style={{ fontSize: 7, color: "#6b7280" }}>{sanitizeForPdf(label)}</Text>
      <Text style={{ fontSize: 10, fontWeight: 700 }}>{sanitizeForPdf(value)}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sanitizeForPdf(title)}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  const safeItems = (items ?? []).length > 0 ? items : ["No items available."];
  return (
    <View>
      {safeItems.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>-</Text>
          <Text style={styles.bulletText}>{sanitizeForPdf(item)}</Text>
        </View>
      ))}
    </View>
  );
}
