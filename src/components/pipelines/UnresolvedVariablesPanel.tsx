"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import type { PipelineStep } from "@/types";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { analysisWorkerClient } from "@/workers/client/analysis-client";
import type { Result, VariableAnalysisOutput } from "@/types/worker-results";

export function UnresolvedVariablesPanel() {
  const { activePipelineId, pipelines } = usePipelineStore();
  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const variableOverrides = usePipelineExecutionStore((s) => s.variableOverrides);
  const currentStepIndex = usePipelineExecutionStore((s) => s.currentStepIndex);
  const status = usePipelineExecutionStore((s) => s.status);
  const getActiveEnvironmentVariables = useEnvironmentStore((s) => s.getActiveEnvironmentVariables);

  const [unresolvedPaths, setUnresolvedPaths] = useState<string[]>([]);

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === activePipelineId),
    [pipelines, activePipelineId],
  );
  const envVars = getActiveEnvironmentVariables();
  const nextStep = pipeline?.steps[currentStepIndex] as PipelineStep | undefined;

  useEffect(() => {
    if (!pipeline || !nextStep) {
      setUnresolvedPaths([]);
      return;
    }

    let active = true;
    const bundle = buildWorkflowBundleFromPipeline(pipeline);

    analysisWorkerClient
      .callLatest("unresolved-panel", async (api) => {
        const result = (await api.analyzeVariables({
          workflow: bundle.workflow,
          registry: bundle.registry,
        })) as Result<VariableAnalysisOutput>;
        return result;
      })
      .then((res) => {
        if (!active || !res || !res.ok) return;

        // Extract unresolved paths from the analysis
        const allUnresolved = res.data.unresolved
          .filter((ref) => ref.nodeId === nextStep.id)
          .map((ref) => ref.rawRef);

        const actuallyUnresolved = allUnresolved.filter((path) => {
          // It's resolved if it's in runtime variables
          let current: unknown = runtimeVariables;
          let foundInRuntime = false;
          if (path.includes(".")) {
            // Very simple path check for runtime array/object
            const parts = path.split(".");
            for (const part of parts) {
              if (current == null || typeof current !== "object") {
                foundInRuntime = false;
                break;
              }
              current = (current as Record<string, unknown>)[part];
              foundInRuntime = current !== undefined;
            }
          } else {
            foundInRuntime = (runtimeVariables as Record<string, unknown>)[path] !== undefined;
          }

          if (foundInRuntime) return false;

          // Or if it's in envVars
          if (envVars[path] !== undefined) return false;

          return true;
        });

        setUnresolvedPaths(Array.from(new Set(actuallyUnresolved)).sort());
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pipeline, nextStep, envVars, runtimeVariables]);

  const showPanel = status === "paused" && nextStep && unresolvedPaths.length > 0;

  if (!showPanel) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <h3 className="text-sm font-semibold">Unresolved variables for next step</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter values for variables that will be used when you continue. These override any runtime
        values.
      </p>
      <div className="space-y-2">
        {unresolvedPaths.map((path) => (
          <div key={path} className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground shrink-0 min-w-0 truncate max-w-[200px]">
              {`{{${path}}}`}
            </code>
            <Input
              value={variableOverrides?.[path] ?? ""}
              onChange={(e) =>
                usePipelineExecutionStore.getState().setVariableOverride(path, e.target.value)
              }
              placeholder="Enter value..."
              className="h-8 text-sm flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
