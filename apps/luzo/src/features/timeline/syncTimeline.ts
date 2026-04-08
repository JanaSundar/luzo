import { snapshotsToTimelineEvents } from "@/features/pipeline/timeline/event-adapter";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { Pipeline } from "@/types";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { RequestDefinition, TimelineIndex, WorkflowNode } from "@/types/workflow";
import { buildTimelineIndex } from "./buildTimelineIndex";

export interface SyncTimelineInput {
  snapshots: StepSnapshot[];
  executionId: string;
  pipeline: Pipeline;
}

export function syncTimeline(input: SyncTimelineInput): TimelineIndex {
  const { snapshots, executionId, pipeline } = input;
  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  const compiled = compileExecutionPlan({
    workflow: bundle.workflow,
    registry: bundle.registry,
  });
  const layoutMap = new Map(
    compiled.plan.nodes.map((node) => [
      node.nodeId,
      {
        depth: node.stageIndex,
        groupLabel:
          (compiled.plan.stages[node.stageIndex]?.nodeIds.length ?? 0) > 1
            ? `Parallel group ${node.stageIndex + 1}`
            : `Stage ${node.stageIndex + 1}`,
        mode:
          (compiled.plan.stages[node.stageIndex]?.nodeIds.length ?? 0) > 1
            ? ("parallel" as const)
            : ("sequential" as const),
        parallelGroup: (compiled.plan.stages[node.stageIndex]?.nodeIds.length ?? 0) > 1,
        detail:
          node.dependencyIds.length > 0
            ? `Waits for ${node.dependencyIds.join(", ")}`
            : "No upstream dependencies detected.",
      },
    ]),
  );
  const displayNameByNodeId = new Map(
    bundle.workflow.nodes.map((node) => [
      node.id,
      resolveWorkflowNodeDisplayName(node, bundle.registry.requests[node.requestRef ?? ""]),
    ]),
  );

  const events = snapshotsToTimelineEvents(
    snapshots,
    executionId,
    layoutMap,
    compiled.plan.nodes,
    displayNameByNodeId,
  );

  return buildTimelineIndex({
    executionId,
    events,
  });
}

function resolveWorkflowNodeDisplayName(node: WorkflowNode, request?: RequestDefinition) {
  if (node.kind === "request") {
    return request?.name ?? node.config?.label ?? "Request";
  }

  if (node.kind === "condition" && node.config?.kind === "condition") {
    return node.config.label || "Condition";
  }

  if (node.kind === "start" && node.config?.kind === "start") {
    return node.config.label || "Start";
  }

  return node.config?.label ?? node.kind;
}
