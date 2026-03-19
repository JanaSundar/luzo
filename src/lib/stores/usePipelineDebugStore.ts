import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { extractSignals, getDefaultSelectedSignals } from "@/lib/pipeline/context-signals";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineRuntimeStore } from "@/lib/stores/usePipelineRuntimeStore";
import type { PipelineStep } from "@/types";
import type {
  AIProviderConfig,
  AIReportCache,
  AIReportConfig,
  SignalGroup,
} from "@/types/pipeline-debug";

interface DebugStore {
  signalGroups: SignalGroup[];
  selectedSignals: string[];
  showSensitive: boolean;
  reportConfig: AIReportConfig;
  reportsByPipelineId: Record<string, AIReportCache>;
  isReportDirty: boolean;
  isGeneratingReport: boolean;
  isExportingPDF: boolean;
  estimatedTokens: number;
  aiProvider: AIProviderConfig;
  refreshSignals: (steps: PipelineStep[]) => void;
  toggleSignal: (path: string) => void;
  toggleAllSignals: (selected: boolean) => void;
  setShowSensitive: (show: boolean) => void;
  setSelectedSignals: (signals: string[]) => void;
  setReportConfig: (partial: Partial<AIReportConfig>) => void;
  saveReport: (pipelineId: string, cache: AIReportCache) => void;
  getReport: (pipelineId: string | null) => AIReportCache | null;
  clearReport: (pipelineId: string) => void;
  setGeneratingReport: (generating: boolean) => void;
  setExportingPDF: (exporting: boolean) => void;
  markReportDirty: () => void;
  setEstimatedTokens: (tokens: number) => void;
  setAIProvider: (config: Partial<AIProviderConfig>) => void;
}

const INITIAL_REPORT_CONFIG: AIReportConfig = {
  tone: "technical",
  prompt: "Analyze the API pipeline execution and provide insights based on the selected signals.",
  selectedSignals: [],
  mode: "preview",
};

const INITIAL_AI_PROVIDER: AIProviderConfig = {
  provider: "openrouter",
  model: "meta-llama/llama-3.3-70b-instruct",
  apiKey: "",
};

export const usePipelineDebugStore = create<DebugStore>()(
  immer((set, get) => ({
    signalGroups: [],
    selectedSignals: [],
    showSensitive: false,
    reportConfig: { ...INITIAL_REPORT_CONFIG },
    reportsByPipelineId: usePipelineArtifactsStore.getState().reportsByPipelineId,
    isReportDirty: false,
    isGeneratingReport: false,
    isExportingPDF: false,
    estimatedTokens: 0,
    aiProvider: { ...INITIAL_AI_PROVIDER },

    refreshSignals: (steps) => {
      const snapshots = usePipelineRuntimeStore.getState().snapshots;
      const signalGroups = extractSignals(snapshots, steps);
      const selectedSignals = getDefaultSelectedSignals(signalGroups);

      set((state) => {
        state.signalGroups = signalGroups;
        state.selectedSignals = selectedSignals;
        state.reportConfig.selectedSignals = selectedSignals;
        state.isReportDirty = true;
      });
    },

    toggleSignal: (path) =>
      set((state) => {
        const nextSignals = state.selectedSignals.includes(path)
          ? state.selectedSignals.filter((entry) => entry !== path)
          : [...state.selectedSignals, path];
        state.selectedSignals = nextSignals;
        state.reportConfig.selectedSignals = nextSignals;
        state.isReportDirty = true;
      }),

    toggleAllSignals: (selected) =>
      set((state) => {
        state.selectedSignals = selected
          ? state.signalGroups.flatMap((group) =>
              group.variables
                .filter((variable) => state.showSensitive || variable.sensitivity !== "high")
                .map((variable) => variable.path)
            )
          : [];
        state.reportConfig.selectedSignals = [...state.selectedSignals];
        state.isReportDirty = true;
      }),

    setShowSensitive: (showSensitive) =>
      set((state) => {
        state.showSensitive = showSensitive;
      }),

    setSelectedSignals: (signals) =>
      set((state) => {
        state.selectedSignals = signals;
        state.reportConfig.selectedSignals = signals;
        state.isReportDirty = true;
      }),

    setReportConfig: (partial) =>
      set((state) => {
        Object.assign(state.reportConfig, partial);
        state.isReportDirty = true;
      }),

    saveReport: (pipelineId, cache) => {
      usePipelineArtifactsStore.getState().saveReportArtifact(pipelineId, cache);
      set((state) => {
        state.reportsByPipelineId[pipelineId] = cache;
        state.isReportDirty = false;
      });
    },

    getReport: (pipelineId) =>
      pipelineId ? (get().reportsByPipelineId[pipelineId] ?? null) : null,

    clearReport: (pipelineId) => {
      usePipelineArtifactsStore.getState().deleteReportArtifact(pipelineId);
    },

    setGeneratingReport: (generating) =>
      set((state) => {
        state.isGeneratingReport = generating;
      }),

    setExportingPDF: (exporting) =>
      set((state) => {
        state.isExportingPDF = exporting;
      }),

    markReportDirty: () =>
      set((state) => {
        state.isReportDirty = true;
      }),

    setEstimatedTokens: (tokens) =>
      set((state) => {
        state.estimatedTokens = tokens;
      }),

    setAIProvider: (config) =>
      set((state) => {
        Object.assign(state.aiProvider, config);
      }),
  }))
);

usePipelineArtifactsStore.subscribe((state) => {
  usePipelineDebugStore.setState({ reportsByPipelineId: state.reportsByPipelineId });
});
