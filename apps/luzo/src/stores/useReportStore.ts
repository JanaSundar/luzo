import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIndexedDbStorage } from "@/services/storage/zustand-indexeddb";
import type { NarrativeTone } from "@/types";
import type { NarrativeReport } from "@/types/pipeline-report";

export type StructuredReport = NarrativeReport;

interface ReportState {
  reports: Record<string, StructuredReport>; // key is id or pipelineId
  activeReportId: string | null;
  selectedTone: NarrativeTone;
  selectedSignals: string[];

  addReport: (report: StructuredReport) => void;
  setActiveReport: (id: string | null) => void;
  setTone: (tone: NarrativeTone) => void;
  setSignals: (signals: string[]) => void;
  deleteReport: (id: string) => void;
}

export const useReportStore = create<ReportState>()(
  persist(
    immer((set) => ({
      reports: {},
      activeReportId: null,
      selectedTone: "technical",
      selectedSignals: [],

      addReport: (report) =>
        set((state) => {
          // Use report.title or similar as ID if it doesn't have one,
          // but usually it's tied to pipelineId or a generated ID.
          // For now let's assume we use a random ID or pipelineId.
          const id = report.id || crypto.randomUUID();
          state.reports[id] = { ...report, id };
          state.activeReportId = id;
        }),

      setActiveReport: (id) =>
        set((state) => {
          state.activeReportId = id;
        }),

      setTone: (tone) =>
        set((state) => {
          state.selectedTone = tone;
        }),

      setSignals: (signals) =>
        set((state) => {
          state.selectedSignals = signals;
        }),

      deleteReport: (id) =>
        set((state) => {
          delete state.reports[id];
          if (state.activeReportId === id) {
            state.activeReportId = null;
          }
        }),
    })),
    {
      name: "luzo-report-store",
      storage: createJSONStorage(() => createIndexedDbStorage({ dbName: "luzo-reports" })),
    },
  ),
);
