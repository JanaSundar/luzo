import { executeRequest } from "@/app/actions/api-tests";
import type { Pipeline, PipelineStep } from "@/types";
import type { GeneratorYield, StepAbortControl, StepSnapshot } from "@/types/pipeline-debug";
import { reduceResponse } from "./context-reducer";
import { buildStepAliases } from "./dag-validator";
import {
  toErrorMessage,
  toPreRequestResult,
  toRuntimeValue,
  toStepStatus,
  toTestResult,
} from "./pipeline-execution-mappers";
import {
  cloneSnapshot,
  cloneSnapshots,
  createCompletedSnapshot,
  createInitialSnapshot,
  resultToSnapshots,
} from "./pipeline-snapshot-utils";
import { resolveTemplate } from "./variable-resolver";

const DEFAULT_STEP_TIMEOUT_MS = 30_000;

interface GeneratorOptions {
  stepTimeoutMs?: number;
  abortControls: Map<string, StepAbortControl>;
  masterAbort: AbortController;
  startStepId?: string;
  initialRuntimeVariables?: Record<string, unknown>;
}

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: GeneratorOptions
): AsyncGenerator<GeneratorYield, void, Record<string, string> | undefined> {
  const { stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS, abortControls, masterAbort } = options;
  const aliases = buildStepAliases(pipeline.steps);
  const aliasMap = new Map(aliases.map((alias) => [alias.stepId, alias.alias]));
  const startIndex = getStartIndex(pipeline, options.startStepId);
  const snapshots: StepSnapshot[] = [];
  const runtimeVariables = cloneRuntimeVariables(options.initialRuntimeVariables);

  for (let index = startIndex; index < pipeline.steps.length; index++) {
    const step = pipeline.steps[index];
    const alias = aliasMap.get(step.id) ?? `req${index + 1}`;

    if (masterAbort.signal.aborted) {
      yield buildAbortResult(step, runtimeVariables, snapshots);
      return;
    }

    const pendingSnapshot = createInitialSnapshot(step, "running", runtimeVariables, null);
    pendingSnapshot.startedAt = new Date().toISOString();
    snapshots.push(pendingSnapshot);

    const variableOverrides = (yield {
      type: "step_ready",
      snapshot: cloneSnapshot(pendingSnapshot),
      allSnapshots: cloneSnapshots(snapshots),
    }) as Record<string, string> | undefined;

    const stepAbort = createStepAbort(step.id, stepTimeoutMs, abortControls);
    const onMasterAbort = () => stepAbort.controller.abort();
    masterAbort.signal.addEventListener("abort", onMasterAbort, { once: true });

    try {
      const resolvedStep = resolveStep(
        step,
        runtimeVariables,
        envVariables,
        variableOverrides ?? {}
      );
      const resolvedRequest = {
        url: resolvedStep.url,
        headers: Object.fromEntries(
          resolvedStep.headers
            .filter((header) => header.enabled)
            .map((header) => [header.key, header.value])
        ),
        body: resolvedStep.body,
      };
      const response = await executeRequest(resolvedStep, envVariables);

      clearStepAbort(step.id, stepAbort.timeoutId, abortControls, masterAbort, onMasterAbort);

      if (stepAbort.controller.signal.aborted || masterAbort.signal.aborted) {
        const abortedSnapshot = createCompletedSnapshot(
          pendingSnapshot,
          "aborted",
          null,
          runtimeVariables,
          "Request aborted",
          resolvedRequest
        );
        snapshots[snapshots.length - 1] = abortedSnapshot;
        yield buildYield("step_complete", abortedSnapshot, snapshots);
        return;
      }

      runtimeVariables[alias] = toRuntimeValue(response);
      const stepStatus = toStepStatus(response.status);
      const completedSnapshot = createCompletedSnapshot(
        pendingSnapshot,
        stepStatus,
        reduceResponse(response),
        runtimeVariables,
        stepStatus === "error" ? `HTTP ${response.status} ${response.statusText}` : null,
        resolvedRequest,
        toPreRequestResult(response),
        toTestResult(response),
        { body: response.body, headers: response.headers }
      );

      snapshots[snapshots.length - 1] = completedSnapshot;
      yield buildYield("step_complete", completedSnapshot, snapshots);
    } catch (error) {
      clearStepAbort(step.id, stepAbort.timeoutId, abortControls, masterAbort, onMasterAbort);

      const isAbort = stepAbort.controller.signal.aborted || masterAbort.signal.aborted;
      const failedSnapshot = createCompletedSnapshot(
        pendingSnapshot,
        isAbort ? "aborted" : "error",
        null,
        runtimeVariables,
        isAbort ? "Request aborted" : toErrorMessage(error),
        undefined
      );

      snapshots[snapshots.length - 1] = failedSnapshot;
      yield buildYield("step_complete", failedSnapshot, snapshots);

      if (!isAbort) {
        yield buildYield("error", failedSnapshot, snapshots);
      }
      return;
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  if (lastSnapshot) {
    yield buildYield("pipeline_complete", lastSnapshot, snapshots);
  }
}

export { resultToSnapshots };

function getStartIndex(pipeline: Pipeline, startStepId?: string) {
  if (!startStepId) return 0;
  const index = pipeline.steps.findIndex((step) => step.id === startStepId);
  return index >= 0 ? index : 0;
}

function cloneRuntimeVariables(value?: Record<string, unknown>) {
  if (!value) return {};
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function createStepAbort(
  stepId: string,
  stepTimeoutMs: number,
  abortControls: Map<string, StepAbortControl>
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), stepTimeoutMs);
  abortControls.set(stepId, { controller, timeoutId });
  return { controller, timeoutId };
}

function clearStepAbort(
  stepId: string,
  timeoutId: ReturnType<typeof setTimeout>,
  abortControls: Map<string, StepAbortControl>,
  masterAbort: AbortController,
  onMasterAbort: () => void
) {
  clearTimeout(timeoutId);
  abortControls.delete(stepId);
  masterAbort.signal.removeEventListener("abort", onMasterAbort);
}

function buildAbortResult(
  step: PipelineStep,
  runtimeVariables: Record<string, unknown>,
  snapshots: StepSnapshot[]
) {
  const snapshot = createInitialSnapshot(step, "aborted", runtimeVariables, "Pipeline aborted");
  snapshots.push(snapshot);
  return buildYield("error", snapshot, snapshots);
}

function buildYield(
  type: GeneratorYield["type"],
  snapshot: StepSnapshot,
  snapshots: StepSnapshot[]
) {
  return {
    type,
    snapshot: cloneSnapshot(snapshot),
    allSnapshots: cloneSnapshots(snapshots),
  } satisfies GeneratorYield;
}

function resolveStep(
  step: PipelineStep,
  runtimeVars: Record<string, unknown>,
  envVars: Record<string, string>,
  variableOverrides: Record<string, string>
): PipelineStep {
  const resolve = (value: string) =>
    resolveTemplate(value, runtimeVars, envVars, variableOverrides);

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    params: step.params.map((param) => ({
      ...param,
      key: resolve(param.key),
      value: resolve(param.value),
    })),
    body: step.body ? resolve(step.body) : step.body,
  };
}
