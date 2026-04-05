import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import type { Pipeline } from "@/types";
import type {
  ControllerOptions,
  DebugStatus,
  ExecutionMode,
  GeneratorYield,
  PipelineGenerator,
  StepAbortControl,
  StepSnapshot,
} from "@/types/pipeline-runtime";
import { buildStepAliases, validatePipelineDag } from "./dag-validator";
import { countFlowExecutionNodes } from "./flow-execution-graph";
import { createPipelineGenerator } from "./generator-executor";

export interface DebugController {
  start(
    pipeline: Pipeline,
    envVars: Record<string, string>,
    options: ControllerOptions,
  ): { valid: boolean; errors?: string[] };
  step(): Promise<void>;
  resume(): Promise<void>;
  stop(): void;
  retry(): Promise<void>;
}

interface ControllerState {
  generator: PipelineGenerator | null;
  masterAbort: AbortController;
  abortControls: Map<string, StepAbortControl>;
  status: DebugStatus;
  executionMode: ExecutionMode;
  executionId: string | null;
  isAdvancing: boolean;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: number | null;
  pipeline: Pipeline | null;
  envVars: Record<string, string>;
}

function createInitialState(): ControllerState {
  return {
    generator: null,
    masterAbort: new AbortController(),
    abortControls: new Map(),
    status: "idle",
    executionMode: "auto",
    executionId: null,
    isAdvancing: false,
    snapshots: [],
    runtimeVariables: {},
    currentStepIndex: 0,
    totalSteps: 0,
    startedAt: null,
    pipeline: null,
    envVars: {},
  };
}

function pushToStore(
  state: ControllerState,
  extra: { errorMessage: string | null; completedAt: number | null },
): void {
  usePipelineExecutionStore.getState().applyControllerSnapshot({
    executionId: state.executionId,
    state: state.status,
    originExecutionMode: state.executionMode,
    currentStepIndex: state.currentStepIndex,
    totalSteps: state.totalSteps,
    snapshots: state.snapshots,
    runtimeVariables: state.runtimeVariables,
    variableOverrides: {},
    errorMessage: extra.errorMessage,
    startedAt: state.startedAt,
    completedAt: extra.completedAt,
  });
}

function completeRun(
  state: ControllerState,
  completedAt: number,
  errorMessage: string | null = null,
) {
  state.status = errorMessage ? "error" : "completed";
  pushToStore(state, { errorMessage, completedAt });
}

function applyYield(state: ControllerState, yieldValue: GeneratorYield): void {
  switch (yieldValue.type) {
    case "step_ready":
      state.snapshots = yieldValue.allSnapshots;
      state.currentStepIndex = yieldValue.snapshot.stepIndex;
      if (state.executionMode === "debug") state.status = "paused";
      pushToStore(state, { errorMessage: null, completedAt: null });
      break;

    case "stream_chunk":
      state.snapshots = yieldValue.allSnapshots;
      pushToStore(state, { errorMessage: null, completedAt: null });
      break;

    case "step_complete":
      state.snapshots = yieldValue.allSnapshots;
      state.runtimeVariables = yieldValue.snapshot.variables;
      if (yieldValue.snapshot.status !== "error") {
        state.currentStepIndex = yieldValue.snapshot.stepIndex + 1;
      }
      if (state.executionMode === "debug") state.status = "paused";
      pushToStore(state, { errorMessage: null, completedAt: null });
      break;

    case "error":
      state.snapshots = yieldValue.allSnapshots;
      state.status = "error";
      pushToStore(state, {
        errorMessage: yieldValue.snapshot.error ?? "Step failed",
        completedAt: null,
      });
      break;
  }
}

function getLatestErrorMessage(state: ControllerState): string | null {
  for (let index = state.snapshots.length - 1; index >= 0; index -= 1) {
    const message = state.snapshots[index]?.error;
    if (message) return message;
  }
  return null;
}

type PausePredicate = (val: GeneratorYield) => boolean;

async function runUntil(state: ControllerState, shouldPause: PausePredicate): Promise<void> {
  if (state.isAdvancing) return;
  state.isAdvancing = true;

  try {
    while (true) {
      if (!state.generator || state.masterAbort.signal.aborted) break;

      const overrides = usePipelineExecutionStore.getState().variableOverrides;
      const result = await state.generator.next(overrides);
      usePipelineExecutionStore.getState().clearVariableOverrides();

      if (result.done) {
        const completedAt = Date.now();
        completeRun(
          state,
          completedAt,
          state.status === "error" ? (getLatestErrorMessage(state) ?? "Step failed") : null,
        );
        break;
      }

      applyYield(state, result.value);

      if (shouldPause(result.value)) {
        const isFullyComplete =
          state.currentStepIndex >= state.totalSteps && result.value.type === "step_complete";

        if (isFullyComplete) {
          const completedAt = Date.now();
          completeRun(
            state,
            completedAt,
            state.status === "error" || result.value.snapshot.status === "error"
              ? (getLatestErrorMessage(state) ?? result.value.snapshot.error ?? "Step failed")
              : null,
          );
        }
        break;
      }
    }
  } catch (err) {
    if (!state.masterAbort.signal.aborted) {
      state.status = "error";
      pushToStore(state, { errorMessage: String(err), completedAt: null });
    }
  } finally {
    state.isAdvancing = false;
  }
}

function runLoop(state: ControllerState): Promise<void> {
  return runUntil(state, (val) => state.executionMode === "debug" && val.type === "step_ready");
}

function tryParseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function rebuildRuntimeVariables(
  pipeline: Pipeline,
  snapshots: StepSnapshot[],
  upToIndex: number,
): Record<string, unknown> {
  const aliases = buildStepAliases(pipeline.steps);
  const aliasMap = new Map(aliases.map((a) => [a.stepId, a]));
  const runtimeVariables: Record<string, unknown> = {};

  for (let i = 0; i < upToIndex; i++) {
    const snap = snapshots[i];
    if (!snap) continue;
    if (snap.status !== "success" && snap.status !== "done") continue;

    const alias = aliasMap.get(snap.stepId);
    if (!alias) continue;

    const value = {
      response: {
        status: snap.reducedResponse?.status ?? 0,
        statusText: snap.reducedResponse?.statusText ?? "",
        headers: snap.fullHeaders ?? {},
        body: tryParseJson(snap.fullBody ?? ""),
        time: snap.reducedResponse?.latencyMs ?? 0,
        size: snap.reducedResponse?.sizeBytes ?? 0,
      },
    };
    alias.refs.forEach((ref) => {
      runtimeVariables[ref] = value;
    });
  }

  return runtimeVariables;
}

function resolveRetryIndex(state: ControllerState): number | null {
  const errorIndex = state.snapshots.findIndex((s) => s.status === "error");
  if (errorIndex !== -1) return errorIndex;

  if (state.status === "interrupted" || state.status === "aborted") {
    const incompleteIndex = state.snapshots.findIndex(
      (s) => s.status !== "success" && s.status !== "done",
    );
    if (incompleteIndex !== -1) return incompleteIndex;
  }

  if (state.status === "completed" || state.status === "interrupted") {
    return Math.max(0, state.snapshots.length - 1);
  }

  return null;
}

function resetAbortControls(state: ControllerState): void {
  state.abortControls.forEach((ctrl) => {
    if (ctrl.timeoutId) clearTimeout(ctrl.timeoutId);
    ctrl.controller.abort();
  });
  state.abortControls.clear();
}

async function startRetryAt(state: ControllerState, index: number): Promise<void> {
  if (!state.pipeline || state.isAdvancing) return;

  resetAbortControls(state);

  const runtimeVariables = rebuildRuntimeVariables(state.pipeline, state.snapshots, index);
  const startStepId = state.pipeline.steps[index]?.id;

  state.snapshots = state.snapshots.slice(0, index);
  state.currentStepIndex = index;
  state.runtimeVariables = runtimeVariables;
  state.status = "running";
  state.masterAbort = new AbortController();

  state.generator = createPipelineGenerator(state.pipeline, state.envVars, {
    abortControls: state.abortControls,
    masterAbort: state.masterAbort,
    startStepId,
    initialRuntimeVariables: runtimeVariables,
    useStream: state.executionMode === "debug",
  });

  pushToStore(state, { errorMessage: null, completedAt: null });
  void runLoop(state);
}

export function createDebugController(): DebugController {
  const state = createInitialState();

  function start(
    pipeline: Pipeline,
    envVars: Record<string, string>,
    options: ControllerOptions,
  ): { valid: boolean; errors?: string[] } {
    if (state.status === "running") {
      return { valid: false, errors: ["Pipeline is already running"] };
    }

    const validation = validatePipelineDag(pipeline.steps);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors.map((e) => e.message) };
    }

    Object.assign(state, {
      pipeline,
      envVars,
      snapshots: [],
      runtimeVariables: {},
      currentStepIndex: 0,
      startedAt: Date.now(),
      executionId: crypto.randomUUID(),
      executionMode: options.executionMode ?? "auto",
      masterAbort: new AbortController(),
      abortControls: new Map(),
      status: "running",
      totalSteps: countFlowExecutionNodes(pipeline),
    } satisfies Partial<ControllerState>);

    state.generator = createPipelineGenerator(pipeline, envVars, {
      abortControls: state.abortControls,
      masterAbort: state.masterAbort,
      startStepId: options.startStepId,
      initialRuntimeVariables: options.initialRuntimeVariables,
      stepTimeoutMs: options.stepTimeoutMs,
      useStream: state.executionMode === "debug",
    });

    pushToStore(state, { errorMessage: null, completedAt: null });
    void runLoop(state);

    return { valid: true };
  }

  async function step(): Promise<void> {
    if (state.status !== "paused" || state.isAdvancing || !state.generator) return;

    state.status = "running";
    pushToStore(state, { errorMessage: null, completedAt: null });

    await runUntil(state, (val) => val.type === "step_complete" || val.type === "error");
  }

  async function resume(): Promise<void> {
    if (state.status !== "paused" || state.isAdvancing) return;

    state.status = "running";
    state.executionMode = "auto";
    pushToStore(state, { errorMessage: null, completedAt: null });

    void runLoop(state);
  }

  function stop(): void {
    const terminalStatuses: DebugStatus[] = ["completed", "aborted", "interrupted"];
    if (terminalStatuses.includes(state.status)) return;

    state.masterAbort.abort();
    state.generator = null;
    state.status = "interrupted";
    state.isAdvancing = false;
    pushToStore(state, { errorMessage: null, completedAt: Date.now() });
  }

  async function retry(): Promise<void> {
    if (!state.pipeline) return;

    const index = resolveRetryIndex(state);
    if (index === null) return;

    await startRetryAt(state, index);
  }

  return { start, step, resume, stop, retry, __state: state } as unknown as DebugController;
}
