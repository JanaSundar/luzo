import type { CompiledPipelineNode } from "@/types/workflow";

export function markSkippedSubgraph(
  startNodeId: string,
  planNodeMap: Map<string, CompiledPipelineNode>,
  completed: Set<string>,
  skipped: Set<string>,
  readyQueue: string[],
  queued: Set<string>,
) {
  const stack = [startNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || completed.has(nodeId) || skipped.has(nodeId)) continue;

    const node = planNodeMap.get(nodeId);
    if (!node) continue;

    const canSkip =
      nodeId === startNodeId ||
      node.dependencyIds.every((dependencyId) => skipped.has(dependencyId));
    if (!canSkip) continue;

    skipped.add(nodeId);
    completed.add(nodeId);

    const queueIndex = readyQueue.indexOf(nodeId);
    if (queueIndex >= 0) readyQueue.splice(queueIndex, 1);
    queued.delete(nodeId);

    node.downstreamIds.forEach((downstreamId) => {
      if (!completed.has(downstreamId) && !skipped.has(downstreamId)) {
        stack.push(downstreamId);
      }
    });
  }
}
