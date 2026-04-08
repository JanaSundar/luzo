import type { ValidationIssue, ValidationResult } from "../contracts/validation";
import type {
  FlowBlockLike,
  FlowConnectionLike,
  FlowDocumentLike,
} from "../contracts/flow-document";
import { buildAdjacency } from "../graph/build-adjacency";
import { detectCycle } from "../graph/detect-cycle";
import { topoSort } from "../graph/topo-sort";

export function validateFlow<
  TBlock extends FlowBlockLike,
  TConnection extends FlowConnectionLike,
>(params: { document: FlowDocumentLike<TBlock, TConnection> }): ValidationResult {
  const issues: ValidationIssue[] = [];
  const blockIdCounts = countIds(params.document.blocks.map((block) => block.id));
  const connectionIdCounts = countIds(
    params.document.connections.map((connection) => connection.id),
  );

  for (const [id, count] of blockIdCounts) {
    if (count > 1) {
      issues.push({
        code: "duplicate-block-id",
        severity: "error",
        message: `Block "${id}" appears more than once.`,
        blockId: id,
      });
    }
  }

  for (const [id, count] of connectionIdCounts) {
    if (count > 1) {
      issues.push({
        code: "duplicate-connection-id",
        severity: "error",
        message: `Connection "${id}" appears more than once.`,
        connectionId: id,
      });
    }
  }

  const startBlocks = params.document.blocks.filter((block) => block.type === "start");
  if (startBlocks.length === 0) {
    issues.push({
      code: "missing-start-block",
      severity: "warning",
      message: "Flow has no start block.",
    });
  }

  if (startBlocks.length > 1) {
    issues.push({
      code: "multiple-start-blocks",
      severity: "error",
      message: "Flow has more than one start block.",
    });
  }

  const forward = buildAdjacency({ document: params.document });
  const reverseIncoming = new Map<string, number>();
  for (const connection of params.document.connections) {
    if (!forward.blockById.has(connection.sourceBlockId)) {
      issues.push({
        code: "missing-source-block",
        severity: "error",
        message: `Connection "${connection.id}" points to a missing source block.`,
        connectionId: connection.id,
      });
    }
    if (!forward.blockById.has(connection.targetBlockId)) {
      issues.push({
        code: "missing-target-block",
        severity: "error",
        message: `Connection "${connection.id}" points to a missing target block.`,
        connectionId: connection.id,
      });
    }
    reverseIncoming.set(
      connection.targetBlockId,
      (reverseIncoming.get(connection.targetBlockId) ?? 0) + 1,
    );
  }

  for (const startBlock of startBlocks) {
    if ((reverseIncoming.get(startBlock.id) ?? 0) > 0) {
      issues.push({
        code: "start-has-incoming-edge",
        severity: "error",
        message: `Start block "${startBlock.id}" cannot have incoming connections.`,
        blockId: startBlock.id,
      });
    }
  }

  const nodeIds = params.document.blocks.map((block) => block.id);
  const cycle = detectCycle({ nodeIds, adjacencyOut: forward.adjacencyOut });
  const topo = topoSort({
    nodeIds,
    indegreeByNode: forward.indegreeByNode,
    getNeighbors: (id) => (forward.adjacencyOut.get(id) ?? []).map((edge) => edge.targetNodeId),
  });

  if (cycle.hasCycle) {
    issues.push({
      code: "cycle-detected",
      severity: "error",
      message: `Cycle detected: ${(cycle.cyclePath ?? []).join(" -> ")}`,
    });
  }

  const reachable = new Set<string>();
  const queue = startBlocks.map((block) => block.id);
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const edge of forward.adjacencyOut.get(nodeId) ?? []) queue.push(edge.targetNodeId);
  }

  for (const block of params.document.blocks) {
    if (block.type !== "start" && startBlocks.length > 0 && !reachable.has(block.id)) {
      issues.push({
        code: "unreachable-block",
        severity: "warning",
        message: `Block "${block.id}" is unreachable from the start block.`,
        blockId: block.id,
      });
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
    derived: { topoOrder: topo.order },
  };
}

function countIds(ids: readonly string[]) {
  return ids.reduce((counts, id) => {
    counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}
