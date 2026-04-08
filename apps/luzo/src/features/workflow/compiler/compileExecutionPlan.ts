import type { CompilePlanInput, CompilePlanOutput } from "@/types/worker-results";
import type { CompiledPipelinePlan, CompiledPipelineNode, RuntimeRoute } from "@/types/workflow";
import { buildAliasesFromNodeIds } from "@/features/pipeline/step-aliases";
import { validateWorkflowDag } from "../validation/validateWorkflowDag";
import { expandSubflows } from "./expandSubflows";

export function compileExecutionPlan(input: CompilePlanInput): CompilePlanOutput {
  const expanded = expandSubflows(input);
  const validation = validateWorkflowDag(expanded.workflow);
  const warnings = [...expanded.warnings, ...validation.errors];
  const nodeMap = new Map(expanded.workflow.nodes.map((node) => [node.id, node]));
  const outgoingByNode = groupOutgoingEdges(expanded.workflow.edges);
  const aliases = buildAliasesFromNodeIds(validation.order);
  const aliasesWithExports = aliases.map((alias) => ({
    ...alias,
    refs: Array.from(new Set([...(expanded.aliasRefsByNodeId[alias.stepId] ?? []), ...alias.refs])),
  }));

  for (const node of expanded.workflow.nodes) {
    if (
      node.kind === "request" &&
      (!node.requestRef || !expanded.registry.requests[node.requestRef])
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
      const controlEdges = outgoing.filter((edge) => edge.semantics === "control");
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

      if (controlEdges.length > 0 && (successEdges.length > 0 || failureEdges.length > 0)) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Request node "${node.id}" mixes control edges with explicit success/failure routes`,
          severity: "error",
        });
      }

      const trueEdges = outgoing.filter((edge) => edge.semantics === "true");
      const falseEdges = outgoing.filter((edge) => edge.semantics === "false");
      if (trueEdges.length > 0 || falseEdges.length > 0) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Request node "${node.id}" cannot use true/false edges — use a condition node instead`,
          severity: "error",
        });
      }
    }

    if (node.kind === "condition") {
      const outgoing = outgoingByNode.get(node.id) ?? [];
      const trueEdges = outgoing.filter((edge) => edge.semantics === "true");
      const falseEdges = outgoing.filter((edge) => edge.semantics === "false");
      const hasBranchEdge = trueEdges.length > 0 || falseEdges.length > 0;
      const config = node.config?.kind === "condition" ? node.config : null;

      if (!hasBranchEdge) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Condition node "${node.id}" has no true or false edges`,
          severity: "error",
        });
      }

      if (trueEdges.length > 1) {
        warnings.push({
          stepId: node.id,
          field: "true",
          message: `Condition node "${node.id}" has multiple true branches`,
          severity: "error",
        });
      }

      if (falseEdges.length > 1) {
        warnings.push({
          stepId: node.id,
          field: "false",
          message: `Condition node "${node.id}" has multiple false branches`,
          severity: "error",
        });
      }

      if (config && (config.rules?.length ?? 0) === 0 && !config.expression) {
        warnings.push({
          stepId: node.id,
          field: "expression",
          message: `Condition node "${node.id}" has no rules and no expression`,
          severity: "error",
        });
      }

      if (hasBranchEdge && expanded.workflow.entryNodeIds.includes(node.id)) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Condition node "${node.id}" cannot be an entry node`,
          severity: "error",
        });
      }
    }

    if (node.kind === "subflow") {
      warnings.push({
        stepId: node.id,
        field: "subflow",
        message: `Subflow node "${node.id}" must be expanded before execution`,
        severity: "error",
      });
    }
  }

  const stageByNodeId = new Map<string, number>();
  validation.stages.forEach((stage, index) => {
    for (const nodeId of stage) stageByNodeId.set(nodeId, index);
  });
  const entryNodeIds = validation.order.filter(
    (nodeId) => (validation.adjacency[nodeId]?.length ?? 0) === 0,
  );

  const nodes: CompiledPipelineNode[] = validation.order.map((nodeId, orderIndex) => {
    const workflowNode = nodeMap.get(nodeId);
    const outgoing = outgoingByNode.get(nodeId) ?? [];
    const runtimeRoutes: RuntimeRoute[] = outgoing.map((edge) => ({
      semantics: edge.semantics,
      targetId: edge.target,
    }));
    const downstreamIds = runtimeRoutes.map((route) => route.targetId);
    const routeTargets = {
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
    };
    return {
      nodeId,
      kind: workflowNode?.kind ?? "request",
      orderIndex,
      stageIndex: stageByNodeId.get(nodeId) ?? 0,
      dependencyIds: validation.adjacency[nodeId] ?? [],
      activationIds: validation.adjacency[nodeId] ?? [],
      downstreamIds,
      entry: entryNodeIds.includes(nodeId),
      requestRef: workflowNode?.requestRef,
      conditionConfig:
        workflowNode?.kind === "condition" && workflowNode.config?.kind === "condition"
          ? workflowNode.config
          : undefined,
      routes: routeTargets,
      runtimeRoutes,
      branch: inferBranch(workflowNode?.kind, outgoing),
      origin: expanded.originsByNodeId[nodeId],
    };
  });

  const plan: CompiledPipelinePlan = {
    kind: "compiled-pipeline-plan",
    version: 1,
    workflowId: input.workflow.id,
    entryNodeIds,
    aliases: aliasesWithExports,
    nodes,
    stages: validation.stages.map((nodeIds, stageIndex) => ({ stageIndex, nodeIds })),
    order: validation.order,
    adjacency: validation.adjacency,
    reverseAdjacency: validation.reverseAdjacency,
  };

  return {
    plan,
    aliases: aliasesWithExports,
    warnings,
    expandedWorkflow: expanded.workflow,
    expandedRegistry: expanded.registry,
    expandedOrigins: expanded.originsByNodeId,
  };
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

function groupOutgoingEdges(edges: CompilePlanInput["workflow"]["edges"]) {
  const grouped = new Map<string, typeof edges>();
  for (const edge of edges) {
    const current = grouped.get(edge.source) ?? [];
    current.push(edge);
    grouped.set(edge.source, current);
  }
  return grouped;
}
