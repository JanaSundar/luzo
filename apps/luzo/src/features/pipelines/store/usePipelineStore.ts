import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ensurePipelineFlowDocument } from "@/features/pipeline/canvas-flow";
import { createIndexedDbStorage } from "@/services/storage/zustand-indexeddb";

import type { PipelineStore } from "./types";
import { createExecutionSlice } from "./slices/executionSlice";
import { createNodeSlice } from "./slices/nodeSlice";
import { createPipelineSlice } from "./slices/pipelineSlice";
import { createStepSlice } from "./slices/stepSlice";
import { createSubflowSlice } from "./slices/subflowSlice";

export const usePipelineStore = create<PipelineStore>()(
  persist(
    immer((...a) => ({
      ...createPipelineSlice(...a),
      ...createStepSlice(...a),
      ...createNodeSlice(...a),
      ...createSubflowSlice(...a),
      ...createExecutionSlice(...a),
    })),
    {
      name: "luzo-collections-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-collections" })),
      version: 2,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<PipelineStore> | undefined;
        if (!persisted) {
          return persistedState as PipelineStore;
        }

        return {
          ...persisted,
          pipelines: (persisted.pipelines ?? []).map((pipeline) => ({
            ...pipeline,
            flowDocument: ensurePipelineFlowDocument(pipeline),
          })),
          subflowDefinitions: persisted.subflowDefinitions ?? [],
        } as PipelineStore;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<PipelineStore>) };
        if (!merged.pipelines) return merged;
        return {
          ...merged,
          pipelines: merged.pipelines.map((pipeline) => ({
            ...pipeline,
            flowDocument: ensurePipelineFlowDocument(pipeline),
          })),
        };
      },
      partialize: (state) => ({
        pipelines: state.pipelines,
        subflowDefinitions: state.subflowDefinitions,
        activePipelineId: state.activePipelineId,
      }),
    },
  ),
);
