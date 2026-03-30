"use client";

import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { useEffect, useState } from "react";
import { analysisWorkerClient } from "@/workers/client/analysis-client";
import type { Result } from "@/types/worker-results";
import { usePipelineStore } from "@/stores/usePipelineStore";
export {
  filterSuggestions,
  getAutocompleteSuggestions,
  progressiveValidate,
} from "./autocomplete-core";

export function useVariableSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
): VariableSuggestion[] {
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const clientId = useState(() => crypto.randomUUID())[0];
  const subflowDefinitions = usePipelineStore((state) => state.subflowDefinitions);

  useEffect(() => {
    let active = true;
    analysisWorkerClient
      .callLatest(`autocomplete-${clientId}`, async (api) => {
        const result = (await api.buildVariableSuggestions({
          pipeline,
          currentStepId,
          envVars,
          executionContext,
          subflowDefinitions,
        })) as Result<VariableSuggestion[]>;
        return result;
      })
      .then((res) => {
        if (active && res && res.ok) {
          setSuggestions(res.data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pipeline, currentStepId, envVars, executionContext, subflowDefinitions]);

  return suggestions;
}
