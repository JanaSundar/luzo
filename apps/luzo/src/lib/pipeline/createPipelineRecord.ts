import { createDefaultFlowDocument } from "@/features/flow-editor/domain/flow-document";
import type { NarrativeTone, Pipeline } from "@/types";

const technicalPrompt = `Perform an exhaustive technical audit as a Senior Performance Engineer:
- Structural Integrity: Validate protocol compliance and orchestration health.
- Performance Analysis: Identify P95/P99 latency spikes and database/cold-start bottlenecks.
- Granular Auditing: Evaluate every request for status-code validity and payload consistency.
- System Insights: Flag scalability issues, technical debt, and architectural risks.
- Engineering Risks: Surface race conditions, resource exhaustion, and security exposures.
- Remediation Roadmap: Provide prioritized, code-level optimizations (caching, indexing, validation).
- Final Assessment: Declare production readiness and stability with precise data.`;

export function createPipelineRecord(name: string): Pipeline {
  return {
    id: crypto.randomUUID(),
    flow: createDefaultFlowDocument(),
    name,
    steps: [],
    narrativeConfig: {
      tone: "technical" as NarrativeTone,
      prompt: technicalPrompt,
      enabled: true,
      length: "medium" as const,
      promptOverrides: {
        technical: technicalPrompt,
        executive: `Write a high-level operations summary for leadership export:
- Concise & Scalable: Use business-facing, non-technical language throughout.
- Execution Overview: Summarize test scope, completion status, and business impact.
- Health Summary: Report on reliability, customer impact, and expectation alignment.
- Business Logic Breakdown: Explain per-request outcomes in plain language (e.g., slow, blocked, healthy).
- Strategic Highlights: List 3-5 insights on service stability and speed.
- Escalate Risks: Capture only meaningful business risks requiring ownership or follow-up.
- Recommendations: Provide actionable growth or operational steps for leadership.
- Final Confidence: Close with a clear statement on urgency and production readiness.`,
        compliance: `Audit execution as a Security Representative focused on risk and policy gaps:
- Formal Tone: Use professional audit terminology and remediation-focused objectives.
- Executive Summary: Detail the overall compliance posture and specific violations found.
- Vulnerability Scan: Audit every request for sensitive data exposure or unauthorized logic.
- Risk Classification: Explicitly label all issues as Low, Medium, or High risk.
- Remediation Path: Build a technical roadmap to achieve 100% compliance.
- Certification Statement: Conclude on the pipeline's alignment with current security standards.`,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
