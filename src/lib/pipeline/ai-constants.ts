import { type LucideIcon, Shield, Sparkles, Zap } from "lucide-react";
import type { NarrativeTone } from "@/types";

export const TONES: { id: NarrativeTone; label: string; desc: string; icon: LucideIcon }[] = [
  {
    id: "technical",
    label: "Technical",
    desc: "Detailed technical breakdown with metrics, headers, and performance analysis.",
    icon: Zap,
  },
  {
    id: "executive",
    label: "Executive",
    desc: "High-level business overview focused on SLA compliance and operational health.",
    icon: Sparkles,
  },
  {
    id: "compliance",
    label: "Compliance",
    desc: "Audit-ready report covering data handling, PII, and endpoint security.",
    icon: Shield,
  },
];

export const DEFAULT_PROMPTS: Record<NarrativeTone, string> = {
  technical: `You are writing the technical source narrative for a detailed engineering PDF.
Use concrete evidence from the supplied execution only and map your writing to the report sections.
Execution Overview: 2-3 sentences describing the service flow, the number of requests, and the main outcome of the run.
Health Summary: 3-5 sentences covering status-code spread, latency hotspots, error clustering, retries, and whether the run is technically trustworthy.
Per Request Breakdown: for each request, write 2-4 sentences that explain the endpoint behavior, timing, payload shape, headers, failures, and likely root cause or follow-up check.
Insights: 4-6 detailed observations about patterns an engineer should investigate, such as instability, dependency drift, unexpected headers, or repeated slow paths.
Risks: list only real technical risks such as cascading failures, auth instability, rate limiting, fragile request chains, or broken assumptions in the pipeline.
Recommendations: 3-5 prioritized technical actions with clear diagnostic or remediation intent.
Conclusion: a decisive engineering takeaway on whether this run is stable enough to trust and what should happen next.`,
  executive: `You are writing an executive-ready operations report that will be exported to PDF.
Keep the language concise, business-facing, and easy to scan while still being specific enough for leadership.
Execution Overview: 2-3 sentences that summarize what was tested, whether the flow completed, and the overall business result.
Health Summary: 2-4 sentences covering reliability, customer impact, major failures, and whether the run met expectations in plain language.
Per Request Breakdown: for each request, explain the outcome in business terms without jargon, including whether it looked healthy, slow, blocked, or risky.
Insights: 3-5 concise highlights about service health, execution speed, stakeholder impact, and any patterns that affect confidence.
Risks: capture only meaningful operational or business risks that may require escalation, ownership, or follow-up.
Recommendations: provide practical next actions for product, operations, or leadership stakeholders.
Conclusion: close with a clear statement on confidence, urgency, and whether the system appears ready for continued use.`,
  compliance: `You are writing an audit-style compliance narrative that will be used in a detailed PDF export.
Be strict, evidence-based, and focused on data handling, access control, traceability, and policy exposure.
Execution Overview: 2-3 sentences that describe the run from a compliance perspective, including any sensitive surfaces involved.
Health Summary: 3-5 sentences describing the posture of the run, with attention to authentication, observability, and whether controls looked sufficient.
Per Request Breakdown: for each request, explain what was observed from a compliance perspective, including whether the endpoint suggests safe, weak, or unclear handling.
Insights: 4-6 observations about authentication, headers, traceability, sensitive data exposure, retention clues, or missing controls.
Risks: list concrete compliance or security risks such as sensitive data exposure, weak auth signaling, missing auditability, or policy gaps.
Recommendations: provide remediation-oriented control improvements, logging improvements, or access-hardening steps.
Conclusion: state whether the run appears low risk, cautionary, or audit-sensitive based on the observed evidence.`,
};
