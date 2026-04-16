import { beforeEach, describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { usePipelineArtifactsStore } from "@/stores/usePipelineArtifactsStore";
import type { PinnedBaselineArtifact } from "@/types/pipeline-debug";

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
})();

describe("usePipelineArtifactsStore baselines", () => {
  beforeEach(() => {
    usePipelineArtifactsStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });
    memoryStorage.clear();
    usePipelineArtifactsStore.setState({
      baselineByPipelineId: {},
      debuggerByPipelineId: {},
      executionByPipelineId: {},
      reportsByPipelineId: {},
    });
  });

  it("pins, replaces, and clears a baseline artifact", () => {
    const first = makeBaseline("2026-04-15T00:00:00.000Z");
    const second = makeBaseline("2026-04-16T00:00:00.000Z");

    usePipelineArtifactsStore.getState().saveBaselineArtifact("pipeline-1", first);
    expect(usePipelineArtifactsStore.getState().getBaselineArtifact("pipeline-1")).toEqual(first);

    usePipelineArtifactsStore.getState().saveBaselineArtifact("pipeline-1", second);
    expect(usePipelineArtifactsStore.getState().getBaselineArtifact("pipeline-1")).toEqual(second);

    usePipelineArtifactsStore.getState().clearBaselineArtifact("pipeline-1");
    expect(usePipelineArtifactsStore.getState().getBaselineArtifact("pipeline-1")).toBeNull();
  });

  it("persists baselines into local storage payloads", async () => {
    const baseline = makeBaseline("2026-04-15T00:00:00.000Z");
    usePipelineArtifactsStore.getState().saveBaselineArtifact("pipeline-1", baseline);
    await Promise.resolve();

    const persisted = memoryStorage.getItem("pipeline-artifacts-store");
    expect(persisted).toBeTruthy();
    expect(persisted).toContain("baselineByPipelineId");
    expect(persisted).toContain("pipeline-1");
    expect(persisted).toContain(baseline.sourceGeneratedAt);
  });
});

function makeBaseline(sourceGeneratedAt: string): PinnedBaselineArtifact {
  return {
    artifact: {
      generatedAt: sourceGeneratedAt,
      pipelineId: "pipeline-1",
      pipelineStructureHash: "pipeline_hash",
      runtime: {
        completedAt: sourceGeneratedAt,
        mode: "full",
        reusedAliases: [],
        staleContextWarning: null,
        startStepId: null,
      },
      stepContextByAlias: {},
      steps: [],
      warnings: [],
    },
    note: null,
    pinnedAt: sourceGeneratedAt,
    sourceGeneratedAt,
  };
}
