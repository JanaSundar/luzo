"use client";

import { useEffect, useMemo, useState } from "react";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { analysisWorkerClient } from "@/workers/client/analysis-client";
import type { Pipeline } from "@/types";
import type { Result, VariableAnalysisOutput } from "@/types/worker-results";

export function usePipelineLineage(
  pipeline: Pipeline | null | undefined,
  executionContext?: Record<string, unknown>,
  requestKey = "default",
) {
  const [analysis, setAnalysis] = useState<VariableAnalysisOutput | null>(null);

  const signature = useMemo(() => {
    if (!pipeline) return null;
    return JSON.stringify({
      id: pipeline.id,
      requestKey,
      updatedAt: pipeline.updatedAt,
      flow: pipeline.flowDocument,
      steps: pipeline.steps.map((step) => ({
        id: step.id,
        name: step.name,
        method: step.method,
        url: step.url,
        headers: step.headers,
        params: step.params,
        body: step.body,
        auth: step.auth,
      })),
    });
  }, [pipeline, requestKey]);

  const executionContextSignature = useMemo(
    () => JSON.stringify(executionContext ?? null),
    [executionContext],
  );

  useEffect(() => {
    if (!pipeline || !signature) {
      setAnalysis(null);
      return;
    }

    let active = true;
    const bundle = buildWorkflowBundleFromPipeline(pipeline);

    analysisWorkerClient
      .callLatest(`lineage:${pipeline.id}:${requestKey}`, async (api) => {
        const result = (await api.analyzeVariables({
          workflow: bundle.workflow,
          registry: bundle.registry,
          executionContext,
        })) as Result<VariableAnalysisOutput>;
        return result;
      })
      .then((result) => {
        if (!active || !result?.ok) return;
        setAnalysis(result.data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pipeline, signature, executionContextSignature]);

  return analysis;
}
