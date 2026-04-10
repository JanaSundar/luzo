"use client";

import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { useEffect, useState } from "react";
import { analysisWorkerClient } from "@/workers/client/analysis-client";
import type { Result } from "@/types/worker-results";
export {
  filterSuggestions,
  getAutocompleteSuggestions,
} from "@/features/pipelines/autocomplete/suggestions";
export { progressiveValidate } from "@/features/pipelines/autocomplete/validation";

export function useVariableSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
): VariableSuggestion[] {
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const clientId = useState(() => crypto.randomUUID())[0];

  useEffect(() => {
    let active = true;
    analysisWorkerClient
      .callLatest(`autocomplete-${clientId}`, async (api) => {
        const result = (await api.buildVariableSuggestions({
          pipeline,
          currentStepId,
          envVars,
          executionContext,
        })) as Result<VariableSuggestion[]>;
        return result;
      })
      .then((res) => {
        if (active && res && res.ok) {
          setSuggestions(res.data);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [pipeline, currentStepId, envVars, executionContext]);

  return suggestions;
}
