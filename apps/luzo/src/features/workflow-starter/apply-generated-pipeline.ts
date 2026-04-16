import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import type { Pipeline } from "@/types";

interface ApplyGeneratedPipelineInput {
  activePipeline: Pipeline | null;
  generatedPipeline: Pipeline;
  insertPipeline: (pipeline: Pipeline) => void;
  setSelectedNodeId: (pipelineId: string, nodeId: string | null) => void;
  setView: (view: "builder" | "ai-config" | "report") => void;
  updatePipeline: (id: string, partial: Partial<Pipeline>) => void;
}

export function applyGeneratedPipeline({
  activePipeline,
  generatedPipeline,
  insertPipeline,
  setSelectedNodeId,
  setView,
  updatePipeline,
}: ApplyGeneratedPipelineInput) {
  const shouldReplace = isPipelineWorkspaceBlank(activePipeline);
  const pipelineToActivate = shouldReplace
    ? rekeyPipelineForWorkspace(activePipeline!, generatedPipeline)
    : generatedPipeline;

  if (shouldReplace && activePipeline) {
    updatePipeline(activePipeline.id, {
      createdAt: pipelineToActivate.createdAt,
      description: pipelineToActivate.description,
      flowDocument: pipelineToActivate.flowDocument,
      generationMetadata: pipelineToActivate.generationMetadata,
      name: pipelineToActivate.name,
      narrativeConfig: pipelineToActivate.narrativeConfig,
      steps: pipelineToActivate.steps,
      updatedAt: pipelineToActivate.updatedAt,
    });
  } else {
    insertPipeline(pipelineToActivate);
  }

  setView("builder");
  setSelectedNodeId(pipelineToActivate.id, getFirstActionableNodeId(pipelineToActivate));

  return pipelineToActivate;
}

export function isPipelineWorkspaceBlank(pipeline: Pipeline | null) {
  if (!pipeline) return false;
  return pipeline.steps.length === 0 && !pipeline.description?.trim();
}

export function getFirstActionableNodeId(pipeline: Pipeline) {
  return (
    pipeline.steps[0]?.id ??
    pipeline.flowDocument?.nodes.find((node) => node.kind !== "start")?.id ??
    null
  );
}

function rekeyPipelineForWorkspace(target: Pipeline, generated: Pipeline): Pipeline {
  const updatedAt = new Date().toISOString();
  const flowDocument = generated.flowDocument
    ? {
        ...generated.flowDocument,
        createdAt: target.createdAt,
        id: target.id,
        name: generated.name,
        nodes: generated.flowDocument.nodes.map((node) =>
          node.kind === "start" ? { ...node, id: `${target.id}:start` } : node,
        ),
        updatedAt,
      }
    : undefined;

  const nextPipeline = {
    ...generated,
    createdAt: target.createdAt,
    flowDocument,
    id: target.id,
    updatedAt,
  };

  return {
    ...nextPipeline,
    flowDocument: ensurePipelineFlowDocument(nextPipeline),
  };
}
