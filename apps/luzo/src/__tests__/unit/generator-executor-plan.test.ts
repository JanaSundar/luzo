import { describe, expect, it } from "vitest";
import { processCompletion, promoteReadyNodes } from "@/features/pipeline/generator-executor-plan";
import type { CompiledPipelineNode } from "@/types/workflow";

function createNode(overrides: Partial<CompiledPipelineNode>): CompiledPipelineNode {
  return {
    nodeId: "node",
    kind: "request",
    orderIndex: 0,
    stageIndex: 0,
    dependencyIds: [],
    activationIds: [],
    downstreamIds: [],
    entry: false,
    routes: { control: [], success: [], failure: [], true: [], false: [] },
    runtimeRoutes: [],
    ...overrides,
  };
}

function createState(planNodeMap: Map<string, CompiledPipelineNode>) {
  const activatedDeps = new Map<string, Set<string>>();
  const completed = new Set<string>();
  const skipped = new Set<string>();
  const readyQueue: string[] = [];
  const queued = new Set<string>();
  const conditionResults = new Map<string, boolean>();

  return { activatedDeps, completed, conditionResults, planNodeMap, queued, readyQueue, skipped };
}

describe("generator executor branch handling", () => {
  it("queues only the true branch and skips the false subtree", () => {
    const planNodeMap = new Map<string, CompiledPipelineNode>([
      [
        "cond",
        createNode({
          nodeId: "cond",
          kind: "condition",
          routes: {
            control: [],
            success: [],
            failure: [],
            true: ["true-step"],
            false: ["false-step"],
          },
          downstreamIds: ["true-step", "false-step"],
        }),
      ],
      ["true-step", createNode({ nodeId: "true-step", dependencyIds: ["cond"] })],
      [
        "false-step",
        createNode({
          nodeId: "false-step",
          dependencyIds: ["cond"],
          routes: { control: ["false-child"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["false-child"],
        }),
      ],
      ["false-child", createNode({ nodeId: "false-child", dependencyIds: ["false-step"] })],
    ]);
    const state = createState(planNodeMap);

    processCompletion(
      { type: "condition_evaluated", snapshot: {} as never, result: true, runtimeVariables: {} },
      "cond",
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
      state.conditionResults,
    );
    promoteReadyNodes(
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
    );

    expect(state.readyQueue).toEqual(["true-step"]);
    expect(state.skipped.has("false-step")).toBe(true);
    expect(state.skipped.has("false-child")).toBe(true);
  });

  it("queues only the false branch when the condition fails", () => {
    const planNodeMap = new Map<string, CompiledPipelineNode>([
      [
        "cond",
        createNode({
          nodeId: "cond",
          kind: "condition",
          routes: {
            control: [],
            success: [],
            failure: [],
            true: ["true-step"],
            false: ["false-step"],
          },
          downstreamIds: ["true-step", "false-step"],
        }),
      ],
      [
        "true-step",
        createNode({
          nodeId: "true-step",
          dependencyIds: ["cond"],
          routes: { control: ["true-child"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["true-child"],
        }),
      ],
      ["true-child", createNode({ nodeId: "true-child", dependencyIds: ["true-step"] })],
      ["false-step", createNode({ nodeId: "false-step", dependencyIds: ["cond"] })],
    ]);
    const state = createState(planNodeMap);

    processCompletion(
      { type: "condition_evaluated", snapshot: {} as never, result: false, runtimeVariables: {} },
      "cond",
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
      state.conditionResults,
    );
    promoteReadyNodes(
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
    );

    expect(state.readyQueue).toEqual(["false-step"]);
    expect(state.skipped.has("true-step")).toBe(true);
    expect(state.skipped.has("true-child")).toBe(true);
  });

  it("queues only the failure route and skips the success subtree", () => {
    const planNodeMap = new Map<string, CompiledPipelineNode>([
      [
        "request-root",
        createNode({
          nodeId: "request-root",
          routes: {
            control: [],
            success: ["success-step"],
            failure: ["failure-step"],
            true: [],
            false: [],
          },
          downstreamIds: ["success-step", "failure-step"],
        }),
      ],
      [
        "success-step",
        createNode({
          nodeId: "success-step",
          dependencyIds: ["request-root"],
          routes: { control: ["success-child"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["success-child"],
        }),
      ],
      ["success-child", createNode({ nodeId: "success-child", dependencyIds: ["success-step"] })],
      ["failure-step", createNode({ nodeId: "failure-step", dependencyIds: ["request-root"] })],
    ]);
    const state = createState(planNodeMap);

    processCompletion(
      { type: "step_failed", snapshot: { stepId: "request-root" } as never, runtimeVariables: {} },
      "request-root",
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
      state.conditionResults,
    );
    promoteReadyNodes(
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
    );

    expect(state.readyQueue).toEqual(["failure-step"]);
    expect(state.skipped.has("success-step")).toBe(true);
    expect(state.skipped.has("success-child")).toBe(true);
  });

  it("queues only the success route and skips the failure subtree", () => {
    const planNodeMap = new Map<string, CompiledPipelineNode>([
      [
        "request-root",
        createNode({
          nodeId: "request-root",
          routes: {
            control: [],
            success: ["success-step"],
            failure: ["failure-step"],
            true: [],
            false: [],
          },
          downstreamIds: ["success-step", "failure-step"],
        }),
      ],
      ["success-step", createNode({ nodeId: "success-step", dependencyIds: ["request-root"] })],
      [
        "failure-step",
        createNode({
          nodeId: "failure-step",
          dependencyIds: ["request-root"],
          routes: { control: ["failure-child"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["failure-child"],
        }),
      ],
      ["failure-child", createNode({ nodeId: "failure-child", dependencyIds: ["failure-step"] })],
    ]);
    const state = createState(planNodeMap);

    processCompletion(
      {
        type: "step_completed",
        snapshot: { stepId: "request-root" } as never,
        runtimeVariables: {},
      },
      "request-root",
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
      state.conditionResults,
    );
    promoteReadyNodes(
      planNodeMap,
      state.activatedDeps,
      state.completed,
      state.skipped,
      state.readyQueue,
      state.queued,
    );

    expect(state.readyQueue).toEqual(["success-step"]);
    expect(state.skipped.has("failure-step")).toBe(true);
    expect(state.skipped.has("failure-child")).toBe(true);
  });
});
