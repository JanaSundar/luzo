import { executeRequest } from "@/app/actions/api-tests";
import type { Pipeline, PipelineExecutionResult, PipelineStep, StepExecutionResult } from "@/types";
import { interpolatePipelineVariables } from "../utils/pipeline-variables";

export interface ExecutionUpdate {
  type: "step_start" | "step_end" | "pipeline_end" | "error" | "aborted";
  stepId?: string;
  result?: StepExecutionResult;
  pipelineResult?: PipelineExecutionResult;
  error?: string;
}

export async function executePipeline(
  pipeline: Pipeline,
  envVariables: Record<string, string>,
  onUpdate?: (update: ExecutionUpdate) => void,
  signal?: AbortSignal
): Promise<PipelineExecutionResult> {
  const startTime = new Date().toISOString();
  const results: StepExecutionResult[] = [];
  const executionContext: Record<string, unknown> = {};

  const pipelineResult: PipelineExecutionResult = {
    pipelineId: pipeline.id,
    startTime,
    results,
    status: "running",
  };

  try {
    for (const step of pipeline.steps) {
      // Check abort before starting each step
      if (signal?.aborted) {
        pipelineResult.status = "failed";
        pipelineResult.error = "Pipeline execution was aborted";
        pipelineResult.endTime = new Date().toISOString();
        onUpdate?.({ type: "aborted", pipelineResult });
        return pipelineResult;
      }

      onUpdate?.({ type: "step_start", stepId: step.id });

      // 1. Interpolate variables for this step using the current execution context
      const interpolatedStep = interpolateStep(step, envVariables, executionContext);

      // 2. Execute the request via Server Action (bypasses CORS)
      const response = await executeRequest(interpolatedStep, envVariables);

      // Check abort after request completes
      if (signal?.aborted) {
        pipelineResult.status = "failed";
        pipelineResult.error = "Pipeline execution was aborted";
        pipelineResult.endTime = new Date().toISOString();
        onUpdate?.({ type: "aborted", pipelineResult });
        return pipelineResult;
      }

      // 3. Process and store results
      const stepResult: StepExecutionResult = {
        ...response,
        stepId: step.id,
        stepName: step.name,
        method: interpolatedStep.method,
        url: interpolatedStep.url,
      };

      results.push(stepResult);

      // 4. Update core execution context for future steps
      let bodyData = response.body;
      try {
        bodyData = JSON.parse(response.body);
      } catch {
        // Not JSON, keep as string
      }

      executionContext[step.id] = {
        response: {
          status: response.status,
          headers: response.headers,
          body: bodyData,
        },
      };

      onUpdate?.({ type: "step_end", stepId: step.id, result: stepResult, pipelineResult });
    }

    pipelineResult.status = "completed";
    pipelineResult.endTime = new Date().toISOString();
    onUpdate?.({ type: "pipeline_end", pipelineResult });
    return pipelineResult;
  } catch (error: unknown) {
    if (signal?.aborted) {
      pipelineResult.status = "failed";
      pipelineResult.error = "Pipeline execution was aborted";
      pipelineResult.endTime = new Date().toISOString();
      onUpdate?.({ type: "aborted", pipelineResult });
      return pipelineResult;
    }

    const finalError = error instanceof Error ? error.message : "Pipeline execution failed";
    pipelineResult.status = "failed";
    pipelineResult.error = finalError;
    pipelineResult.endTime = new Date().toISOString();
    onUpdate?.({ type: "error", error: finalError, pipelineResult });
    return pipelineResult;
  }
}

function interpolateStep(
  step: PipelineStep,
  envVariables: Record<string, string>,
  context: Record<string, unknown>
): PipelineStep {
  const interpolate = (val: string) => interpolatePipelineVariables(val, envVariables, context);

  // Deep clone and interpolate key fields
  const interpolated: PipelineStep = {
    ...step,
    url: interpolate(step.url),
    headers: step.headers.map((h) => ({
      ...h,
      key: interpolate(h.key),
      value: interpolate(h.value),
    })),
    params: step.params.map((p) => ({
      ...p,
      key: interpolate(p.key),
      value: interpolate(p.value),
    })),
    body: step.body ? interpolate(step.body) : step.body,
  };

  return interpolated;
}
