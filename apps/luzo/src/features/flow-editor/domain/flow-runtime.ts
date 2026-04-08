import type { PipelineStep } from "@/types";
import { kahnTopoSort } from "@/lib/pipeline/topo-sort";

import {
  buildIncomingExecutableDependencies,
  compileExecutableBlock,
  isExecutableBlock,
} from "./ai-step";
import type { AIBlock, FlowDocument, RequestBlock } from "./types";

export function compileFlowDocumentToPipelineSteps(flow: FlowDocument): PipelineStep[] {
  const executableBlocks = flow.blocks.filter(isExecutableBlock);
  const executableIds = new Set(executableBlocks.map((block) => block.id));
  const incomingByTarget = buildIncomingExecutableDependencies(flow, executableIds);
  const sorted = topologicalSort(executableBlocks, incomingByTarget);
  return sorted.map((block) => compileExecutableBlock(block, incomingByTarget));
}

function topologicalSort(
  blocks: Array<RequestBlock | AIBlock>,
  incomingByTarget: Map<string, string[]>,
) {
  const blockMap = new Map(blocks.map((block) => [block.id, block] as const));

  const adjacency = new Map<string, string[]>();
  const indegree = new Map(
    blocks.map((block) => [block.id, incomingByTarget.get(block.id)?.length ?? 0] as const),
  );
  for (const [target, incoming] of incomingByTarget) {
    for (const source of incoming) {
      const targets = adjacency.get(source);
      if (targets) targets.push(target);
      else adjacency.set(source, [target]);
    }
  }

  const positionCompare = (a: string, b: string) => {
    const ba = blockMap.get(a);
    const bb = blockMap.get(b);
    if (!ba || !bb) return 0;
    return ba.position.x - bb.position.x || ba.position.y - bb.position.y;
  };

  const sortedIds = kahnTopoSort(
    blocks.map((block) => block.id),
    indegree,
    (id) => adjacency.get(id) ?? [],
    positionCompare,
  );

  return sortedIds.flatMap((id) => {
    const block = blockMap.get(id);
    return block ? [block] : [];
  });
}
