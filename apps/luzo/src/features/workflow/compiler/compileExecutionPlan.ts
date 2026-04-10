import type { CompilePlanInput, CompilePlanOutput } from "@/types/worker-results";
import type { CompiledPipelinePlan, CompiledPipelineNode } from "@/types/workflow";
import { buildAliasesFromWorkflowNodes } from "@/features/pipeline/step-aliases";
import { createCompiledPlanNode, groupOutgoingEdges } from "./compileExecutionPlanNodes";
import { validateWorkflowDag } from "../validation/validateWorkflowDag";

export function compileExecutionPlan(input: CompilePlanInput): CompilePlanOutput {
  const expanded = {
    workflow: input.workflow,
    registry: input.registry,
    warnings: [] as CompilePlanOutput["warnings"],
    aliasRefsByNodeId: {} as Record<string, string[]>,
    originsByNodeId: {} as Record<string, never>,
  };
  const validation = validateWorkflowDag(expanded.workflow);
  const warnings = [...expanded.warnings, ...validation.errors];
  const nodeMap = new Map(expanded.workflow.nodes.map((node) => [node.id, node]));
  const outgoingByNode = groupOutgoingEdges(expanded.workflow.edges);
  const orderedNodes = validation.order
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
  const aliases = buildAliasesFromWorkflowNodes(orderedNodes, expanded.registry);
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

    if (node.kind === "switch") {
      const config = node.config?.kind === "switch" ? node.config : null;
      const outgoing = outgoingByNode.get(node.id) ?? [];
      const caseEdges = outgoing.filter((edge) => edge.semantics !== "control");

      if (!config || (config.cases ?? []).length === 0) {
        warnings.push({
          stepId: node.id,
          field: "cases",
          message: `Switch node "${node.id}" has no cases defined`,
          severity: "error",
        });
      }

      if (caseEdges.length === 0) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Switch node "${node.id}" has no outgoing case edges`,
          severity: "error",
        });
      }

      if (expanded.workflow.entryNodeIds.includes(node.id)) {
        warnings.push({
          stepId: node.id,
          field: "routing",
          message: `Switch node "${node.id}" cannot be an entry node`,
          severity: "error",
        });
      }
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
    return createCompiledPlanNode({
      nodeId,
      orderIndex,
      outgoing: outgoingByNode.get(nodeId) ?? [],
      stageIndex: stageByNodeId.get(nodeId) ?? 0,
      workflowNode: nodeMap.get(nodeId),
      dependencyIds: validation.adjacency[nodeId] ?? [],
      entry: entryNodeIds.includes(nodeId),
    });
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
  };
}
