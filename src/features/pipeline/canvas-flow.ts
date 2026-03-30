import type { ApiRequest, AuthConfig, Pipeline, PipelineStep } from "@/types";
import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { buildAliasesFromSteps } from "@/features/pipeline/step-aliases";
import type {
  FlowDocument,
  FlowEdgeRecord,
  FlowNodeConfig,
  FlowNodeRecord,
  WorkflowNodeKind,
} from "@/types/workflow";

const REQUEST_NODE_X = 320;
const REQUEST_NODE_GAP = 280;

export const DEFAULT_REQUEST_AUTH: AuthConfig = { type: "none" };

export function createEmptyRequestStep(name = "New Request"): PipelineStep {
  return {
    id: crypto.randomUUID(),
    name,
    method: "GET",
    url: "",
    headers: [],
    params: [],
    body: null,
    bodyType: "none",
    auth: DEFAULT_REQUEST_AUTH,
    requestSource: { mode: "new" },
  };
}

export function createDefaultNodeConfig(kind: WorkflowNodeKind): FlowNodeConfig {
  switch (kind) {
    case "start":
      return { kind, label: "Start" };
    case "condition":
      return { kind, label: "Condition", expression: "" };
    case "delay":
      return { kind, label: "Delay", durationMs: 1000 };
    case "transform":
      return { kind, label: "Transform", script: "" };
    case "subflow":
      return {
        kind,
        label: "Subflow",
        subflowId: "",
        subflowVersion: 1,
        inputBindings: {},
        outputAliases: {},
      };
    case "end":
      return { kind, label: "End" };
    case "request":
    default:
      return { kind: "request" };
  }
}

export function createFlowNodeRecord(
  kind: WorkflowNodeKind,
  position: { x: number; y: number },
  overrides: Partial<FlowNodeRecord> = {},
): FlowNodeRecord {
  const id = overrides.id ?? crypto.randomUUID();
  const requestRef =
    kind === "request" ? (overrides.requestRef ?? overrides.dataRef ?? id) : undefined;

  return {
    id,
    kind,
    position,
    size: overrides.size,
    dataRef: kind === "request" ? requestRef : overrides.dataRef,
    requestRef,
    config: overrides.config ?? createDefaultNodeConfig(kind),
  };
}

export function ensurePipelineFlowDocument(pipeline: Pipeline): FlowDocument {
  const existing = pipeline.flowDocument;
  const requestNodeMap = new Map(
    (existing?.nodes ?? [])
      .filter((node) => node.kind === "request")
      .map((node) => [node.requestRef ?? node.dataRef ?? node.id, node]),
  );
  const passthroughNodes = (existing?.nodes ?? []).filter((node) => node.kind !== "request");

  const requestNodes = pipeline.steps.map((step, index) => {
    const existingNode = requestNodeMap.get(step.id);
    return createFlowNodeRecord(
      "request",
      existingNode?.position ?? { x: REQUEST_NODE_X + index * REQUEST_NODE_GAP, y: 0 },
      {
        ...existingNode,
        id: existingNode?.id ?? step.id,
        dataRef: step.id,
        requestRef: step.id,
        config: {
          kind: "request",
          label: step.name,
        },
      },
    );
  });

  const allNonRequestNodes = passthroughNodes.map((node) => ({
    ...node,
    config: node.config ?? createDefaultNodeConfig(node.kind),
  }));
  const startNode =
    allNonRequestNodes.find((node) => node.kind === "start") ??
    createFlowNodeRecord("start", inferStartPosition(requestNodes), {
      id: `${pipeline.id}:start`,
      config: { kind: "start", label: "Start" },
    });

  const otherNodes = allNonRequestNodes.filter((node) => node.id !== startNode.id);
  const orderedNonStartNodes = orderNodesLikeExisting(
    existing?.nodes ?? [],
    requestNodes,
    otherNodes,
  );
  const nodeIds = new Set([
    startNode.id,
    ...requestNodes.map((node) => node.id),
    ...otherNodes.map((node) => node.id),
  ]);
  const requestIdToNodeId = new Map(
    requestNodes.map((node) => [node.requestRef ?? node.dataRef ?? node.id, node.id]),
  );

  const existingEdges = (existing?.edges ?? [])
    .map((edge) => {
      const sourceId = nodeIds.has(edge.source) ? edge.source : requestIdToNodeId.get(edge.source);
      const targetId = nodeIds.has(edge.target) ? edge.target : requestIdToNodeId.get(edge.target);
      if (sourceId && targetId) {
        return { ...edge, source: sourceId, target: targetId };
      }
      return null;
    })
    .filter((edge): edge is FlowEdgeRecord => edge !== null);

  const hasSubflows = passthroughNodes.some((node) => node.kind === "subflow");

  const derivedImplicitEdges = buildRequestDependencyEdges(pipeline.steps, {
    includePositionalAliases: !hasSubflows,
  })
    .map((edge) => {
      const sourceId = requestIdToNodeId.get(edge.source);
      const targetId = requestIdToNodeId.get(edge.target);
      if (sourceId && targetId) {
        return { ...edge, source: sourceId, target: targetId };
      }
      return null;
    })
    .filter((edge): edge is FlowEdgeRecord => edge !== null);

  const allBaseEdges = dedupeEdges([...existingEdges, ...derivedImplicitEdges]);
  const executableNodeIds = orderedNonStartNodes
    .filter((node) => node.kind !== "start")
    .map((node) => node.id);

  const edges = withStartConnections(allBaseEdges, startNode.id, executableNodeIds);

  return {
    kind: "flow-document",
    version: 1,
    id: pipeline.id,
    name: pipeline.name,
    createdAt: existing?.createdAt ?? pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    viewport: existing?.viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes: [startNode, ...orderedNonStartNodes],
    edges,
  };
}

