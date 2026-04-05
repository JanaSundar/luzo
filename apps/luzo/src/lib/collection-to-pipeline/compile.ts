import { createFlowDocumentFromSteps } from "@/features/flow-editor/domain/flow-document";
import { createPipelineRecord } from "@/lib/pipeline/createPipelineRecord";
import type { Pipeline, PipelineGenerationDraft } from "@/types";

export function compileDraftToPipeline(
  draft: PipelineGenerationDraft,
  name = `${draft.source.collectionName} Pipeline`,
): Pipeline {
  const pipeline = createPipelineRecord(name.trim() || "Generated Pipeline");
  const warnings = draft.steps.flatMap((step) => step.warnings).length;
  const unresolvedCount = draft.steps.reduce((count, step) => count + step.unresolved.length, 0);
  let stageIndex = 0;
  let previousGrouping: "parallel" | "sequential" | null = null;

  const steps = draft.steps.map((step) => ({
    ...step.request,
    id: step.id,
    name: step.generatedName,
  }));

  return {
    ...pipeline,
    description: `Generated from ${draft.source.collectionName}`,
    flow: createFlowDocumentFromSteps(steps),
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      source: draft.source,
      stepMappings: draft.steps.map((step) => {
        if (step.grouping !== previousGrouping || step.grouping === "sequential") {
          stageIndex += 1;
        }
        previousGrouping = step.grouping;
        return {
          grouping: step.grouping,
          sourceRequestId: step.sourceRequestId,
          stageIndex,
          stepId: step.id,
        };
      }),
      summary: {
        dependencyCount: draft.dependencies.filter((dependency) => dependency.applied).length,
        unresolvedCount,
        warningCount: warnings + draft.validation.errors.length,
      },
    },
    name: name.trim() || pipeline.name,
    steps,
  };
}
