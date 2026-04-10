import type { PipelineExecutionEvent, StepAlias, StepSnapshot } from "@/types/pipeline-runtime";
import type { TransformNodeConfig } from "@/types/workflow";
import { cloneRuntimeVariables } from "./generator-executor-shared";
import { cloneSnapshot } from "./pipeline-snapshot-utils";

const TRANSFORM_METHOD = "GET" as const;
const TRANSFORM_URL = "";
const JS_IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function createTransformSnapshot(
  nodeId: string,
  label: string,
  orderIndex: number,
  runtimeVariables: Record<string, unknown>,
): StepSnapshot {
  return {
    stepId: nodeId,
    stepIndex: orderIndex,
    stepName: label || "Transform",
    entryType: "condition",
    method: TRANSFORM_METHOD,
    url: TRANSFORM_URL,
    resolvedRequest: { method: TRANSFORM_METHOD, url: TRANSFORM_URL, headers: {}, body: null },
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
 * Evaluates a transform script in a sandboxed Function with runtime variables available.
 * The script's return value is stored as `<runtimeRef>.output` in runtimeVariables.
 */
function runTransformScript(
  script: string,
  runtimeVariables: Record<string, unknown>,
): { output: unknown; error: string | null } {
  try {
    const safeKeys = Object.keys(runtimeVariables).filter((key) => JS_IDENTIFIER_REGEX.test(key));
    const safeValues = safeKeys.map((k) => runtimeVariables[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...safeKeys, `"use strict"; return (${script});`);
    return { output: fn(...safeValues), error: null };
  } catch (err) {
    return { output: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Executes a Transform node. Evaluates the configured script against runtime variables
 * and stores the result as `<runtimeRef>.output` for downstream nodes to reference.
 */
export async function* executeTransformGenerator(params: {
  nodeId: string;
  orderIndex: number;
  transformConfig: TransformNodeConfig;
  transformAlias: StepAlias;
  runtimeVariables: Record<string, unknown>;
  snapshots: StepSnapshot[];
}): AsyncGenerator<PipelineExecutionEvent, void, Record<string, string> | undefined> {
  const { nodeId, orderIndex, transformAlias, transformConfig, runtimeVariables, snapshots } =
    params;

  let snapshot = createTransformSnapshot(
    nodeId,
    transformConfig.label,
    orderIndex,
    runtimeVariables,
  );
  snapshots.push(snapshot);
  const snapshotIndex = snapshots.length - 1;

  const { output, error } = runTransformScript(transformConfig.script, runtimeVariables);

  if (error) {
    snapshot = { ...snapshot, status: "error", error, completedAt: Date.now() };
    snapshots[snapshotIndex] = snapshot;
    yield {
      type: "step_failed",
      snapshot: cloneSnapshot(snapshot),
      runtimeVariables: cloneRuntimeVariables(runtimeVariables),
    } satisfies PipelineExecutionEvent;
    return;
  }

  transformAlias.refs.forEach((ref) => {
    const current =
      runtimeVariables[ref] && typeof runtimeVariables[ref] === "object"
        ? (runtimeVariables[ref] as Record<string, unknown>)
        : {};
    runtimeVariables[ref] = { ...current, output };
  });

  snapshot = { ...snapshot, status: "done", completedAt: Date.now() };
  snapshots[snapshotIndex] = snapshot;

  yield {
    type: "step_completed",
    snapshot: cloneSnapshot(snapshot),
    runtimeVariables: cloneRuntimeVariables(runtimeVariables),
  } satisfies PipelineExecutionEvent;
}
