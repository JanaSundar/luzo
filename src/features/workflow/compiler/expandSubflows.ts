import type { ValidationError } from "@/types/pipeline-runtime";
import type { CompilePlanInput } from "@/types/worker-results";
import type {
  ExpandedNodeOrigin,
  RequestDefinition,
  RequestRegistry,
  SubflowDefinition,
  SubflowNodeConfig,
  WorkflowDefinition,
  WorkflowNode,
} from "@/types/workflow";

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

    const nonRequestNode = definition.workflow.nodes.find(
      (candidate) => candidate.kind !== "request",
    );
    if (nonRequestNode) {
      warnings.push(unsupportedInternalNodeWarning(node.id, definition, nonRequestNode.kind));
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

function applyInputBindingsToRequest({
  request,
  inputBindings,
  inputSchema,
}: {
  request: RequestDefinition;
  inputBindings: Record<string, string>;
  inputSchema: SubflowDefinition["inputSchema"];
}) {
  const valueByKey = Object.fromEntries(
    inputSchema.map((input) => [input.key, inputBindings[input.key] ?? input.defaultValue ?? ""]),
  );
  const replace = (value: string) =>
    value.replace(/{{\s*input\.([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => valueByKey[key] ?? "");
  const clone = cloneRequestDefinition(request);

  clone.url = replace(clone.url);
  clone.body = clone.body ? replace(clone.body) : clone.body;
  clone.headers = clone.headers.map((header) => ({
    ...header,
    key: replace(header.key),
    value: replace(header.value),
  }));
  clone.params = clone.params.map((param) => ({
    ...param,
    key: replace(param.key),
    value: replace(param.value),
  }));
  if (clone.auth.type === "bearer" && clone.auth.bearer) {
    clone.auth = { ...clone.auth, bearer: { token: replace(clone.auth.bearer.token) } };
  }
  if (clone.auth.type === "basic" && clone.auth.basic) {
    clone.auth = {
      ...clone.auth,
      basic: {
        username: replace(clone.auth.basic.username),
        password: replace(clone.auth.basic.password),
      },
    };
  }
  if (clone.auth.type === "api-key" && clone.auth.apiKey) {
    clone.auth = {
      ...clone.auth,
      apiKey: {
        ...clone.auth.apiKey,
        key: replace(clone.auth.apiKey.key),
        value: replace(clone.auth.apiKey.value),
      },
    };
  }

  return clone;
}

function cloneRequestDefinition(request: RequestDefinition): RequestDefinition {
  return {
    ...request,
    headers: request.headers.map((header) => ({ ...header })),
    params: request.params.map((param) => ({ ...param })),
    formDataFields:
      request.formDataFields?.map(({ file: _file, ...field }) => ({ ...field })) ?? [],
    auth: cloneAuthConfig(request.auth),
    preRequestRules: request.preRequestRules?.map((rule) => ({ ...rule })) ?? [],
    postRequestRules: request.postRequestRules?.map((rule) => ({ ...rule })) ?? [],
    testRules: request.testRules?.map((rule) => ({ ...rule })) ?? [],
    pollingPolicy: request.pollingPolicy
      ? {
          ...request.pollingPolicy,
          successRules: request.pollingPolicy.successRules.map((rule) => ({ ...rule })),
          failureRules: request.pollingPolicy.failureRules?.map((rule) => ({ ...rule })) ?? [],
        }
      : undefined,
    webhookWaitPolicy: request.webhookWaitPolicy ? { ...request.webhookWaitPolicy } : undefined,
  };
}

function cloneAuthConfig(auth: RequestDefinition["auth"]): RequestDefinition["auth"] {
  if (auth.type === "bearer" && auth.bearer) return { ...auth, bearer: { ...auth.bearer } };
  if (auth.type === "basic" && auth.basic) return { ...auth, basic: { ...auth.basic } };
  if (auth.type === "api-key" && auth.apiKey) return { ...auth, apiKey: { ...auth.apiKey } };
  if (auth.type === "oauth2" && auth.oauth2) return { ...auth, oauth2: { ...auth.oauth2 } };
  if (auth.type === "aws-sigv4" && auth.awsSigv4) {
    return { ...auth, awsSigv4: { ...auth.awsSigv4 } };
  }
  return { ...auth };
}

function resolveEntryNodeIds(workflow: WorkflowDefinition, nodeIdMap: Map<string, string>) {
  const entryNodeIds =
    workflow.entryNodeIds.length > 0
      ? workflow.entryNodeIds
      : workflow.nodes
          .filter((node) => !workflow.edges.some((edge) => edge.target === node.id))
          .map((node) => node.id);
  return entryNodeIds.map((entryNodeId) => nodeIdMap.get(entryNodeId) ?? entryNodeId);
}

function resolveTerminalNodeIds(workflow: WorkflowDefinition, nodeIdMap: Map<string, string>) {
  return workflow.nodes
    .filter((node) => !workflow.edges.some((edge) => edge.source === node.id))
    .map((node) => nodeIdMap.get(node.id) ?? node.id);
}

function resolveExpandedEntryNodeIds(
  workflow: WorkflowDefinition,
  expandedNodes: WorkflowNode[],
  originsByNodeId: Record<string, ExpandedNodeOrigin>,
) {
  const originalEntry = new Set(workflow.entryNodeIds);
  return expandedNodes
    .filter((node) => {
      const origin = originsByNodeId[node.id];
      return (
        originalEntry.has(node.id) ||
        (origin?.originNodeId ? originalEntry.has(origin.originNodeId) : false)
      );
    })
    .map((node) => node.id);
}

function isExpandedSubflowEdge(edge: WorkflowDefinition["edges"][number], nodes: WorkflowNode[]) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  return source?.kind === "subflow" || target?.kind === "subflow";
}

function toDefinitionKey(definition: SubflowDefinition) {
  return `${definition.id}:${definition.version}`;
}

function toNodeKey(config: SubflowNodeConfig) {
  return `${config.subflowId}:${config.subflowVersion}`;
}

function missingDefinitionWarning(stepId: string): ValidationError {
  return {
    stepId,
    field: "subflow",
    message: `Subflow node "${stepId}" is missing a pinned subflow definition`,
    severity: "error",
  };
}

function nestedSubflowWarning(stepId: string, definition: SubflowDefinition): ValidationError {
  return {
    stepId,
    field: "subflow",
    message: `Subflow "${definition.name}" contains nested subflows, which are not supported yet`,
    severity: "error",
  };
}

function unsupportedInternalNodeWarning(
  stepId: string,
  definition: SubflowDefinition,
  kind: WorkflowNode["kind"],
): ValidationError {
  return {
    stepId,
    field: "subflow",
    message: `Subflow "${definition.name}" contains unsupported "${kind}" nodes in v1`,
    severity: "error",
  };
}

function invalidOutputWarning(
  stepId: string,
  definition: SubflowDefinition,
  key: string,
): ValidationError {
  return {
    stepId,
    field: "subflow.output",
    message: `Subflow "${definition.name}" output "${key}" does not resolve to an internal request`,
    severity: "error",
  };
}
