"use client";

import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { extractVariableRefs, getByPath } from "@/lib/pipeline/variable-resolver";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import type { PipelineStep } from "@/types";

function collectTemplateStrings(step: PipelineStep): string[] {
  const strings: string[] = [step.url ?? ""];
  for (const h of step.headers ?? []) {
    strings.push(h.key, h.value);
  }
  for (const p of step.params ?? []) {
    strings.push(p.key, p.value);
  }
  if (step.body) strings.push(step.body);
  for (const f of step.formDataFields ?? []) {
    if (f.type === "text") strings.push(f.key, f.value);
  }
  return strings;
}

function getUnresolvedPaths(
  step: PipelineStep,
  runtimeVariables: Record<string, unknown>,
  envVariables: Record<string, string>,
): string[] {
  const allRefs = new Set<string>();
  for (const s of collectTemplateStrings(step)) {
    for (const path of extractVariableRefs(s)) {
      allRefs.add(path);
    }
  }

  const unresolved: string[] = [];
  for (const path of allRefs) {
    const runtimeValue = getByPath(runtimeVariables, path);
    if (runtimeValue !== undefined) continue;
    const envValue = envVariables[path];
    if (envValue !== undefined) continue;
    unresolved.push(path);
  }
  return unresolved.sort();
}

export function UnresolvedVariablesPanel() {
  const { activePipelineId, pipelines } = usePipelineStore();
  const runtimeVariables = usePipelineExecutionStore((s) => s.runtimeVariables);
  const variableOverrides = usePipelineExecutionStore((s) => s.variableOverrides);
  const currentStepIndex = usePipelineExecutionStore((s) => s.currentStepIndex);
  const status = usePipelineExecutionStore((s) => s.status);
  const getActiveEnvironmentVariables = useEnvironmentStore((s) => s.getActiveEnvironmentVariables);

  const { nextStep, unresolvedPaths } = useMemo(() => {
    const pipeline = pipelines.find((p) => p.id === activePipelineId);
    const envVars = getActiveEnvironmentVariables();
    const nextIndex = currentStepIndex;
    const nextStep = pipeline?.steps[nextIndex] as PipelineStep | undefined;

    if (!nextStep) {
      return { nextStep: undefined, unresolvedPaths: [] as string[] };
    }

    const unresolved = getUnresolvedPaths(nextStep, runtimeVariables, envVars);
    return { nextStep, unresolvedPaths: unresolved };
  }, [
    activePipelineId,
    pipelines,
    currentStepIndex,
    runtimeVariables,
    getActiveEnvironmentVariables,
  ]);

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
