import type { PipelineStep } from "@/types";
import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { buildAliasesFromSteps } from "@/features/pipeline/step-aliases";
import type { FlowEdgeRecord } from "@/types/workflow";

export function createFlowEdge(
  source: string,
  target: string,
  semantics: FlowEdgeRecord["semantics"],
  sourceHandle?: string,
  targetHandle?: string,
): FlowEdgeRecord {
  return {
    id: `${source}:${target}:${sourceHandle ?? semantics}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    semantics,
  };
}

export function dedupeEdges(edges: FlowEdgeRecord[]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source}:${edge.target}:${edge.semantics}:${edge.sourceHandle ?? ""}:${edge.targetHandle ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function withStartConnections(
  edges: FlowEdgeRecord[],
  startNodeId: string,
  requestNodeIds: string[],
) {
  const requestTargets = new Set(requestNodeIds);
  const hasStartEdge = edges.some((edge) => edge.source === startNodeId);
  if (hasStartEdge || requestNodeIds.length === 0) return edges;

  const incomingCounts = new Map<string, number>();
  for (const edge of edges) {
    if (!requestTargets.has(edge.target) || !requestTargets.has(edge.source)) continue;
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }
  const entryNodes = requestNodeIds.filter((nodeId) => (incomingCounts.get(nodeId) ?? 0) === 0);
  return [...edges, ...entryNodes.map((nodeId) => createFlowEdge(startNodeId, nodeId, "control"))];
}

export function buildRequestDependencyEdges(
  steps: PipelineStep[],
  { includePositionalAliases = true }: { includePositionalAliases?: boolean } = {},
) {
  const aliases = buildAliasesFromSteps(steps).map((alias) => ({
    ...alias,
    refs: includePositionalAliases ? alias.refs : alias.refs.filter((ref) => ref !== alias.alias),
  }));
  const edges: FlowEdgeRecord[] = [];

  for (const step of steps) {
    const dependencies = collectStepDependencies(step, aliases);
    for (const dependency of dependencies) {
      const source = aliases.find((candidate) => candidate.refs.includes(dependency.alias));
      if (!source || source.stepId === step.id) continue;
      edges.push(createFlowEdge(source.stepId, step.id, "control"));
    }
  }

  return dedupeEdges(edges);
}
