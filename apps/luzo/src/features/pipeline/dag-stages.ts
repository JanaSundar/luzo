export function getExecutionStages(
  sortedStepIds: string[],
  adjacency: Map<string, string[]>,
): string[][] {
  const allowed = new Set(sortedStepIds);
  const depthByStep = new Map<string, number>();
  const stages: string[][] = [];

  for (const stepId of sortedStepIds) {
    const deps = (adjacency.get(stepId) ?? []).filter((depId) => allowed.has(depId));
    const depth =
      deps.length > 0 ? Math.max(...deps.map((depId) => (depthByStep.get(depId) ?? 0) + 1)) : 0;

    depthByStep.set(stepId, depth);
    stages[depth] ??= [];
    stages[depth].push(stepId);
  }

  return stages.filter((stage) => stage.length > 0);
}
