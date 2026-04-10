import type { PipelineSliceCreator, ExecutionSlice } from "../types";

export const createExecutionSlice: PipelineSliceCreator<ExecutionSlice> = (set) => ({
  executing: false,
  executionResult: null,
  setExecuting: (executing) => set({ executing }),
  setExecutionResult: (executionResult) => set({ executionResult }),
});
