import { executeRequest } from "@/app/actions/api-tests";
import type { ApiResponse, Pipeline, PipelineStep } from "@/types";
import type {
  EntryType,
  GeneratorYield,
  ReducedResponse,
  ScriptResult,
  StepAbortControl,
  StepSnapshot,
  StepStatus,
} from "@/types/pipeline-debug";
import { reduceResponse } from "./context-reducer";
import { buildStepAliases } from "./dag-validator";
import { resolveTemplate } from "./variable-resolver";

const DEFAULT_STEP_TIMEOUT_MS = 30_000;

function cloneSnapshots(snapshots: StepSnapshot[]): StepSnapshot[] {
  return snapshots.map((s) => ({
    ...s,
    variables: { ...s.variables },
    resolvedRequest: {
      ...s.resolvedRequest,
      headers: { ...s.resolvedRequest.headers },
    },
  }));
}

function cloneSnapshot(snapshot: StepSnapshot): StepSnapshot {
  return {
    ...snapshot,
    variables: { ...snapshot.variables },
    resolvedRequest: {
      ...snapshot.resolvedRequest,
      headers: { ...snapshot.resolvedRequest.headers },
    },
  };
}

export async function* createPipelineGenerator(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  options: {
    stepTimeoutMs?: number;
    abortControls: Map<string, StepAbortControl>;
    masterAbort: AbortController;
  }
): AsyncGenerator<GeneratorYield, void, void> {
  const { stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS, abortControls, masterAbort } = options;
  const aliases = buildStepAliases(pipeline.steps);
  const aliasMap = new Map(aliases.map((a) => [a.stepId, a.alias]));

  // Local mutable runtime state — never shared with Zustand store.
  // Snapshots array and runtimeVariables are plain objects, not frozen.
  const snapshots: StepSnapshot[] = [];
  const runtimeVariables: Record<string, unknown> = {};

  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const alias = aliasMap.get(step.id) ?? `req${i + 1}`;

    if (masterAbort.signal.aborted) {
      const abortedSnapshot = createInitialSnapshot(
        step,
        "aborted",
        runtimeVariables,
        "Pipeline aborted"
      );
      snapshots.push(abortedSnapshot);
      yield {
        type: "error",
        snapshot: cloneSnapshot(abortedSnapshot),
        allSnapshots: cloneSnapshots(snapshots),
      };
      return;
    }

    const pendingSnapshot = createInitialSnapshot(step, "running", runtimeVariables, null);
    pendingSnapshot.startedAt = new Date().toISOString();
    snapshots.push(pendingSnapshot);

    yield {
      type: "step_ready",
      snapshot: cloneSnapshot(pendingSnapshot),
      allSnapshots: cloneSnapshots(snapshots),
    };

    const stepAbort = new AbortController();
    const timeoutId = setTimeout(() => stepAbort.abort(), stepTimeoutMs);
    abortControls.set(step.id, { controller: stepAbort, timeoutId });

    const onMasterAbort = () => stepAbort.abort();
    masterAbort.signal.addEventListener("abort", onMasterAbort, { once: true });

    try {
      const resolvedStep = resolveStep(step, runtimeVariables, envVariables);
      const resolvedRequest: StepSnapshot["resolvedRequest"] = {
        url: resolvedStep.url,
        headers: Object.fromEntries(
          resolvedStep.headers.filter((h) => h.enabled).map((h) => [h.key, h.value])
        ),
        body: resolvedStep.body,
      };

      const response = await executeRequest(resolvedStep, envVariables);

      clearTimeout(timeoutId);
      masterAbort.signal.removeEventListener("abort", onMasterAbort);
      abortControls.delete(step.id);

      if (stepAbort.signal.aborted || masterAbort.signal.aborted) {
        const aborted = createCompletedSnapshot(
          pendingSnapshot,
          "aborted",
          null,
          runtimeVariables,
          "Request aborted",
          resolvedRequest
        );
        snapshots[i] = aborted;
        yield {
          type: "step_complete",
          snapshot: cloneSnapshot(aborted),
          allSnapshots: cloneSnapshots(snapshots),
        };
        return;
      }

      let bodyData: unknown = response.body;
      try {
        bodyData = JSON.parse(response.body);
      } catch {
        // Not JSON — keep as string
      }

      runtimeVariables[alias] = {
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: bodyData,
          time: response.time,
          size: response.size,
        },
      };

      const reduced = reduceResponse(response);
      const stepStatus: StepStatus =
        response.status >= 200 && response.status < 400 ? "success" : "error";
      const stepError =
        stepStatus === "error" ? `HTTP ${response.status} ${response.statusText}` : null;

      // Convert script results to ScriptResult format
      const preRequestResult: ScriptResult | undefined = response.preRequestResult
        ? {
            status: response.preRequestResult.error ? "error" : "success",
            logs: response.preRequestResult.logs,
            error: response.preRequestResult.error,
            durationMs: response.preRequestResult.durationMs,
          }
        : undefined;

      const testResult: ScriptResult | undefined = response.testResult
        ? {
            status:
              response.testResult.error || response.testResult.testResults?.some((t) => !t.passed)
                ? "error"
                : "success",
            logs: response.testResult.logs,
            error: response.testResult.error,
            durationMs: response.testResult.durationMs,
            testResults: response.testResult.testResults,
          }
        : undefined;

      const completedSnapshot = createCompletedSnapshot(
        pendingSnapshot,
        stepStatus,
        reduced,
        runtimeVariables,
        stepError,
        resolvedRequest,
        preRequestResult,
        testResult
      );
      snapshots[i] = completedSnapshot;

      yield {
        type: "step_complete",
        snapshot: cloneSnapshot(completedSnapshot),
        allSnapshots: cloneSnapshots(snapshots),
      };
    } catch (err) {
      clearTimeout(timeoutId);
      masterAbort.signal.removeEventListener("abort", onMasterAbort);
      abortControls.delete(step.id);

      const isAbort = stepAbort.signal.aborted || masterAbort.signal.aborted;
      const errorMsg = isAbort
        ? "Request aborted"
        : err instanceof Error
          ? err.message
          : "Unknown error";
      const errorStatus: StepStatus = isAbort ? "aborted" : "error";

      const failedSnapshot = createCompletedSnapshot(
        pendingSnapshot,
        errorStatus,
        null,
        runtimeVariables,
        errorMsg,
        undefined
      );
      snapshots[i] = failedSnapshot;

      const finalizedSnapshots = snapshots.map((s) => ({ ...s, variables: { ...s.variables } }));
      yield {
        type: "step_complete",
        snapshot: { ...failedSnapshot, variables: { ...failedSnapshot.variables } },
        allSnapshots: finalizedSnapshots,
      };

      if (!isAbort) {
        yield {
          type: "error",
          snapshot: { ...failedSnapshot, variables: { ...failedSnapshot.variables } },
          allSnapshots: finalizedSnapshots,
        };
        return;
      }
      return;
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  if (lastSnapshot) {
    yield {
      type: "pipeline_complete",
      snapshot: cloneSnapshot(lastSnapshot),
      allSnapshots: cloneSnapshots(snapshots),
    };
  }
}

