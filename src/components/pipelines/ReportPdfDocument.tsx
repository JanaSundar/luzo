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
  page: {
    padding: PAGE_PADDING,
    fontFamily: "Inter",
    fontSize: 9,
    color: "#111827",
    lineHeight: 1.5,
  },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#111827", marginBottom: 12, opacity: 0.1 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  statLabel: {
    fontSize: 6,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 2,
  },
  statValue: { fontSize: 13, fontWeight: 700 },
  section: { marginTop: 8, marginBottom: 4 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paragraph: { fontSize: 8.5, lineHeight: 1.4, color: "#374151" },
  requestCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  requestMeta: { fontSize: 7, color: "#6b7280", marginBottom: 2 },
  requestTitle: { fontSize: 9, fontWeight: 700, marginBottom: 2 },
  bulletRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  bullet: { width: 8, fontSize: 9 },
  bulletText: { flex: 1, lineHeight: 1.45, fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 7,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: { fontSize: 7, color: "#6b7280" },
  header: {
    position: "absolute",
    top: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 7,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 6,
    alignItems: "center",
  },
  tableHeader: { backgroundColor: "#f9fafb", borderBottomColor: "#e5e7eb" },
  tableCell: { fontSize: 7, color: "#4b5563" },
});

interface ReportPdfDocumentProps {
  report: ExportReportModel;
}

export function ReportPdfDocument({ report }: ReportPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ marginBottom: 18 }}>
          <Text style={styles.title}>{sanitizeForPdf(report.title)}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Success Rate" value={`${report.metrics.successRate}%`} />
          <StatCard label="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
          <StatCard label="Total Steps" value={report.metrics.totalSteps.toString()} />
          <StatCard label="Failures" value={`${report.metrics.failedSteps}`} />
        </View>

        <Section title="Overview">
          <MarkdownText text={report.summary} />
        </Section>

        <Section title="Risk Analysis">
          <BulletList items={report.risks} />
        </Section>

        <Section title="Recommendations">
          <BulletList items={report.recommendations} />
        </Section>

        <Section title="Request Analysis">
          {report.requests.map((req, idx) => (
            <View key={idx} style={styles.requestCard} wrap={false}>
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}
              >
                <Text style={styles.requestTitle}>{sanitizeForPdf(req.name)}</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 7,
                      color: req.statusCode && req.statusCode < 400 ? "#059669" : "#dc2626",
                      fontWeight: 700,
                    }}
                  >
                    {req.statusCode || "ERR"}
                  </Text>
                  <Text style={{ fontSize: 7, color: "#6b7280" }}>{req.latencyMs}ms</Text>
                </View>
              </View>
              <Text style={{ fontSize: 6, color: "#94a3b8", marginBottom: 4 }}>
                {sanitizeForPdf(req.url)}
              </Text>
              <View style={{ borderLeftWidth: 1.5, borderLeftColor: "#e5e7eb", paddingLeft: 6 }}>
                <MarkdownText text={req.analysis} />
              </View>
            </View>
          ))}
        </Section>

        <Section title="Conclusion">
          <MarkdownText text={report.conclusion} />
        </Section>

        <View
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
            borderTopStyle: "dashed",
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Performance Appendix
          </Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { flex: 3, fontWeight: 700 }]}>ENDPOINT</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "center", fontWeight: 700 }]}>
                STATUS
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: 700 }]}>
                LATENCY
              </Text>
            </View>
            {report.requests.map((r, i) => (
              <View key={i} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{sanitizeForPdf(r.name)}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>
                  {r.statusCode || "---"}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                  {r.latencyMs}ms
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Footer generatedAt={report.generatedAt} />
      </Page>
    </Document>
  );
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={[styles.footer, { justifyContent: "flex-end" }]} fixed>
      <Text>{sanitizeForPdf(new Date(generatedAt).toLocaleDateString())}</Text>
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
        <View key={`${item}-${index}`} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <View style={{ flex: 1 }}>
            <MarkdownText text={item} />
          </View>
        </View>
      ))}
    </View>
  );
}

function MarkdownText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <View>
      {paragraphs.map((para, pIdx) => {
        const parts = sanitizeForPdf(para).split(/(\*\*.*?\*\*)/g);
        return (
          <View key={pIdx} style={{ marginBottom: 4 }}>
            <Text style={styles.paragraph}>
              {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <Text
                      key={i}
                      style={{ fontWeight: 700, color: "#111827", backgroundColor: "#f3f4f6" }}
                    >
                      {part.slice(2, -2)}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
