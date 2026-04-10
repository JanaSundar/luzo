"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { usePipelineLineage } from "@/features/pipelines/hooks/usePipelineLineage";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import type { PipelineStep } from "@/types";

export function UnresolvedVariablesPanel() {
  const { activePipelineId, pipelines } = usePipelineStore();
  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const variableOverrides = usePipelineExecutionStore((s) => s.variableOverrides);
  const currentStepIndex = usePipelineExecutionStore((s) => s.currentStepIndex);
  const status = usePipelineExecutionStore((s) => s.status);
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);

  const [unresolvedPaths, setUnresolvedPaths] = useState<string[]>([]);

  const pipeline = useMemo(
    () => pipelines.find((p) => p.id === activePipelineId),
    [pipelines, activePipelineId],
  );
  const envVars = useMemo(() => {
    const env = environments.find((entry) => entry.id === activeEnvironmentId);
    if (!env) return {};
    return Object.fromEntries(env.variables.filter((v) => v.enabled).map((v) => [v.key, v.value]));
  }, [environments, activeEnvironmentId]);
  const nextStep = pipeline?.steps[currentStepIndex] as PipelineStep | undefined;
  const lineageAnalysis = usePipelineLineage(
    pipeline ?? undefined,
    runtimeVariables as Record<string, unknown>,
    `unresolved:${nextStep?.id ?? "none"}`,
  );

  useEffect(() => {
    if (!pipeline || !nextStep) {
      setUnresolvedPaths((current) => (current.length === 0 ? current : []));
      return;
    }

    let active = true;
    Promise.resolve(lineageAnalysis)
      .then((analysis) => {
        if (!active || !analysis) return;

        const allUnresolved = analysis.edges
          .filter(
            (edge) => edge.consumerStepId === nextStep.id && edge.resolutionStatus !== "resolved",
          )
          .map((edge) => edge.rawRef);

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

        const nextPaths = Array.from(new Set(actuallyUnresolved)).sort();
        setUnresolvedPaths((current) =>
          current.length === nextPaths.length &&
          current.every((entry, index) => entry === nextPaths[index])
            ? current
            : nextPaths,
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pipeline, nextStep, envVars, runtimeVariables, lineageAnalysis]);

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
