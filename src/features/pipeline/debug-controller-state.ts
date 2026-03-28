import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { cloneRuntimeRecord, cloneSnapshot } from "./pipeline-snapshot-utils";
import type { Pipeline } from "@/types";
import type {
  DebugStatus,
  ExecutionMode,
  PipelineExecutionEvent,
  PipelineRuntime,
  StepAbortControl,
  StepSnapshot,
} from "@/types/pipeline-runtime";
import type { CompiledPipelinePlan } from "@/types/workflow";

export interface DebugLayoutEntry {
  depth: number;
  groupLabel: string;
  mode: "parallel" | "review" | "sequential";
  parallelGroup: boolean;
  detail: string;
}

export interface ControllerState {
  generator: PipelineRuntime | null;
  masterAbort: AbortController;
  abortControls: Map<string, StepAbortControl>;
  status: DebugStatus;
  executionMode: ExecutionMode;
  originExecutionMode: ExecutionMode;
  executionId: string | null;
  isAdvancing: boolean;
  snapshots: StepSnapshot[];
  runtimeVariables: Record<string, unknown>;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: number | null;
  pipeline: Pipeline | null;
  envVars: Record<string, string>;
  compiledPlan: CompiledPipelinePlan | null;
  layoutByStep: Map<string, DebugLayoutEntry>;
}

export function createInitialState(): ControllerState {
  return {
    generator: null,
    masterAbort: new AbortController(),
    abortControls: new Map(),
    status: "idle",
    executionMode: "auto",
    originExecutionMode: "auto",
    executionId: null,
    isAdvancing: false,
    snapshots: [],
    runtimeVariables: {},
    currentStepIndex: 0,
    totalSteps: 0,
    startedAt: null,
    pipeline: null,
    envVars: {},
    compiledPlan: null,
    layoutByStep: new Map(),
  };
}

export function applyEvent(state: ControllerState, event: PipelineExecutionEvent): void {
  const executionStore = usePipelineExecutionStore.getState();
  const timelineStore = useTimelineStore.getState();

  executionStore.applyExecutionEvent(event);
  timelineStore.applyExecutionEvent(event, state.executionId, state.layoutByStep);

  switch (event.type) {
    case "execution_started":
      state.status = "running";
      state.startedAt = event.startedAt;
      state.totalSteps = event.totalSteps;
      executionStore.setExecutionMeta({
        executionId: state.executionId ?? crypto.randomUUID(),
        totalSteps: event.totalSteps,
        startedAt: event.startedAt,
      });
      return;
    case "step_ready":
      upsertSnapshot(state.snapshots, cloneSnapshot(event.snapshot));
      state.currentStepIndex = event.snapshot.stepIndex;
      if (state.executionMode === "debug") {
        state.status = "paused";
        executionStore.setStatus("paused");
      }
      return;
    case "step_stream_chunk":
      upsertSnapshot(state.snapshots, cloneSnapshot(event.snapshot));
      return;
    case "step_completed":
      upsertSnapshot(state.snapshots, cloneSnapshot(event.snapshot));
      state.runtimeVariables = cloneRuntimeRecord(event.runtimeVariables);
      state.currentStepIndex = event.snapshot.stepIndex + 1;
      return;
    case "step_failed":
      upsertSnapshot(state.snapshots, cloneSnapshot(event.snapshot));
      state.runtimeVariables = cloneRuntimeRecord(event.runtimeVariables);
      state.status = "error";
      executionStore.setStatus("error");
      return;
    case "execution_completed":
      state.status = "completed";
      executionStore.setStatus("completed");
      return;
    case "execution_interrupted":
      state.status = "interrupted";
      executionStore.setStatus("interrupted");
      return;
  }
}

export function upsertSnapshot(snapshots: StepSnapshot[], snapshot: StepSnapshot) {
  const index = snapshots.findIndex((entry) => entry.stepId === snapshot.stepId);
  if (index === -1) {
    snapshots.push(snapshot);
    return;
  }
  snapshots[index] = snapshot;
}

export function resolveRetryIndex(state: ControllerState): number | null {
  const errorIndex = state.snapshots.findIndex((snapshot) => snapshot.status === "error");
  if (errorIndex !== -1) return errorIndex;

  if (state.status === "interrupted" || state.status === "aborted") {
    const incompleteIndex = state.snapshots.findIndex(
      (snapshot) => snapshot.status !== "success" && snapshot.status !== "done",
    );
    if (incompleteIndex !== -1) return incompleteIndex;
  }

  if (state.status === "completed" || state.status === "interrupted") {
    return Math.max(0, state.snapshots.length - 1);
  }

  return null;
}

export function resetAbortControls(state: ControllerState): void {
  state.abortControls.forEach((ctrl) => {
    if (ctrl.timeoutId) clearTimeout(ctrl.timeoutId);
    ctrl.controller.abort();
  });
  state.abortControls.clear();
}

export function buildLayoutMap(plan: CompiledPipelinePlan): Map<string, DebugLayoutEntry> {
  const nodeMap = new Map(plan.nodes.map((node) => [node.nodeId, node]));
  return new Map(
    plan.order.map((nodeId) => {
      const node = nodeMap.get(nodeId);
      const parallelGroup = (plan.stages[node?.stageIndex ?? 0]?.nodeIds.length ?? 0) > 1;
      return [
        nodeId,
        {
          depth: node?.stageIndex ?? 0,
          groupLabel: parallelGroup
            ? `Parallel group ${(node?.stageIndex ?? 0) + 1}`
            : `Stage ${(node?.stageIndex ?? 0) + 1}`,
          mode: parallelGroup ? "parallel" : "sequential",
          parallelGroup,
          detail:
            node?.dependencyIds.length && node.dependencyIds.length > 0
              ? `Waits for ${node.dependencyIds.join(", ")}`
              : "No upstream dependencies detected.",
        },
      ];
    }),
  );
}
