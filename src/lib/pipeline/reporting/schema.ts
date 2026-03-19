import { z } from "zod";
import type { NarrativeTone } from "@/types";

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

export function getReportSchema(_tone: NarrativeTone) {
  return narrativeOutputSchema;
}

export function buildReportSystemPrompt(tone: NarrativeTone, derivedTitle?: string) {
  const tonePrompt =
    tone === "executive"
      ? "Write for leadership. Focus on business impact, stability, and concise actions. Avoid technical jargon."
      : tone === "compliance"
        ? "Write like an auditor. Focus on risk, exposure, policy gaps, and remediation."
        : "Write for engineers. Focus on endpoint behavior, latency, failures, and request-level observations.";

  const titleHint = derivedTitle
    ? `Use "${derivedTitle}" as the implied report title context.`
    : "Use the provided execution context to infer the report theme.";

  return [
    tonePrompt,
    titleHint,
    "Return JSON only.",
    "Do not include markdown, code fences, or commentary outside the JSON object.",
    "Preserve the exact schema fields: summary, insights, requests, risks, recommendations, conclusion.",
    "Keep insights and recommendations specific to the supplied execution context only.",
  ].join(" ");
}
