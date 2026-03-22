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
  technical:
    "Write a concise technical report using only execution data. Cover outcome, key metrics, per-step issues, and the most important engineering actions. Reference exact statuses, latencies, and errors. Avoid filler.",
  executive:
    "Write a concise executive summary using only execution data. Focus on business impact, overall reliability, major risks, and clear next actions. Keep it easy to scan and avoid jargon.",
  compliance:
    "Write a concise compliance review using only execution data. Focus on auth, sensitive data exposure, traceability, notable risks, and remediation actions. Be evidence-based and avoid speculation.",
};
