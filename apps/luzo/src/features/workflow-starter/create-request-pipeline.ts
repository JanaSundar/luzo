import { createPipelineRecord } from "@/features/pipeline/createPipelineRecord";
import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import type { ApiRequest, GenerationSourceMetadata, Pipeline } from "@/types";

export function createRequestPipeline(params: {
  name: string;
  request: ApiRequest;
  source: GenerationSourceMetadata;
}) {
  const pipeline = createPipelineRecord(params.name.trim() || "Starter Pipeline");
  const stepId = crypto.randomUUID();
  const nextPipeline: Pipeline = {
    ...pipeline,
    description: `Generated from ${params.source.label}`,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      source: params.source,
      stepMappings: [
        {
          grouping: "sequential",
          sourceRequestId: stepId,
          stageIndex: 1,
          stepId,
        },
      ],
      summary: {
        dependencyCount: 0,
        unresolvedCount: 0,
        warningCount: 0,
      },
    },
    steps: [
      {
        ...params.request,
        id: stepId,
        name: inferRequestName(params.request),
      },
    ],
  };

  return {
    ...nextPipeline,
    flowDocument: ensurePipelineFlowDocument(nextPipeline),
  };
}

function inferRequestName(request: ApiRequest) {
  const pathname = request.url.split("?")[0]?.split("/").filter(Boolean).at(-1);
  if (!pathname) return `${request.method} Request`;
  return `${request.method} ${pathname.replace(/[-_]/g, " ")}`.replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );
}
