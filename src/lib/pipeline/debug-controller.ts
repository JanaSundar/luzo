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
import { createPipelineGenerator } from "./generator-executor";

export class DebugController {
  private generator: PipelineGenerator | null = null;
  private masterAbort: AbortController = new AbortController();
  private abortControls: Map<string, StepAbortControl> = new Map();
  private status: DebugStatus = "idle";
  private executionMode: ExecutionMode = "auto";
  private executionId: string | null = null;
  private isAdvancing: boolean = false;
  private snapshots: StepSnapshot[] = [];
  private runtimeVariables: Record<string, unknown> = {};
  private currentStepIndex: number = 0;
  private totalSteps: number = 0;
  private startedAt: number | null = null;
  private pipeline: Pipeline | null = null;
  private envVars: Record<string, string> = {};

  private get isRunning(): boolean {
    return this.status === "running";
  }

  start(
    pipeline: Pipeline,
    envVars: Record<string, string>,
    options: ControllerOptions
  ): { valid: boolean; errors?: string[] } {
    if (this.isRunning) return { valid: false, errors: ["Pipeline is already running"] };

    const validation = validatePipelineDag(pipeline.steps);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors.map((e) => e.message) };
    }

    this.pipeline = pipeline;
    this.envVars = envVars;
    this.snapshots = [];
    this.runtimeVariables = {};
    this.currentStepIndex = 0;
    this.startedAt = Date.now();
    this.executionId = crypto.randomUUID();
    this.executionMode = options.executionMode ?? "auto";
    this.masterAbort = new AbortController();
    this.abortControls = new Map();
    this.status = "running";
    this.totalSteps = pipeline.steps.length;

    // FIX: Streaming is ONLY used in debug mode to ensure stable normal execution
    const useStream = this.executionMode === "debug";
    this.generator = createPipelineGenerator(pipeline, envVars, {
      abortControls: this.abortControls,
      masterAbort: this.masterAbort,
      startStepId: options.startStepId,
      initialRuntimeVariables: options.initialRuntimeVariables,
      stepTimeoutMs: options.stepTimeoutMs,
      useStream,
    });

    this.pushToStore({ errorMessage: null, completedAt: null });
    void this.runLoop();

    return { valid: true };
  }

  private async runLoop(): Promise<void> {
    if (this.isAdvancing) return;
    this.isAdvancing = true;

    try {
      while (true) {
        if (!this.generator || this.masterAbort.signal.aborted) break;

        const overrides = usePipelineExecutionStore.getState().variableOverrides;
        const result = await this.generator.next(overrides);
        usePipelineExecutionStore.getState().clearVariableOverrides();

        if (result.done) {
          this.handleCompletion();
          break;
        }

        this.handleYield(result.value);

        // Break loop if we are in debug mode and reached a point where we should pause
        if (
          this.executionMode === "debug" &&
          (result.value.type === "step_ready" || result.value.type === "step_complete")
        ) {
          break;
        }
      }
    } catch (err) {
      if (!this.masterAbort.signal.aborted) {
        this.status = "error";
        this.pushToStore({ errorMessage: String(err), completedAt: null });
      }
    } finally {
      this.isAdvancing = false;
    }
  }

  private handleYield(yieldValue: GeneratorYield): void {
    switch (yieldValue.type) {
      case "step_ready":
        this.snapshots = yieldValue.allSnapshots;
        this.currentStepIndex = yieldValue.snapshot.stepIndex;
        if (this.executionMode === "debug") this.status = "paused";
        this.pushToStore({ errorMessage: null, completedAt: null });
        break;
      case "stream_chunk":
        this.snapshots = yieldValue.allSnapshots;
        this.pushToStore({ errorMessage: null, completedAt: null });
        break;
      case "step_complete":
        this.snapshots = yieldValue.allSnapshots;
        this.runtimeVariables = yieldValue.snapshot.variables;
        if (yieldValue.snapshot.status !== "error") {
          this.currentStepIndex = yieldValue.snapshot.stepIndex + 1;
        }
        if (this.executionMode === "debug") this.status = "paused";
        this.pushToStore({ errorMessage: null, completedAt: null });
        break;
      case "error":
        this.snapshots = yieldValue.allSnapshots;
        this.status = "error";
        this.pushToStore({
          errorMessage: yieldValue.snapshot.error ?? "Step failed",
          completedAt: null,
        });
        break;
    }
  }

  private handleCompletion(): void {
    this.status = "completed";
    this.pushToStore({ errorMessage: null, completedAt: Date.now() });
  }

  private pushToStore(extra: { errorMessage: string | null; completedAt: number | null }): void {
    usePipelineExecutionStore.getState().applyControllerSnapshot({
      executionId: this.executionId,
      state: this.status,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.totalSteps,
      snapshots: this.snapshots,
      runtimeVariables: this.runtimeVariables,
      variableOverrides: {},
      errorMessage: extra.errorMessage,
      startedAt: this.startedAt,
      completedAt: extra.completedAt,
    });
  }

  async step(): Promise<void> {
    if (this.status !== "paused" || this.isAdvancing || !this.generator) {
      console.warn(
        "[DebugController] step() ignored. Status:",
        this.status,
        "advancing:",
        this.isAdvancing
      );
      return;
    }

    this.status = "running";
    this.pushToStore({ errorMessage: null, completedAt: null });

    // We don't call runLoop here because step() itself should be awaitable and handle exactly one step's worth of execution
    this.isAdvancing = true;
    try {
      while (true) {
        const overrides = usePipelineExecutionStore.getState().variableOverrides;
        const result = await this.generator.next(overrides);
        usePipelineExecutionStore.getState().clearVariableOverrides();

        if (result.done) {
          this.handleCompletion();
          break;
        }

        this.handleYield(result.value);

        // Step resolves when we hit step_complete or an error
        if (result.value.type === "step_complete" || result.value.type === "error") {
          break;
        }
      }
    } catch (err) {
      if (!this.masterAbort.signal.aborted) {
        this.status = "error";
        this.pushToStore({ errorMessage: String(err), completedAt: null });
      }
    } finally {
      this.isAdvancing = false;
    }
  }

  async resume(): Promise<void> {
    if (this.status !== "paused" || this.isAdvancing) return;

    this.status = "running";
    this.pushToStore({ errorMessage: null, completedAt: null });
    void this.runLoop();
  }

  stop(): void {
    if (this.status === "completed" || this.status === "aborted" || this.status === "interrupted")
      return;

    this.masterAbort.abort();
    this.generator = null;
    this.status = "interrupted";
    this.isAdvancing = false;
    this.pushToStore({ errorMessage: null, completedAt: Date.now() });
  }

  async retry(): Promise<void> {
    if (!this.pipeline) return;

    // 1. Identify failure point - look for errors first
    let failedIndex = this.snapshots.findIndex((s) => s.status === "error");

    // 2. If no error but we were stopped/aborted, find the first unfinished step
    if (failedIndex === -1 && (this.status === "interrupted" || this.status === "aborted")) {
      failedIndex = this.snapshots.findIndex(
        (s) => s.status !== "success" && s.status !== "done" && s.status !== "skipped"
      );
    }

    // 3. Handle cases where no failure or special conditions
    if (failedIndex === -1) {
      if (this.status === "completed" || this.status === "interrupted") {
        // Restart from the last step or beginning if empty
        const lastIdx = Math.max(0, this.snapshots.length - 1);
        return this.startRetryAt(lastIdx);
      }
      return;
    }

    await this.startRetryAt(failedIndex);
  }

  private async startRetryAt(index: number): Promise<void> {
    if (!this.pipeline || this.isAdvancing) return;

    // 1. FIX: Reset ALL previous abort controllers
    this.abortControls.forEach((ctrl) => {
      if (ctrl.timeoutId) clearTimeout(ctrl.timeoutId);
      ctrl.controller.abort();
    });
    this.abortControls.clear();

    // 2. FIX: Rewind snapshots (CREATE NEW ARRAY, DO NOT MUTATE)
    const newSnapshots = this.snapshots.slice(0, index);

    // 3. FIX: Rebuild runtime variables ONLY from successful predecessors
    const runtimeVariables: Record<string, unknown> = {};
    const aliases = buildStepAliases(this.pipeline.steps);
    const aliasMap = new Map(aliases.map((a) => [a.stepId, a.alias]));

    for (let i = 0; i < index; i++) {
      const snap = this.snapshots[i];
      if (snap.status === "success" || snap.status === "done") {
        const alias = aliasMap.get(snap.stepId);
        if (alias) {
          // Reconstruct the runtime value from snapshot data
          runtimeVariables[alias] = {
            response: {
              status: snap.reducedResponse?.status ?? 0,
              statusText: snap.reducedResponse?.statusText ?? "",
              headers: snap.fullHeaders ?? {},
              body: this.tryParseJson(snap.fullBody ?? ""),
              time: snap.reducedResponse?.latencyMs ?? 0,
              size: snap.reducedResponse?.sizeBytes ?? 0,
            },
          };
        }
      }
    }

    const startStepId = this.pipeline.steps[index]?.id;

    // 4. FIX: Store fresh state BEFORE starting
    this.snapshots = newSnapshots;
    this.currentStepIndex = index;
    this.runtimeVariables = runtimeVariables;
    this.status = "running";
    this.masterAbort = new AbortController(); // FIX: Fresh master AbortController

    // 5. FIX: NEVER reuse old generator instance
    this.generator = createPipelineGenerator(this.pipeline, this.envVars, {
      abortControls: this.abortControls,
      masterAbort: this.masterAbort,
      startStepId,
      initialRuntimeVariables: runtimeVariables,
      useStream: this.executionMode === "debug",
    });

    // 6. FIX: Update store before starting retry
    this.pushToStore({ errorMessage: null, completedAt: null });

    // 7. FIX: Trigger non-batched runLoop
    void this.runLoop();
  }

  private tryParseJson(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  async skip(): Promise<void> {
    if (this.status !== "paused" || this.isAdvancing || !this.generator) return;

    // Mark current step as skipped if possible
    if (this.snapshots.length > 0) {
      const last = this.snapshots[this.snapshots.length - 1];
      this.snapshots = [...this.snapshots.slice(0, -1), { ...last, status: "skipped" }];
    }

    this.status = "running";
    this.pushToStore({ errorMessage: null, completedAt: null });
    void this.runLoop();
  }
}
