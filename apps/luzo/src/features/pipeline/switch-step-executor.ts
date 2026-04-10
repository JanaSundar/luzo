import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { SwitchNodeConfig } from "@/types/workflow";
import { evaluateConditionStep } from "./condition-evaluator";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";

const SWITCH_METHOD = "GET" as const;
const SWITCH_URL = "";

function createSwitchSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Switch",
    entryType: "switch",
    method: SWITCH_METHOD,
    url: SWITCH_URL,
    resolvedRequest: { method: SWITCH_METHOD, url: SWITCH_URL, headers: {}, body: null },
    status: "running",
    reducedResponse: null,
    variables: { ...runtimeVariables },
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    streamStatus: "idle",
    streamChunks: [],
    timelineEvents: [],
  };
}

/**
 * Evaluates a switch node top-to-bottom across all non-default cases.
 * First truthy expression wins. Falls back to the default case id.
 * Yields step_ready (debug mode) then switch_evaluated.
 */
export async function* executeSwitchGenerator(params: {
  nodeId: string;
  orderIndex: number;
  switchConfig: SwitchNodeConfig;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  snapshots: StepSnapshot[];
  pauseBeforeEvaluate?: boolean;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const {
    nodeId,
    orderIndex,
    switchConfig,
    runtimeVariables,
    envVariables,
    snapshots,
    pauseBeforeEvaluate = false,
  } = params;

  let snapshot = createSwitchSnapshot(nodeId, switchConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  if (pauseBeforeEvaluate) {
    yield {
      type: "step_ready",
      snapshot: cloneSnapshot(snapshot),
    } satisfies PipelineExecutionEvent;
  }

  const cases = switchConfig.cases ?? [];
  const nonDefaultCases = cases.filter((c) => !c.isDefault);
  const defaultCase = cases.find((c) => c.isDefault);

  let matchedCaseId: string | null = null;
  for (const c of nonDefaultCases) {
    if (!c.expression.trim()) continue;
    const { result } = evaluateConditionStep(
      { kind: "condition", label: "", rules: [], expression: c.expression },
      runtimeVariables,
      envVariables,
    );
    if (result) {
      matchedCaseId = c.id;
      break;
    }
  }

  if (matchedCaseId === null && defaultCase) {
    matchedCaseId = defaultCase.id;
  }

  snapshot = {
    ...snapshot,
    status: "done",
    completedAt: Date.now(),
    switchResult: { matchedCaseId },
  };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "switch_evaluated",
    snapshot: cloneSnapshot(snapshot),
    matchedCaseId,
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
