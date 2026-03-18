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
  technical: `Analyze the API pipeline execution. Provide a detailed technical breakdown including:
- Status codes and response patterns
- Latency analysis and performance bottlenecks
- Error diagnosis and recommendations
- Data flow between dependent steps`,
  executive: `Provide a high-level executive summary of the API pipeline execution.
Focus on business impact, SLA compliance, and any operational concerns that require attention.
Keep the language clear and non-technical.`,
  compliance: `Generate a compliance audit report for the API pipeline execution.
Assess data handling practices, PII exposure risks, and endpoint security posture.
Flag any potential compliance violations.`,
};
