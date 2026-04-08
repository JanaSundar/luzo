import type { WorkflowDefinition } from "@/types/workflow";

export function findUnreachableNodes(
  workflow: WorkflowDefinition,
  reverseAdjacency: Record<string, string[]>,
): string[] {
  const entryNodeIds =
    workflow.entryNodeIds.length > 0
      ? workflow.entryNodeIds
      : workflow.nodes.filter((node) => node.kind === "start").map((node) => node.id);
  const visited = new Set<string>();
  const queue = [...entryNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const nextId of reverseAdjacency[nodeId] ?? []) {
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }

  return workflow.nodes.map((node) => node.id).filter((nodeId) => !visited.has(nodeId));
}
