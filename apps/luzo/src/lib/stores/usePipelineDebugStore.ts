import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { extractSignals, getDefaultSelectedSignals } from "@/lib/pipeline/context-signals";
import { usePipelineArtifactsStore } from "@/lib/stores/usePipelineArtifactsStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
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
  clearExecutionContext: () => void;
  setGeneratingReport: (generating: boolean) => void;
  setExportingPDF: (exporting: boolean) => void;
  markReportDirty: () => void;
  setEstimatedTokens: (tokens: number) => void;
  setAIProvider: (config: Partial<AIProviderConfig>) => void;
}

const INITIAL_REPORT_CONFIG: AIReportConfig = {
  tone: "technical",
  prompt: `Perform an exhaustive technical audit of the API pipeline as a Senior Infrastructure and Performance Engineer.
Analysis must follow this rigorous engineering structure:
Technical Overview: 2-3 sentences summarizing the protocol compliance, structural integrity, and overall pipeline orchestration health.
Performance & Latency: Detailed analysis of the latency profile, identifying specifically where P95/P99 spikes occurred and locating potential cold starts or database bottlenecks.
Request Analysis: For every request, provide a granular technical breakdown including status-code validity, response-time efficiency vs. historical expectations, and payload consistency.
System Insights: 3-5 high-impact technical highlights regarding the scalability, reliability, and potential technical debt observed in the execution flow.
Engineering Risks: Identify critical race conditions, resource exhaustion vulnerabilities, or security exposures found within the request logic.
Technical Remediation: Provide a prioritized roadmap of code-level next steps for engineering teams, including optimizations like caching, better indexing, or stricter schema validation.
Final Assessment: Conclude with a definitive statement on technical stability, production readiness, and the level of confidence in the pipeline's current architecture.`,
  selectedSignals: [],
  mode: "preview",
  length: "medium",
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
      const snapshots = usePipelineExecutionStore.getState().snapshots;
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
                .map((variable) => variable.path),
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

    clearExecutionContext: () =>
      set((state) => {
        state.signalGroups = [];
        state.selectedSignals = [];
        state.reportConfig.selectedSignals = [];
        state.estimatedTokens = 0;
      }),

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
  })),
);

usePipelineArtifactsStore.subscribe((state) => {
  usePipelineDebugStore.setState({ reportsByPipelineId: state.reportsByPipelineId });
});
