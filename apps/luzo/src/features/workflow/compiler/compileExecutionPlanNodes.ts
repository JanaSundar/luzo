import type { CompilePlanInput } from "@/types/worker-results";
import type { CompiledPipelineNode, RuntimeRoute } from "@/types/workflow";

export function createCompiledPlanNode(params: {
  nodeId: string;
  orderIndex: number;
  outgoing: CompilePlanInput["workflow"]["edges"];
  stageIndex: number;
  workflowNode?: CompilePlanInput["workflow"]["nodes"][number];
  dependencyIds: string[];
  entry: boolean;
}) {
  const { dependencyIds, entry, nodeId, orderIndex, outgoing, stageIndex, workflowNode } = params;
  const runtimeRoutes: RuntimeRoute[] = outgoing.map((edge) => ({
    semantics: edge.semantics,
    targetId: edge.target,
  }));

  return {
    nodeId,
    kind: workflowNode?.kind ?? "request",
    orderIndex,
    stageIndex,
    dependencyIds,
    activationIds: dependencyIds,
    downstreamIds: runtimeRoutes.map((route) => route.targetId),
    entry,
    requestRef: workflowNode?.requestRef,
    conditionConfig:
      workflowNode?.kind === "condition" && workflowNode.config?.kind === "condition"
        ? workflowNode.config
        : undefined,
    delayConfig:
      workflowNode?.kind === "delay" && workflowNode.config?.kind === "delay"
        ? workflowNode.config
        : undefined,
    forEachConfig:
      workflowNode?.kind === "forEach" && workflowNode.config?.kind === "forEach"
        ? workflowNode.config
        : undefined,
    transformConfig:
      workflowNode?.kind === "transform" && workflowNode.config?.kind === "transform"
        ? workflowNode.config
        : undefined,
    logConfig:
      workflowNode?.kind === "log" && workflowNode.config?.kind === "log"
        ? workflowNode.config
        : undefined,
    assertConfig:
      workflowNode?.kind === "assert" && workflowNode.config?.kind === "assert"
        ? workflowNode.config
        : undefined,
    webhookWaitConfig:
      workflowNode?.kind === "webhookWait" && workflowNode.config?.kind === "webhookWait"
        ? workflowNode.config
        : undefined,
    pollConfig:
      workflowNode?.kind === "poll" && workflowNode.config?.kind === "poll"
        ? workflowNode.config
        : undefined,
    switchConfig:
      workflowNode?.kind === "switch" && workflowNode.config?.kind === "switch"
        ? workflowNode.config
        : undefined,
    routes: {
      control: runtimeRoutes
        .filter((route) => route.semantics === "control")
        .map((route) => route.targetId),
      success: runtimeRoutes
        .filter((route) => route.semantics === "success")
        .map((route) => route.targetId),
      failure: runtimeRoutes
        .filter((route) => route.semantics === "failure")
        .map((route) => route.targetId),
      true: runtimeRoutes
        .filter((route) => route.semantics === "true")
        .map((route) => route.targetId),
      false: runtimeRoutes
        .filter((route) => route.semantics === "false")
        .map((route) => route.targetId),
    },
    runtimeRoutes,
    branch: inferBranch(workflowNode?.kind, outgoing),
  } satisfies CompiledPipelineNode;
}

export function groupOutgoingEdges(edges: CompilePlanInput["workflow"]["edges"]) {
  const grouped = new Map<string, typeof edges>();
  for (const edge of edges) {
    const current = grouped.get(edge.source) ?? [];
    current.push(edge);
    grouped.set(edge.source, current);
  }
  return grouped;
}

function inferBranch(
  kind: CompiledPipelineNode["kind"] | undefined,
  outgoing: Array<{ semantics: string }>,
) {
  if (kind === "condition") {
    const hasTrue = outgoing.some((edge) => edge.semantics === "true");
    const hasFalse = outgoing.some((edge) => edge.semantics === "false");
    if (hasTrue && hasFalse) return { mode: "all" as const };
    if (hasTrue) return { mode: "true" as const };
    if (hasFalse) return { mode: "false" as const };
    return { mode: "all" as const };
  }
  if (kind === "request" && outgoing.some((edge) => edge.semantics === "failure")) {
    return { mode: "failure" as const };
  }
  if (kind === "request" && outgoing.some((edge) => edge.semantics === "success")) {
    return { mode: "success" as const };
  }
  return undefined;
}
