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
  technical: `Analyze the API pipeline execution and provide a detailed technical breakdown.

**Required sections:**
- **Status & Response Patterns**: Summarize HTTP status codes, success/failure rates, and any error responses. Note response header patterns (e.g. cache-control, content-type) where relevant.
- **Performance Analysis**: Latency per step with timing breakdown, identify bottlenecks, compare against typical baselines (e.g. <200ms good, 200–500ms acceptable, >1000ms critical).
- **Error Diagnosis**: Root cause for any failures, include error messages or stack traces when available, retry recommendations, and concrete debugging hints.
- **Data Flow**: How data passes between steps, variable dependencies, and potential race conditions or ordering issues.
- **Recommendations**: Concrete next steps for optimization, monitoring, or fixing issues—prioritized by impact.`,
  executive: `Provide a high-level executive summary of the API pipeline execution.

**Required focus:**
- **One-line Summary**: Lead with a single sentence capturing overall health and outcome.
- **Business Impact**: What succeeded, what failed, and implications for users or downstream systems.
- **SLA & Reliability**: Overall health, uptime implications, risk levels (low/medium/high/critical), and any risks requiring escalation.
- **Key Metrics**: Success rate, total duration, and anomalies in plain language—avoid technical jargon.
- **Action Items**: Clear, non-technical recommendations for stakeholders with owners and timelines where applicable.
- **Tone**: Concise, confident, suitable for C-level or product owners.`,
  compliance: `Generate a compliance audit report for the API pipeline execution.

**Required sections:**
- **Data Handling**: What data was transmitted, stored, or exposed; classification of sensitivity (public, internal, confidential, restricted).
- **PII & Privacy**: Identify any PII in requests/responses, assess exposure and masking. Map to GDPR (data minimization, purpose limitation) or HIPAA where applicable.
- **Security Posture**: Auth mechanisms, headers, TLS, and endpoint security practices. Note any plaintext or weak auth.
- **Audit Trail**: Request/response flow, timestamps, and traceability for compliance. Assess retention and logging adequacy.
- **Violations & Risks**: Flag potential GDPR, HIPAA, SOC2, or policy violations; severity and remediation steps.`,
};
