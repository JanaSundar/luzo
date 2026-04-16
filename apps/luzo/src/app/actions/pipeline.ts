"use server";

import { generatePipelineNarrative as generateNarrative } from "@/server/ai/generate-pipeline-narrative";
import type { AINarrativeConfig, PipelineExecutionResult } from "@/types";
import type { AIProviderConfig } from "@/server/ai/generate-pipeline-narrative";

export async function generatePipelineNarrative(
  result: PipelineExecutionResult,
  config: AINarrativeConfig,
  provider?: AIProviderConfig,
) {
  return generateNarrative(result, config, provider);
}
