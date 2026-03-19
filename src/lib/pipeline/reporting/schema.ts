import { z } from "zod";
import type { NarrativeTone } from "@/types";
import type { ReportLength } from "@/types/pipeline-report";

const narrativeOutputSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()).default([]),
  requests: z
    .array(
      z.object({
        name: z.string(),
        analysis: z.string(),
      })
    )
    .default([]),
  risks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  conclusion: z.string(),
});

const technicalOutputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  metrics: z.object({
    totalSteps: z.number(),
    successRate: z.number(),
    failedSteps: z.number(),
    avgLatency: z.number(),
    p95Latency: z.number(),
  }),
  stepAnalysis: z.array(
    z.object({
      stepName: z.string(),
      status: z.string(),
      issues: z.array(z.string()),
      observations: z.array(z.string()),
    })
  ),
  recommendations: z.array(z.string()),
});

export function getReportSchema(tone: NarrativeTone) {
  if (tone === "technical") {
    return technicalOutputSchema;
  }
  return narrativeOutputSchema;
}

function buildLengthGuidance(length: ReportLength): string {
  switch (length) {
    case "short":
      return "Report length requirement: short. Max 1 page. Summary + key issues only. Max 3 recommendations.";
    case "medium":
      return "Report length requirement: medium. Moderate detail. Include step analysis. 5-7 recommendations.";
    case "long":
      return "Report length requirement: long. Detailed breakdown of ALL steps. Deep analysis. Include trends, patterns, correlations. Minimum 3 pages worth of content. 8-12 recommendations.";
  }
}

function buildSpecificityConstraint(): string {
  return [
    "Every statement MUST be backed by actual data from input.",
    "Avoid generic phrases like:",
    "- 'system is working fine'",
    "- 'some improvements can be made'",
    "- 'overall performance looks good'",
    "",
    "Instead:",
    "- Mention exact step names",
    "- Mention exact latency values",
    "- Mention exact status codes",
    "- Mention exact failure reasons",
  ].join("\n");
}

function buildStrictJsonConstraint(): string {
  return "Return ONLY valid JSON. Do NOT include markdown. Do NOT include explanation outside JSON.";
}

function buildTitleHint(derivedTitle?: string): string {
  return derivedTitle
    ? `Use "${derivedTitle}" as the implied report title context.`
    : "Use the provided execution context to infer the report theme.";
}

export function buildReportSystemPrompt(
  tone: NarrativeTone,
  length: ReportLength,
  derivedTitle?: string
) {
  if (tone === "technical") {
    const parts = [
      "You are a senior backend engineer analyzing API pipeline executions.",
      "",
      "Generate a STRICT structured technical report.",
      "",
      "Follow these rules:",
      "- Be precise and data-driven",
      "- Do NOT be generic",
      "- Do NOT omit important metrics",
      "- Use actual values from input",
      "- Highlight failures, latency issues, and anomalies",
      "",
      "Output MUST be valid JSON with this structure:",
      "",
      JSON.stringify(
        {
          title: "string",
          summary: "string",
          metrics: {
            totalSteps: "number",
            successRate: "number",
            failedSteps: "number",
            avgLatency: "number",
            p95Latency: "number",
          },
          stepAnalysis: [
            {
              stepName: "string",
              status: "string",
              issues: "string[]",
              observations: "string[]",
            },
          ],
          recommendations: "string[]",
        },
        null,
        2
      ),
      "",
      buildSpecificityConstraint(),
      "",
      buildLengthGuidance(length),
      "",
      buildStrictJsonConstraint(),
      "",
      buildTitleHint(derivedTitle),
    ];
    return parts.join("\n");
  }

  if (tone === "executive") {
    const parts = [
      "Write for leadership. Focus on business impact, stability, and concise actions. Avoid technical jargon.",
      buildTitleHint(derivedTitle),
      "Return JSON only.",
      "Do not include markdown, code fences, or commentary outside the JSON object.",
      "Preserve the exact schema fields: summary, insights, requests, risks, recommendations, conclusion.",
      "Keep insights and recommendations specific to the supplied execution context only.",
      buildSpecificityConstraint(),
      buildLengthGuidance(length),
      buildStrictJsonConstraint(),
    ];
    return parts.join(" ");
  }

  if (tone === "compliance") {
    const parts = [
      "Write like an auditor. Focus on risk, exposure, policy gaps, and remediation.",
      buildTitleHint(derivedTitle),
      "Return JSON only.",
      "Do not include markdown, code fences, or commentary outside the JSON object.",
      "Preserve the exact schema fields: summary, insights, requests, risks, recommendations, conclusion.",
      "Keep insights and recommendations specific to the supplied execution context only.",
      buildSpecificityConstraint(),
      buildLengthGuidance(length),
      buildStrictJsonConstraint(),
    ];
    return parts.join(" ");
  }

  return buildReportSystemPrompt("technical", length, derivedTitle);
}
