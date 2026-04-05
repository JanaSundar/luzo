"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { DebugController } from "@/lib/pipeline/debug-controller";
import { planPartialPipelineRun } from "@/lib/pipeline/partial-run";
import type { ArtifactInput } from "@/lib/pipeline/partial-run";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import type { Pipeline, PipelineExecutionResult, PipelineView } from "@/types";

interface ActionArgs {
  activePipeline: Pipeline | null;
  activePipelineId: string | null;
  controller: DebugController;
  originExecutionMode: "auto" | "debug";
  activeExecutionId: string | null;
  resetExecution: () => void;
  getActiveEnvironmentVariables: () => Record<string, string>;
  setExecuting: (executing: boolean) => void;
  setExecutionResult: (result: PipelineExecutionResult | null) => void;
  setView: (view: PipelineView) => void;
  clearReport: (pipelineId: string) => void;
  setSelectedSignals: (signals: string[]) => void;
}

export function usePipelinePageActions({
  activePipeline,
  activePipelineId,
  controller,
  originExecutionMode,
  activeExecutionId,
  resetExecution,
  getActiveEnvironmentVariables,
  setExecuting,
  setExecutionResult,
  setView,
  clearReport,
  setSelectedSignals,
}: ActionArgs) {
  const prepareRun = useCallback(() => {
    if (!activePipeline) return false;
    setExecutionResult(null);
    setView("stream");
    resetExecution();
    if (activePipelineId) {
      clearReport(activePipelineId);
      setSelectedSignals([]);
    }
    return true;
  }, [
    activePipeline,
    activePipelineId,
    clearReport,
    resetExecution,
    setExecutionResult,
    setSelectedSignals,
    setView,
  ]);

  const handleRun = useCallback(async () => {
    if (!activePipeline || !prepareRun()) return;
    setExecuting(true);
    const result = await controller.start(activePipeline, getActiveEnvironmentVariables(), {
      executionMode: "auto",
    });
    if (!result.valid) toast.error(`Validation failed: ${result.errors?.join(", ")}`);
    setExecuting(false);
  }, [activePipeline, controller, getActiveEnvironmentVariables, prepareRun, setExecuting]);

  const handleDebug = useCallback(async () => {
    if (!activePipeline || !prepareRun()) return;
    const result = await controller.start(activePipeline, getActiveEnvironmentVariables(), {
      executionMode: "debug",
    });
    if (!result.valid) {
      toast.error(`Validation failed: ${result.errors?.join(", ")}`);
      return;
    }
    toast.info("Debug mode started — use Step or Continue to execute");
  }, [activePipeline, controller, getActiveEnvironmentVariables, prepareRun]);

  const handleRunFromStep = useCallback(
    async (stepId: string, mode: "partial-previous" | "partial-fresh") => {
      if (!activePipeline) return;
      const artifact = usePipelineArtifactsStore
        .getState()
        .getExecutionArtifact(activePipeline.id) as ArtifactInput;
      const plan = planPartialPipelineRun({
        pipeline: activePipeline,
        startStepId: stepId,
        mode,
        artifact,
      });
      if (!plan.valid) {
        toast.error(plan.error);
        return;
      }
      if (!prepareRun()) return;
      setExecuting(true);
      const result = await controller.start(activePipeline, getActiveEnvironmentVariables(), {
        ...plan.options,
        executionMode: "auto",
      });
      if (!result.valid) toast.error(`Validation failed: ${result.errors?.join(", ")}`);
      setExecuting(false);
    },
    [activePipeline, controller, getActiveEnvironmentVariables, prepareRun, setExecuting],
  );

  return {
    handleRun,
    handleDebug,
    handleRunFromStep,
    handleStop: useCallback(() => {
      controller.stop();
      setExecuting(false);
    }, [controller, setExecuting]),
    handleRetry: useCallback(async () => {
      if (!activePipeline) return;

      const controllerState = (
        controller as DebugController & {
          __state?: { executionId: string | null; pipeline: Pipeline | null };
        }
      ).__state;

      const canRetryInPlace =
        controllerState?.pipeline?.id === activePipeline.id &&
        controllerState.executionId === activeExecutionId;

      if (canRetryInPlace) {
        await controller.retry();
        return;
      }

      const result = await controller.start(activePipeline, getActiveEnvironmentVariables(), {
        executionMode: originExecutionMode,
      });
      if (!result.valid) {
        toast.error(`Validation failed: ${result.errors?.join(", ")}`);
        return;
      }
      if (originExecutionMode === "debug") {
        toast.info("Debug mode started — use Step or Continue to execute");
      }
    }, [
      activeExecutionId,
      activePipeline,
      controller,
      getActiveEnvironmentVariables,
      originExecutionMode,
    ]),
    handleStep: useCallback(async () => {
      await controller.step();
    }, [controller]),
    handleResume: useCallback(async () => {
      await controller.resume();
    }, [controller]),
  };
}
