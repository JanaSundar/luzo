import { snapshotsToTimelineEvents } from "@/features/pipeline/timeline/event-adapter";
import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { Pipeline } from "@/types";
import type { StepSnapshot } from "@/types/pipeline-runtime";
import type { TimelineIndex } from "@/types/workflow";
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

  const events = snapshotsToTimelineEvents(snapshots, executionId, layoutMap, compiled.plan.nodes);

  return buildTimelineIndex({
    executionId,
    events,
  });
}