function resolveStep(
  step: PipelineStep,
  runtimeVars: Record<string, unknown>,
  envVars: Record<string, string>
): PipelineStep {
  const resolve = (val: string) => resolveTemplate(val, runtimeVars, envVars);

  return {
    ...step,
    url: resolve(step.url),
    headers: step.headers.map((h) => ({ ...h, key: resolve(h.key), value: resolve(h.value) })),
    params: step.params.map((p) => ({ ...p, key: resolve(p.key), value: resolve(p.value) })),
    body: step.body ? resolve(step.body) : step.body,
  };
}

function createInitialSnapshot(
  step: PipelineStep,
  status: StepStatus,
  variables: Record<string, unknown>,
  error: string | null,
  entryType: EntryType = "request"
): StepSnapshot {
  return {
    stepId: step.id,
    stepName: step.name,
    entryType,
    method: step.method,
    url: step.url,
    resolvedRequest: { url: step.url, headers: {}, body: step.body },
    status,
    reducedResponse: null,
    variables: { ...variables },
    error,
    startedAt: null,
    completedAt: null,
  };
}

function createCompletedSnapshot(
  base: StepSnapshot,
  status: StepStatus,
  reduced: ReducedResponse | null,
  variables: Record<string, unknown>,
  error: string | null,
  resolvedRequest?: StepSnapshot["resolvedRequest"],
  preRequestResult?: ScriptResult,
  testResult?: ScriptResult
): StepSnapshot {
  return {
    ...base,
    ...(resolvedRequest && { resolvedRequest }),
    status,
    reducedResponse: reduced,
    variables: { ...variables },
    error,
    completedAt: new Date().toISOString(),
    preRequestResult,
    testResult,
  };
}

export function resultToSnapshots(
  results: Array<ApiResponse & { stepId: string; stepName: string; method: string; url: string }>
): StepSnapshot[] {
  return results.map((r) => ({
    stepId: r.stepId,
    stepName: r.stepName,
    entryType: "request" as EntryType,
    method: r.method as PipelineStep["method"],
    url: r.url,
    resolvedRequest: { url: r.url, headers: {}, body: null },
    status: (r.status >= 200 && r.status < 400 ? "success" : "error") as StepStatus,
    reducedResponse: reduceResponse(r),
    variables: {},
    error: r.status >= 400 ? `HTTP ${r.status} ${r.statusText}` : null,
    startedAt: null,
    completedAt: null,
  }));
}
