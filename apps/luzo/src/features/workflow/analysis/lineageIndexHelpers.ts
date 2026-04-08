import type {
  ImpactRecord,
  LineageResolutionStatus,
  RiskSummary,
  VariableProducer,
  VariableReferenceEdge,
} from "@/types/worker-results";

export const PRODUCED_ROOTS = [
  "response",
  "response.status",
  "response.statusText",
  "response.headers",
  "response.body",
  "response.time",
  "response.size",
] as const;

export function resolveLineageStatus({
  currentStepIndex,
  sourceIndex,
  path,
  producer,
}: {
  currentStepIndex: number;
  sourceIndex: number | null;
  path: string;
  producer: VariableProducer | null;
}): LineageResolutionStatus {
  if (sourceIndex == null) return "unresolved_alias";
  if (sourceIndex >= currentStepIndex) return "forward_reference";
  if (!path.startsWith("response")) return "unresolved_path";
  if (!producer) return "runtime_only";

  const available = new Set(producer.availablePaths);
  if (available.has(path)) return "resolved";
  if (path === "response.headers" || path === "response.body") return "resolved";
  if (path.startsWith("response.body.") || path.startsWith("response.headers.")) {
    return producer.availablePaths.length > PRODUCED_ROOTS.length
      ? "unresolved_path"
      : "runtime_only";
  }

  return "unresolved_path";
}

export function toRiskFlags(status: LineageResolutionStatus): VariableReferenceEdge["riskFlags"] {
  switch (status) {
    case "unresolved_alias":
      return ["missing_alias"];
    case "forward_reference":
      return ["forward_reference"];
    case "unresolved_path":
      return ["unknown_path"];
    case "runtime_only":
      return ["runtime_required"];
    default:
      return [];
  }
}

export function isControlCriticalField(field: string) {
  return (
    field === "url" ||
    field.startsWith("auth.") ||
    field.startsWith("headers.") ||
    field.startsWith("params.")
  );
}

export function buildImpacts({
  edges,
  consumersBySourceStep,
}: {
  edges: VariableReferenceEdge[];
  consumersBySourceStep: Record<string, string[]>;
}): ImpactRecord[] {
  const grouped = new Map<string, VariableReferenceEdge[]>();

  edges.forEach((edge) => {
    if (!edge.sourceStepId || !edge.referencedPath) return;
    const key = `${edge.sourceStepId}:${edge.referencedPath}`;
    const current = grouped.get(key) ?? [];
    current.push(edge);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries()).map(([key, groupedEdges]) => {
    const [sourceStepId, sourcePath] = key.split(":");
    const dependentStepIds = Array.from(
      new Set(groupedEdges.map((edge) => edge.consumerStepId)),
    ).sort();
    const dependentFields = Array.from(
      new Set(groupedEdges.map((edge) => edge.consumerField)),
    ).sort();
    const transitiveDependentStepIds = collectTransitiveDependents({
      sourceStepId,
      consumersBySourceStep,
    });
    const severity = groupedEdges.some((edge) => edge.riskFlags.length > 0) ? "warning" : "info";

    return {
      sourceStepId,
      sourcePath,
      dependentStepIds,
      transitiveDependentStepIds,
      dependentFields,
      severity,
    };
  });
}

export function buildRiskByStep({
  stepIds,
  edges,
}: {
  stepIds: string[];
  edges: VariableReferenceEdge[];
}) {
  const summary: Record<string, RiskSummary> = Object.fromEntries(
    stepIds.map((stepId) => [
      stepId,
      {
        incomingCount: 0,
        outgoingCount: 0,
        unresolvedCount: 0,
        riskyCount: 0,
      } satisfies RiskSummary,
    ]),
  );

  edges.forEach((edge) => {
    summary[edge.consumerStepId] ??= emptyRiskSummary();
    summary[edge.consumerStepId].incomingCount += 1;
    if (edge.resolutionStatus !== "resolved") summary[edge.consumerStepId].unresolvedCount += 1;
    if (edge.riskFlags.length > 0) summary[edge.consumerStepId].riskyCount += 1;

    if (!edge.sourceStepId) return;
    summary[edge.sourceStepId] ??= emptyRiskSummary();
    summary[edge.sourceStepId].outgoingCount += 1;
    if (edge.riskFlags.length > 0) summary[edge.sourceStepId].riskyCount += 1;
  });

  return summary;
}

function collectTransitiveDependents({
  sourceStepId,
  consumersBySourceStep,
}: {
  sourceStepId: string;
  consumersBySourceStep: Record<string, string[]>;
}) {
  const visited = new Set<string>();
  const queue = [...(consumersBySourceStep[sourceStepId] ?? [])];

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);
    queue.push(...(consumersBySourceStep[next] ?? []));
  }

  return Array.from(visited).sort();
}

function emptyRiskSummary(): RiskSummary {
  return { incomingCount: 0, outgoingCount: 0, unresolvedCount: 0, riskyCount: 0 };
}
