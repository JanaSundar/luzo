import type { GeneratorYield, StepSnapshot } from "@/types/pipeline-runtime";
import { buildYield } from "./generator-executor-shared";
import type { RoutingDecision } from "./generator-flow-routing";

export function attachRouteDecisionToYield(params: {
  nodeId: string;
  routingDecision: RoutingDecision | null;
  snapshots: StepSnapshot[];
  yielded: GeneratorYield;
}): GeneratorYield {
  if (
    !params.routingDecision ||
    (params.yielded.type !== "step_complete" && params.yielded.type !== "error")
  ) {
    return params.yielded;
  }

  const nextSnapshot: StepSnapshot = {
    ...params.yielded.snapshot,
    routeDecision: params.routingDecision,
  };
  replaceSnapshotByStepId(params.snapshots, params.nodeId, nextSnapshot);

  return buildYield(params.yielded.type, nextSnapshot, params.snapshots) as Extract<
    GeneratorYield,
    { type: "step_complete" | "error" }
  >;
}

export function getSnapshotByStepId(snapshots: StepSnapshot[], stepId: string) {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    if (snapshots[index]?.stepId === stepId) return snapshots[index];
  }
  return null;
}

export function replaceSnapshotByStepId(
  snapshots: StepSnapshot[],
  stepId: string,
  nextSnapshot: StepSnapshot,
) {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    if (snapshots[index]?.stepId === stepId) {
      snapshots[index] = nextSnapshot;
      return;
    }
  }
}
