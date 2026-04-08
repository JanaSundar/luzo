import type {
  RiskSummary,
  VariableAnalysisOutput,
  VariableReferenceEdge,
} from "@/types/worker-results";

export interface StepLineageView {
  incoming: VariableReferenceEdge[];
  outgoing: VariableReferenceEdge[];
  warnings: VariableReferenceEdge[];
  summary: RiskSummary;
}

export function getStepLineageView(
  analysis: VariableAnalysisOutput | null | undefined,
  stepId: string,
): StepLineageView {
  const emptySummary: RiskSummary = {
    incomingCount: 0,
    outgoingCount: 0,
    unresolvedCount: 0,
    riskyCount: 0,
  };
  if (!analysis) {
    return { incoming: [], outgoing: [], warnings: [], summary: emptySummary };
  }

  const incomingIds = analysis.byDependentStep[stepId] ?? [];
  const outgoingIds = analysis.bySourceStep[stepId] ?? [];
  const edgeById = new Map(analysis.edges.map((edge) => [edge.id, edge]));
  const incoming = incomingIds.flatMap((id) => {
    const edge = edgeById.get(id);
    return edge ? [edge] : [];
  });
  const outgoing = outgoingIds.flatMap((id) => {
    const edge = edgeById.get(id);
    return edge ? [edge] : [];
  });

  return {
    incoming,
    outgoing,
    warnings: incoming.filter((edge) => edge.resolutionStatus !== "resolved"),
    summary: analysis.riskByStep[stepId] ?? emptySummary,
  };
}
