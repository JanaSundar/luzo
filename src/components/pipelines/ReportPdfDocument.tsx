"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { PipelineExecutionResult } from "@/types";

// Register Inter (matches website font) – gentle, smooth, readable
const INTER_WOFF_BASE = "https://unpkg.com/@fontsource/inter@5.0.8/files";
Font.register({
  family: "Inter",
  fonts: [
    { src: `${INTER_WOFF_BASE}/inter-latin-400-normal.woff`, fontWeight: 400 },
    { src: `${INTER_WOFF_BASE}/inter-latin-700-normal.woff`, fontWeight: 700 },
  ],
});

import { sanitizeForPdf } from "@/lib/utils/pdf-sanitize";
import { renderMarkdownToPdf } from "@/lib/utils/markdown-to-pdf";

const colors = {
  emerald: "#059669",
  emeraldLight: "#d1fae5",
  amber: "#d97706",
  amberLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fecaca",
  redBorder: "#f87171",
  blue: "#2563eb",
  muted: "#6b7280",
  foreground: "#111827",
  mutedBg: "#f3f4f6",
};

// Consistent spacing scale (base 8)
const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Inter",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: space.sm,
    color: colors.foreground,
  },
  pipeline: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: space.lg,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.foreground,
    marginBottom: space.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: space.md,
    marginBottom: space.xl,
  },
  statCard: {
    flex: 1,
    padding: space.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.muted,
    marginBottom: space.xs,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: space.md,
    marginTop: space.xl,
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.mutedBg,
    paddingBottom: space.sm,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 0,
    color: colors.foreground,
  },
  summaryBlock: {
    marginBottom: space.xl,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.mutedBg,
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.muted,
  },
  tableRow: {
    flexDirection: "row",
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.mutedBg,
  },
  tableRowHighlight: {
    backgroundColor: colors.redLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.red,
  },
  tableCell: {
    fontSize: 9,
  },
  statusError: {
    backgroundColor: colors.redLight,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: 4,
    fontWeight: 700,
    color: colors.red,
  },
  statusSuccess: {
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: 4,
    fontWeight: 700,
    color: colors.emerald,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    fontSize: 8,
    color: colors.muted,
  },
});

interface ReportPdfDocumentProps {
  reportTitle: string;
  pipelineName: string;
  reportOutput: string;
  executionResult: PipelineExecutionResult;
}

export function ReportPdfDocument({
  reportTitle,
  pipelineName,
  reportOutput,
  executionResult,
}: ReportPdfDocumentProps) {
  const results = executionResult.results;
  const successCount = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const latencies = results.map((r) => r.time).sort((a, b) => a - b);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const p95Latency =
    latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1] ?? 0;
  const failCount = results.length - successCount;
  const successRate = Math.round((successCount / results.length) * 100);

  type AccentKey = "green" | "amber" | "red";
  const stats: { label: string; value: string; accent: AccentKey }[] = [
    {
      label: "Success Rate",
      value: `${successRate}%`,
      accent: successRate === 100 ? "green" : successRate > 80 ? "amber" : "red",
    },
    {
      label: "Avg Latency",
      value: `${avgLatency}ms`,
      accent: avgLatency < 500 ? "green" : "amber",
    },
    { label: "P95 Latency", value: `${p95Latency}ms`, accent: p95Latency < 1000 ? "green" : "red" },
    { label: "Errors", value: `${failCount}`, accent: failCount === 0 ? "green" : "red" },
  ];

  const accentStyles: Record<
    AccentKey,
    { backgroundColor: string; borderColor: string; color: string }
  > = {
    green: {
      backgroundColor: colors.emeraldLight,
      borderColor: colors.emerald,
      color: colors.emerald,
    },
    amber: { backgroundColor: colors.amberLight, borderColor: colors.amber, color: colors.amber },
    red: { backgroundColor: colors.redLight, borderColor: colors.red, color: colors.red },
  };

  const methodColors: Record<string, string> = {
    GET: colors.emerald,
    POST: colors.blue,
    PUT: colors.amber,
    DELETE: colors.red,
  };

  const summaryNodes = renderMarkdownToPdf(reportOutput);
  const safeTitle = sanitizeForPdf(reportTitle);
  const safePipeline = sanitizeForPdf(pipelineName || "N/A");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{safeTitle}</Text>
        <Text style={styles.pipeline}>PIPELINE: {safePipeline}</Text>
        <View style={styles.divider} />

        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={[
                styles.statCard,
                {
                  backgroundColor: accentStyles[s.accent].backgroundColor,
                  borderColor: accentStyles[s.accent].borderColor,
                },
              ]}
            >
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: accentStyles[s.accent].color }]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Executive Summary</Text>
        <View style={styles.summaryBlock}>{summaryNodes}</View>

        <Text style={styles.sectionTitle}>Endpoint Performance Metrics</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Method/Endpoint</Text>
          <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Latency</Text>
          <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Size</Text>
        </View>

        {results.map((r) => {
          const isError = r.status >= 300;
          const isHighLatency = r.time > 1000;
          const isOutlier = isError || isHighLatency;
          const methodColor = methodColors[r.method] ?? colors.foreground;

          return (
            <View
              key={r.stepId}
              style={[styles.tableRow, ...(isOutlier ? [styles.tableRowHighlight] : [])]}
            >
              <View style={{ width: "40%" }}>
                <Text style={[styles.tableCell, { color: methodColor, fontWeight: 700 }]}>
                  {sanitizeForPdf(r.method)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: isOutlier ? colors.foreground : colors.muted,
                      fontWeight: isOutlier ? 700 : 400,
                    },
                  ]}
                >
                  {sanitizeForPdf(r.stepName)}
                </Text>
              </View>
              <View style={{ width: "15%" }}>
                <Text style={[isError ? styles.statusError : styles.statusSuccess]}>
                  {String(r.status)}
                </Text>
              </View>
              <Text
                style={[
                  styles.tableCell,
                  {
                    width: "20%",
                    fontWeight: 700,
                    color: isHighLatency
                      ? colors.red
                      : r.time > 500
                        ? colors.amber
                        : colors.foreground,
                  },
                ]}
              >
                {r.time}ms
              </Text>
              <Text style={[styles.tableCell, { width: "15%", color: colors.muted }]}>
                {(r.size / 1024).toFixed(1)}kb
              </Text>
            </View>
          );
        })}

        <Text style={styles.footer}>{sanitizeForPdf(new Date().toLocaleDateString())}</Text>
      </Page>
    </Document>
  );
}
