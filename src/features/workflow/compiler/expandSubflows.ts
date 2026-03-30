import type { ValidationError } from "@/types/pipeline-runtime";
import type { CompilePlanInput } from "@/types/worker-results";
import type {
  ExpandedNodeOrigin,
  RequestRegistry,
  SubflowNodeConfig,
  WorkflowDefinition,
  WorkflowNode,
} from "@/types/workflow";
import { applyInputBindingsToRequest } from "./subflow-bindings";
import {
  invalidOutputWarning,
  isExpandedSubflowEdge,
  missingDefinitionWarning,
  nestedSubflowWarning,
  resolveEntryNodeIds,
  resolveExpandedEntryNodeIds,
  resolveTerminalNodeIds,
  toDefinitionKey,
  toNodeKey,
} from "./subflow-utils";

interface ExpandSubflowsOutput {
  workflow: WorkflowDefinition;
  registry: RequestRegistry;
  aliasRefsByNodeId: Record<string, string[]>;
  originsByNodeId: Record<string, ExpandedNodeOrigin>;
  warnings: ValidationError[];
}

export function expandSubflows(input: CompilePlanInput): ExpandSubflowsOutput {
  const definitionByKey = new Map(
    (input.subflowDefinitions ?? []).map((definition) => [toDefinitionKey(definition), definition]),
  );
  const aliasRefsByNodeId: Record<string, string[]> = {};
  const originsByNodeId: Record<string, ExpandedNodeOrigin> = {};
  const warnings: ValidationError[] = [];
  const expandedRegistry: RequestRegistry = {
    ...input.registry,
    requests: { ...input.registry.requests },
  };
  const expandedNodes: WorkflowNode[] = [];
  const expandedEdges: WorkflowDefinition["edges"] = [];
  const outgoingBySource = new Map<string, WorkflowDefinition["edges"]>();
  const incomingByTarget = new Map<string, WorkflowDefinition["edges"]>();

  input.workflow.edges.forEach((edge) => {
    const outgoing = outgoingBySource.get(edge.source) ?? [];
    outgoing.push(edge);
    outgoingBySource.set(edge.source, outgoing);
    const incoming = incomingByTarget.get(edge.target) ?? [];
    incoming.push(edge);
    incomingByTarget.set(edge.target, incoming);
  });

  for (const node of input.workflow.nodes) {
    if (node.kind !== "subflow") {
      expandedNodes.push({ ...node });
      originsByNodeId[node.id] = { originNodeId: node.id };
      continue;
    }

    const config = node.config as SubflowNodeConfig | undefined;
    const definition = config ? definitionByKey.get(toNodeKey(config)) : undefined;
    if (!config?.subflowId || !definition) {
      warnings.push(missingDefinitionWarning(node.id));
      expandedNodes.push({ ...node });
      originsByNodeId[node.id] = { originNodeId: node.id };
      continue;
    }

    if (definition.workflow.nodes.some((candidate) => candidate.kind === "subflow")) {
      warnings.push(nestedSubflowWarning(node.id, definition));
      expandedNodes.push({ ...node });
      originsByNodeId[node.id] = { originNodeId: node.id };
      continue;
    }

    const nodeIdMap = new Map(
      definition.workflow.nodes.map((internalNode) => [
        internalNode.id,
        `${node.id}::${internalNode.id}`,
      ]),
    );

    definition.workflow.nodes.forEach((internalNode) => {
      const expandedNodeId = nodeIdMap.get(internalNode.id)!;
      expandedNodes.push({
        ...internalNode,
        id: expandedNodeId,
        requestRef: expandedNodeId,
      });
      originsByNodeId[expandedNodeId] = {
        originNodeId: node.id,
        subflowInstanceId: node.id,
        subflowDefinitionId: definition.id,
        subflowDefinitionVersion: definition.version,
        subflowName: definition.name,
        subflowDepth: 1,
        internalNodeId: internalNode.id,
      };

      const request = definition.registry.requests[internalNode.requestRef ?? internalNode.id];
      if (request) {
        expandedRegistry.requests[expandedNodeId] = {
          ...applyInputBindingsToRequest({
            request,
            inputBindings: config.inputBindings,
            inputSchema: definition.inputSchema,
          }),
          id: expandedNodeId,
        };
      }
    });

    definition.workflow.edges.forEach((edge) => {
      expandedEdges.push({
        ...edge,
        id: `${node.id}::${edge.id}`,
        source: nodeIdMap.get(edge.source) ?? edge.source,
        target: nodeIdMap.get(edge.target) ?? edge.target,
      });
    });

    const entryTargets = resolveEntryNodeIds(definition.workflow, nodeIdMap);
    const terminalSources = resolveTerminalNodeIds(definition.workflow, nodeIdMap);

    for (const edge of incomingByTarget.get(node.id) ?? []) {
      entryTargets.forEach((targetId, index) => {
        expandedEdges.push({
          ...edge,
          id: `${edge.id}::subflow-entry:${index}`,
          target: targetId,
        });
      });
    }

    for (const edge of outgoingBySource.get(node.id) ?? []) {
      terminalSources.forEach((sourceId, index) => {
        expandedEdges.push({
          ...edge,
          id: `${edge.id}::subflow-exit:${index}`,
          source: sourceId,
        });
      });
    }

    definition.outputSchema.forEach((output) => {
      const sourceNodeId = nodeIdMap.get(output.path);
      if (!sourceNodeId) {
        warnings.push(invalidOutputWarning(node.id, definition, output.key));
        return;
      }
      const refs = [config.outputAliases[output.key], ...(config.legacyAliasRefs ?? [])].filter(
        Boolean,
      ) as string[];
      if (refs.length > 0) {
        aliasRefsByNodeId[sourceNodeId] = Array.from(
          new Set([...(aliasRefsByNodeId[sourceNodeId] ?? []), ...refs]),
        );
      }
    });
  }

  input.workflow.edges
    .filter((edge) => !isExpandedSubflowEdge(edge, input.workflow.nodes))
    .forEach((edge) => {
      if (!expandedEdges.some((candidate) => candidate.id === edge.id)) {
        expandedEdges.push({ ...edge });
      }
    });

  return {
    workflow: {
      ...input.workflow,
      nodes: expandedNodes,
      edges: expandedEdges.filter(
        (edge) =>
          expandedNodes.some((node) => node.id === edge.source) &&
          expandedNodes.some((node) => node.id === edge.target),
      ),
      entryNodeIds: resolveExpandedEntryNodeIds(input.workflow, expandedNodes, originsByNodeId),
    },
    registry: expandedRegistry,
    aliasRefsByNodeId,
    originsByNodeId,
    warnings,
  };
}
