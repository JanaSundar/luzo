import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { getAutocompleteSuggestions } from "@/features/pipelines/autocomplete/suggestions";

export function getFlowNodeAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  nodeId: string,
  envVars: Record<string, string>,
  runtimeVariables: Record<string, unknown>,
): VariableSuggestion[] {
  if (!pipeline) return [];
  return getAutocompleteSuggestions(pipeline, nodeId, envVars, runtimeVariables);
}
