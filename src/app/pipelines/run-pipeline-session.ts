"use client";

import { toast } from "sonner";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import type { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { DebugSessionOptions } from "@/types/pipeline-debug";

type ActivePipeline = ReturnType<typeof usePipelineStore.getState>["pipelines"][number];

export interface RunPipelineSessionInput {
  activePipeline: ActivePipeline | undefined;
  getActiveEnvironmentVariables: () => Record<string, string>;
  initDebugSession: (
    pipeline: ActivePipeline,
    envVariables: Record<string, string>,
    options?: DebugSessionOptions
  ) => { valid: boolean; errors?: string[] };
  continueAll: () => Promise<void>;
  resetSession: () => void;
  setExecuting: (isExecuting: boolean) => void;
  setExecutionResult: (
    result: ReturnType<typeof usePipelineStore.getState>["executionResult"]
  ) => void;
  setView: (view: ReturnType<typeof usePipelineStore.getState>["currentView"]) => void;
  options: DebugSessionOptions;
  successLabel: string;
}

export async function runPipelineSession({
  activePipeline,
  getActiveEnvironmentVariables,
  initDebugSession,
  continueAll,
  resetSession,
  setExecuting,
  setExecutionResult,
  setView,
  options,
  successLabel,
}: RunPipelineSessionInput) {
  if (!activePipeline) return;

  setExecuting(true);
  setExecutionResult(null);
  resetSession();
  setView("stream");

  try {
    const init = initDebugSession(activePipeline, getActiveEnvironmentVariables(), options);
    if (!init.valid) {
      toast.error(`Validation failed: ${init.errors?.join(", ")}`);
      return;
    }

    await continueAll();
    const finalStatus = usePipelineRuntimeStore.getState().runtime.status;
    if (finalStatus === "failed") {
      toast.error("Pipeline execution completed with errors");
      return;
    }
    if (finalStatus === "aborted") {
      toast.info("Pipeline execution aborted");
      return;
    }
    toast.success(successLabel);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
  } finally {
    setExecuting(false);
  }
}
