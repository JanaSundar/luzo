import { z } from "zod";
import type { NarrativeTone } from "@/types";
import type { ReportLength } from "@/types/pipeline-report";

const narrativeOutputSchema = z.object({
  title: z.string().describe("A short, punchy, and descriptive title for the report (max 6 words)"),
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
      return "LENGTH CONSTRAINT: BRIEF. Focus only on critical failures and the executive summary. Keep the 'summary' under 200 words. Provide exactly 3 high-priority recommendations.";
    case "medium":
      return "LENGTH CONSTRAINT: BALANCED. Provide moderate detail for all sections. 'summary' should be approximately 400 words. Provide 5-7 distinct recommendations.";
    case "long":
      return "LENGTH CONSTRAINT: EXHAUSTIVE. Provide deep, granular analysis for every single request and metric. Expand on root causes and long-term implications. 'summary' should be at least 800-1000 words. Provide 10+ detailed recommendations.";
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
    "",
    "Structure:",
    "- Use short, punchy paragraphs (max 2-3 sentences each)",
    "- CRITICAL: EVERY paragraph must start on a NEW LINE. Use double newlines (\n\n) between paragraphs.",
    "- Use bullet points for lists of issues or observations",
    "- Use **bold text** to highlight critical performance or failure metrics",
  ].join("\n");
}

function buildStrictJsonConstraint(): string {
  return "Return ONLY valid JSON. Do NOT include markdown blocks outside the JSON. Within the JSON fields, use markdown for bolding (e.g. **text**) to highlight critical data points. Avoid long paragraphs; use concise sentences and multiple lines if necessary.";
}

function buildTitleHint(derivedTitle?: string): string {
  return derivedTitle
    ? `The report title should incorporate "${derivedTitle}" in a descriptive way (e.g. "${derivedTitle} - Comprehensive Technical Audit – Infrastructure & Performance").`
    : "Generate a professional, unique thematic report title based on the execution context (e.g. 'Comprehensive Technical Audit – Infrastructure & Performance'). Avoid generic titles like 'Report' or 'Execution Analysis'.";
}

export function buildReportSystemPrompt(
  tone: NarrativeTone,
  length: ReportLength,
  derivedTitle?: string
) {
  if (tone === "technical") {
    const parts = [
      "Generate an exhaustive technical audit as a Senior Performance Engineer:",
      "- Structural Integrity: Validate protocol compliance and orchestration health.",
      "- Performance Analysis: Identify P95/P99 latency spikes and database/cold-start bottlenecks.",
      "- Granular Auditing: Evaluate every request for status-code validity and payload consistency.",
      "- System Insights: Flag scalability issues, technical debt, and architectural risks.",
      "- Engineering Risks: Surface race conditions, resource exhaustion, and security exposures.",
      "- Remediation Roadmap: Provide prioritized, code-level optimizations (caching, indexing, validation).",
      "- Final Assessment: Declare production readiness and stability with precise data.",
      "",
      "The 'title' should be a professional AI-generated name (max 10 words) expressing the theme (e.g. 'Comprehensive Technical Audit – Infrastructure & Performance').",
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
      "Write a high-level operations summary for leadership export:",
      "- Concise & Scalable: Use business-facing, non-technical language throughout.",
      "- Execution Overview: Summarize test scope, completion status, and business impact.",
      "- Health Summary: Report on reliability, customer impact, and expectation alignment.",
      "- Business Logic Breakdown: Explain per-request outcomes in plain language (e.g., slow, blocked, healthy).",
      "- Strategic Highlights: List 3-5 insights on service stability and speed.",
      "- Escalate Risks: Capture only meaningful business risks requiring ownership or follow-up.",
      "- Recommendations: Provide actionable growth or operational steps for leadership.",
      "- Final Confidence: Close with a clear statement on urgency and production readiness.",
      "",
      "The 'title' should be a professional AI-generated name (max 10 words) incorporating the pipeline theme (e.g. 'Operational Intelligence & Business Impact Summary').",
      buildTitleHint(derivedTitle),
      "Return JSON only.",
      "Do not include markdown, code fences, or commentary outside the JSON object.",
      "Preserve the exact schema fields: title, summary, insights, requests, risks, recommendations, conclusion.",
      "Keep insights and recommendations specific to the supplied execution context only.",
      buildSpecificityConstraint(),
      buildLengthGuidance(length),
      buildStrictJsonConstraint(),
    ];
    return parts.join("\n\n");
  }

  if (tone === "compliance") {
    const parts = [
      "Audit execution as a Security Representative focused on risk and policy gaps:",
      "- Formal Tone: Use professional audit terminology and remediation-focused objectives.",
      "- Executive Summary: Detail the overall compliance posture and specific violations found.",
      "- Vulnerability Scan: Audit every request for sensitive data exposure or unauthorized logic.",
      "- Risk Classification: Explicitly label all issues as Low, Medium, or High risk.",
      "- Remediation Path: Build a technical roadmap to achieve 100% compliance.",
      "- Certification Statement: Conclude on the pipeline's alignment with current security standards.",
      "",
      "The 'title' should be a professional AI-generated name (max 6 words) incorporating the pipeline theme (e.g. 'Compliance Audit Narrative' or 'Policy Vulnerability Assessment').",
      buildTitleHint(derivedTitle),
      "Return JSON only.",
      "Do not include markdown, code fences, or commentary outside the JSON object.",
      "Preserve the exact schema fields: title, summary, insights, requests, risks, recommendations, conclusion.",
      "Keep insights and recommendations specific to the supplied execution context only.",
      buildSpecificityConstraint(),
      buildLengthGuidance(length),
      buildStrictJsonConstraint(),
    ];
    return parts.join("\n\n");
  }

  return buildReportSystemPrompt("technical", length, derivedTitle);
}