export function getPipelineExecutionSupport(pipeline: Pipeline) {
  const flow = ensurePipelineFlowDocument(pipeline);
  const unsupportedKinds = Array.from(
    new Set(
      flow.nodes
        .filter((node) => !["start", "request", "subflow"].includes(node.kind))
        .map((node) => node.kind),
    ),
  );

  if (unsupportedKinds.length > 0) {
    return {
      supported: false,
      reason: `Execution is available for request and subflow pipelines right now. Remove ${unsupportedKinds.join(", ")} node${unsupportedKinds.length === 1 ? "" : "s"} to run or debug.`,
      unsupportedKinds,
    };
  }

  const executableNodes = flow.nodes.filter(
    (node) => node.kind === "request" || node.kind === "subflow",
  );
  if (executableNodes.length === 0) {
    return {
      supported: false,
      reason: "Add at least one request or subflow node before running this pipeline.",
      unsupportedKinds: [],
    };
  }

  return {
    supported: true,
    reason: null,
    unsupportedKinds: [],
  };
}

function orderNodesLikeExisting(
  existingNodes: FlowNodeRecord[],
  requestNodes: FlowNodeRecord[],
  otherNodes: FlowNodeRecord[],
) {
  const requestById = new Map(requestNodes.map((node) => [node.id, node]));
  const otherById = new Map(otherNodes.map((node) => [node.id, node]));
  const ordered: FlowNodeRecord[] = [];
  const seen = new Set<string>();

  existingNodes.forEach((node) => {
    if (node.kind === "start") return;
    const next = requestById.get(node.id) ?? otherById.get(node.id);
    if (!next || seen.has(next.id)) return;
    ordered.push(next);
    seen.add(next.id);
  });

  [...requestNodes, ...otherNodes].forEach((node) => {
    if (node.kind === "start" || seen.has(node.id)) return;
    ordered.push(node);
    seen.add(node.id);
  });

  return ordered;
}

export function requestStepToApiRequest(step: PipelineStep): ApiRequest {
  return {
    method: step.method,
    url: step.url,
    headers: step.headers,
    params: step.params,
    body: step.body,
    bodyType: step.bodyType,
    formDataFields: step.formDataFields,
    auth: step.auth,
    preRequestEditorType: step.preRequestEditorType,
    testEditorType: step.testEditorType,
    preRequestRules: step.preRequestRules,
    testRules: step.testRules,
    preRequestScript: step.preRequestScript,
    testScript: step.testScript,
    pollingPolicy: step.pollingPolicy,
    webhookWaitPolicy: step.webhookWaitPolicy,
  };
}

function inferStartPosition(requestNodes: FlowNodeRecord[]) {
  const leftMostX =
    requestNodes.length > 0
      ? Math.min(...requestNodes.map((node) => node.position.x))
      : REQUEST_NODE_X;
  const firstY = requestNodes[0]?.position.y ?? 0;
  return { x: leftMostX - REQUEST_NODE_GAP, y: firstY };
}

function withStartConnections(
  edges: FlowEdgeRecord[],
  startNodeId: string,
  requestNodeIds: string[],
) {
  const requestTargets = new Set(requestNodeIds);
  const hasStartEdge = edges.some((edge) => edge.source === startNodeId);
  if (hasStartEdge || requestNodeIds.length === 0) return edges;

  const incomingCounts = new Map<string, number>();
  for (const edge of edges) {
    if (!requestTargets.has(edge.target) || !requestTargets.has(edge.source)) continue;
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }
  const entryNodes = requestNodeIds.filter((nodeId) => (incomingCounts.get(nodeId) ?? 0) === 0);
  return [...edges, ...entryNodes.map((nodeId) => createFlowEdge(startNodeId, nodeId, "control"))];
}

function buildRequestDependencyEdges(
  steps: PipelineStep[],
  { includePositionalAliases = true }: { includePositionalAliases?: boolean } = {},
) {
  const aliases = buildAliasesFromSteps(steps).map((alias) => ({
    ...alias,
    refs: includePositionalAliases ? alias.refs : alias.refs.filter((ref) => ref !== alias.alias),
  }));
  const edges: FlowEdgeRecord[] = [];

  for (const step of steps) {
    const dependencies = collectStepDependencies(step, aliases);
    for (const dependency of dependencies) {
      const source = aliases.find((candidate) => candidate.refs.includes(dependency.alias));
      if (!source || source.stepId === step.id) continue;
      edges.push(createFlowEdge(source.stepId, step.id, "control"));
    }
  }

  return dedupeEdges(edges);
}
function createFlowEdge(
  source: string,
  target: string,
  semantics: FlowEdgeRecord["semantics"],
  sourceHandle?: string,
  targetHandle?: string,
): FlowEdgeRecord {
  return {
    id: `${source}:${target}:${sourceHandle ?? semantics}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    semantics,
  };
}

function dedupeEdges(edges: FlowEdgeRecord[]) {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.source}:${edge.target}:${edge.semantics}:${edge.sourceHandle ?? ""}:${edge.targetHandle ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
