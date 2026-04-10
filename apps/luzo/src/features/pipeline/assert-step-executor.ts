import type { PipelineExecutionEvent, StepSnapshot } from "@/types/pipeline-runtime";
import type { AssertNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";
import { evaluateConditionStep } from "./condition-evaluator";
import { createAsyncTimelineEvent, appendTimelineEvent } from "./async-step-runtime";

const ASSERT_METHOD = "GET" as const;
const ASSERT_URL = "";

function createAssertSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Assert",
    entryType: "condition",
    method: ASSERT_METHOD,
    url: ASSERT_URL,
    resolvedRequest: { method: ASSERT_METHOD, url: ASSERT_URL, headers: {}, body: null },
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
 * Executes an Assert node. Evaluates the expression against runtime variables.
 * On success: yields step_completed, execution continues.
 * On failure: emits assert_failed timeline event + yields step_failed, halting the branch.
 * Reuses the canonical condition evaluator — one implementation, three nodes (If, Assert, Poll).
 */
export async function* executeAssertGenerator(params: {
  nodeId: string;
  orderIndex: number;
  assertConfig: AssertNodeConfig;
  runtimeVariables: Record<string, unknown>;
  envVariables: Record<string, string>;
  snapshots: StepSnapshot[];
  executionId: string;
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const {
    nodeId,
    orderIndex,
    assertConfig,
    runtimeVariables,
    envVariables,
    snapshots,
    executionId,
  } = params;

  let snapshot = createAssertSnapshot(nodeId, assertConfig.label, orderIndex, runtimeVariables);
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const conditionConfig = {
    kind: "condition" as const,
    label: assertConfig.label,
    rules: [],
    expression: assertConfig.expression,
  };

  const { result, resolvedInputs } = evaluateConditionStep(
    conditionConfig,
    runtimeVariables,
    envVariables,
  );

  if (!result) {
    const failureMessage =
      assertConfig.message?.trim() ||
      `Assertion failed: ${assertConfig.expression.trim() || "(empty expression)"}`;

    const failEvent = createAsyncTimelineEvent({
      executionId,
      snapshot,
      eventKind: "assert_failed",
      status: "failed",
      sequenceNumber: orderIndex + 0.1,
      summary: failureMessage,
      outcome: "failed",
      metadata: { expression: assertConfig.expression, resolvedInputs },
    });
    snapshot = appendTimelineEvent(snapshot, failEvent);
    yield { type: "timeline_event", event: failEvent, snapshot, runtimeVariables };

    snapshot = { ...snapshot, status: "error", error: failureMessage, completedAt: Date.now() };
    snapshots[snapshotIndex] = snapshot;

    yield {
      type: "step_failed",
      snapshot: cloneSnapshot(snapshot),
      runtimeVariables: cloneRuntimeVariables(runtimeVariables),
    } satisfies PipelineExecutionEvent;
    return;
  }

  snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "step_completed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
