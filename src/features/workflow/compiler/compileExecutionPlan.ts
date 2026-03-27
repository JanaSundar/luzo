import type { StepAlias } from "@/types/pipeline-runtime";
import type { CompilePlanInput, CompilePlanOutput } from "@/types/worker-results";
import type { ExecutionPlan, ExecutionPlanNode } from "@/types/workflow";
import { validateWorkflowDag } from "../validation/validateWorkflowDag";

export function compileExecutionPlan(input: CompilePlanInput): CompilePlanOutput {
  const validation = validateWorkflowDag(input.workflow);
  const warnings = [...validation.errors];
  const nodeMap = new Map(input.workflow.nodes.map((node) => [node.id, node]));
  const outgoingByNode = groupOutgoingEdges(input.workflow.edges);
  const aliases = buildAliases(input.workflow.nodes.map((node) => node.id));

  for (const node of input.workflow.nodes) {
    if (
      node.kind === "request" &&
      (!node.requestRef || !input.registry.requests[node.requestRef])
    ) {
      warnings.push({
        stepId: node.id,
        field: "requestRef",
        message: `Request node "${node.id}" is missing a valid request reference`,
        severity: "error",
      });
    }

    if (node.kind === "request") {
      const outgoing = outgoingByNode.get(node.id) ?? [];
      const successEdges = outgoing.filter((edge) => edge.semantics === "success");
      const failureEdges = outgoing.filter((edge) => edge.semantics === "failure");

      if (successEdges.length > 1) {
        warnings.push({
          stepId: node.id,
          field: "success",
          message: `Request node "${node.id}" has multiple success branches`,
          severity: "error",
        });
      }

      if (failureEdges.length > 1) {
        warnings.push({
          stepId: node.id,
          field: "failure",
          message: `Request node "${node.id}" has multiple failure branches`,
          severity: "error",
        });
      }
    }
  }

  const stageByNodeId = new Map<string, number>();
  validation.stages.forEach((stage, index) => {
    for (const nodeId of stage) stageByNodeId.set(nodeId, index);
  });

  const nodes: ExecutionPlanNode[] = validation.order.map((nodeId) => {
    const workflowNode = nodeMap.get(nodeId);
    const outgoing = outgoingByNode.get(nodeId) ?? [];
    const downstreamIds = outgoing.map((edge) => edge.target);
    return {
      nodeId,
      kind: workflowNode?.kind ?? "request",
      stageIndex: stageByNodeId.get(nodeId) ?? 0,
      dependencyIds: validation.adjacency[nodeId] ?? [],
      downstreamIds,
      requestRef: workflowNode?.requestRef,
      routes: {
        control: outgoing.filter((edge) => edge.semantics === "control").map((edge) => edge.target),
        success: outgoing.filter((edge) => edge.semantics === "success").map((edge) => edge.target),
        failure: outgoing.filter((edge) => edge.semantics === "failure").map((edge) => edge.target),
      },
      branch: inferBranch(workflowNode?.kind, outgoing),
    };
  });

  const plan: ExecutionPlan = {
    kind: "execution-plan",
    version: 1,
    workflowId: input.workflow.id,
    nodes,
    stages: validation.stages.map((nodeIds, stageIndex) => ({ stageIndex, nodeIds })),
    order: validation.order,
    adjacency: validation.adjacency,
    reverseAdjacency: validation.reverseAdjacency,
  };

  return { plan, aliases, warnings };
}

function buildAliases(nodeIds: string[]): StepAlias[] {
  return nodeIds.map((stepId, index) => ({
    stepId,
    alias: `req${index + 1}`,
    index,
    refs: [`req${index + 1}`, stepId],
  }));
}

function inferBranch(
  kind: ExecutionPlanNode["kind"] | undefined,
  outgoing: Array<{ semantics: string }>,
) {
  if (kind === "condition" && outgoing.length >= 2) {
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

function groupOutgoingEdges(edges: CompilePlanInput["workflow"]["edges"]) {
  const grouped = new Map<string, typeof edges>();
  for (const edge of edges) {
    const current = grouped.get(edge.source) ?? [];
    current.push(edge);
    grouped.set(edge.source, current);
  }
  return grouped;
}
