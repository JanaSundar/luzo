import type { AnalyzeVariablesInput, VariableAnalysisOutput } from "@/types/worker-results";
import { buildLineageIndex } from "./buildLineageIndex";

export function analyzeVariables(input: AnalyzeVariablesInput): VariableAnalysisOutput {
  return buildLineageIndex(input);
}
