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
    routes: {
      control: [],
      success: [],
      failure: [],
      true: [],
      false: [],
    },
    runtimeRoutes: [],
    ...overrides,
  };
}

describe("generator executor branch handling", () => {
  it("allows join nodes to run when the opposite condition branch subtree was skipped", () => {
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
          routes: { control: ["join-step"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["join-step"],
        }),
      ],
      [
        "false-step",
        createNode({
          nodeId: "false-step",
          dependencyIds: ["cond"],
          routes: { control: ["false-child"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["false-child"],
        }),
      ],
      [
        "false-child",
        createNode({
          nodeId: "false-child",
          dependencyIds: ["false-step"],
          routes: { control: ["join-step"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["join-step"],
        }),
      ],
      [
        "join-step",
        createNode({
          nodeId: "join-step",
          dependencyIds: ["true-step", "false-child"],
        }),
      ],
    ]);

    const activatedDeps = new Map<string, Set<string>>();
    const completed = new Set<string>();
    const skipped = new Set<string>();
    const readyQueue: string[] = [];
    const queued = new Set<string>();
    const conditionResults = new Map<string, boolean>();

    processCompletion(
      {
        type: "condition_evaluated",
        snapshot: {} as never,
        result: true,
        runtimeVariables: {},
      },
      "cond",
      planNodeMap,
      activatedDeps,
      completed,
      skipped,
      readyQueue,
      queued,
      conditionResults,
    );
    promoteReadyNodes(planNodeMap, activatedDeps, completed, skipped, readyQueue, queued);

    expect(readyQueue).toEqual(["true-step"]);
    expect(skipped.has("false-step")).toBe(true);
    expect(skipped.has("false-child")).toBe(true);

    readyQueue.length = 0;
    queued.clear();

    processCompletion(
      {
        type: "step_completed",
        snapshot: { stepId: "true-step" } as never,
        runtimeVariables: {},
      },
      "true-step",
      planNodeMap,
      activatedDeps,
      completed,
      skipped,
      readyQueue,
      queued,
      conditionResults,
    );
    promoteReadyNodes(planNodeMap, activatedDeps, completed, skipped, readyQueue, queued);

    expect(readyQueue).toEqual(["join-step"]);
  });

  it("allows join nodes to run when the opposite request branch subtree was skipped", () => {
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
      [
        "success-child",
        createNode({
          nodeId: "success-child",
          dependencyIds: ["success-step"],
          routes: { control: ["join-step"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["join-step"],
        }),
      ],
      [
        "failure-step",
        createNode({
          nodeId: "failure-step",
          dependencyIds: ["request-root"],
          routes: { control: ["join-step"], success: [], failure: [], true: [], false: [] },
          downstreamIds: ["join-step"],
        }),
      ],
      [
        "join-step",
        createNode({
          nodeId: "join-step",
          dependencyIds: ["success-child", "failure-step"],
        }),
      ],
    ]);

    const activatedDeps = new Map<string, Set<string>>();
    const completed = new Set<string>();
    const skipped = new Set<string>();
    const readyQueue: string[] = [];
    const queued = new Set<string>();
    const conditionResults = new Map<string, boolean>();

    processCompletion(
      {
        type: "step_failed",
        snapshot: { stepId: "request-root" } as never,
        runtimeVariables: {},
      },
      "request-root",
      planNodeMap,
      activatedDeps,
      completed,
      skipped,
      readyQueue,
      queued,
      conditionResults,
    );
    promoteReadyNodes(planNodeMap, activatedDeps, completed, skipped, readyQueue, queued);

    expect(readyQueue).toEqual(["failure-step"]);
    expect(skipped.has("success-step")).toBe(true);
    expect(skipped.has("success-child")).toBe(true);

    readyQueue.length = 0;
    queued.clear();

    processCompletion(
      {
        type: "step_completed",
        snapshot: { stepId: "failure-step" } as never,
        runtimeVariables: {},
      },
      "failure-step",
      planNodeMap,
      activatedDeps,
      completed,
      skipped,
      readyQueue,
      queued,
      conditionResults,
    );
    promoteReadyNodes(planNodeMap, activatedDeps, completed, skipped, readyQueue, queued);

    expect(readyQueue).toEqual(["join-step"]);
  });

  it("still waits for all active dependencies on non-branch joins", () => {
    const planNodeMap = new Map<string, CompiledPipelineNode>([
      ["step-a", createNode({ nodeId: "step-a", downstreamIds: ["join-step"] })],
      ["step-b", createNode({ nodeId: "step-b", downstreamIds: ["join-step"] })],
      [
        "join-step",
        createNode({
          nodeId: "join-step",
          dependencyIds: ["step-a", "step-b"],
        }),
      ],
    ]);

    const activatedDeps = new Map<string, Set<string>>();
    const completed = new Set<string>();
    const skipped = new Set<string>();
    const readyQueue: string[] = [];
    const queued = new Set<string>();
    const conditionResults = new Map<string, boolean>();

    processCompletion(
      {
        type: "step_completed",
        snapshot: { stepId: "step-a" } as never,
        runtimeVariables: {},
      },
      "step-a",
      planNodeMap,
      activatedDeps,
      completed,
      skipped,
      readyQueue,
      queued,
      conditionResults,
    );
    promoteReadyNodes(planNodeMap, activatedDeps, completed, skipped, readyQueue, queued);

    expect(readyQueue).toEqual([]);
  });
});
