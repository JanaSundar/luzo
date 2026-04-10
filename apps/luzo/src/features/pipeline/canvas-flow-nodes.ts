import type { ApiRequest, AuthConfig, PipelineStep } from "@/types";
import type { FlowNodeConfig, FlowNodeRecord, WorkflowNodeKind } from "@/types/workflow";
import { createDefaultRequestName } from "./request-names";

export const DEFAULT_REQUEST_AUTH: AuthConfig = { type: "none" };

export function createEmptyRequestStep(existingNames: Iterable<string> = []): PipelineStep {
  return {
    id: crypto.randomUUID(),
    name: createDefaultRequestName(existingNames),
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
      return { kind, label: "Condition", rules: [], expression: "" };
    case "delay":
      return { kind, label: "Delay", durationMs: 1000 };
    case "transform":
      return { kind, label: "Transform", script: "" };
    case "switch":
      return { kind, label: "Switch", cases: [] };
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
    geometry: {
      position: overrides.geometry?.position ?? overrides.position ?? position,
      size: overrides.geometry?.size ?? overrides.size,
      parentId: overrides.geometry?.parentId,
    },
    position: overrides.geometry?.position ?? overrides.position ?? position,
    size: overrides.geometry?.size ?? overrides.size,
    dataRef: kind === "request" ? requestRef : overrides.dataRef,
    requestRef,
    config: overrides.config ?? createDefaultNodeConfig(kind),
  };
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
