import "@testing-library/jest-dom";
import { vi } from "vitest";
import "@/features/immer/init";
import type {
  AnalysisWorkerApi,
  GraphWorkerApi,
  ImportWorkerApi,
  JsonWorkerApi,
  TimelineWorkerApi,
} from "@/types/workers";
import type { JsonDocumentModel } from "@/features/json-view/buildJsonDocument";

class MockWorker {
  onmessage: ((ev: MessageEvent) => any) | null = null;
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

vi.stubGlobal("Worker", MockWorker);

vi.mock("@/workers/client/json-client", () => ({
  jsonWorkerClient: {
    callLatest: vi.fn(async (_key: string, invoke: (api: JsonWorkerApi) => Promise<unknown>) => {
      const mockApi: Partial<JsonWorkerApi> = {
        tryBuildJsonDocument: async ({ text }: { text: string }) => {
          let formattedText = text;
          try {
            formattedText = JSON.stringify(JSON.parse(text), null, 2);
          } catch {
            // ignore
          }

          const lines: import("@/features/json-view/buildJsonDocument").JsonLineMeta[] =
            formattedText.split("\n").map((line, index) => ({
              lineNumber: index + 1,
              text: line,
              path: "$",
              ancestors: [],
              searchText: line,
            }));
          return {
            ok: true,
            data: { formattedText, lines, nodes: {} } as JsonDocumentModel,
          };
        },
      };
      return invoke(mockApi as JsonWorkerApi);
    }),
    get: vi.fn(),
    dispose: vi.fn(),
  },
}));

vi.mock("@/workers/client/graph-client", () => ({
  graphWorkerClient: {
    callLatest: vi.fn(async (_key: string, invoke: (api: GraphWorkerApi) => Promise<unknown>) => {
      const mockApi: Partial<GraphWorkerApi> = {
        compileExecutionPlan: async () => ({
          ok: true,
          data: {
            plan: {
              kind: "execution-plan",
              version: 1,
              workflowId: "test",
              nodes: [],
              stages: [],
              order: [],
              adjacency: {},
              reverseAdjacency: {},
            },
            warnings: [],
            aliases: [],
          },
        }),
        validateWorkflowDag: async () => ({
          ok: true,
          data: {
            valid: true,
            errors: [],
            order: [],
            stages: [],
            adjacency: {},
            reverseAdjacency: {},
            unreachableNodeIds: [],
          },
        }),
      };
      return invoke(mockApi as GraphWorkerApi);
    }),
  },
}));

vi.mock("@/workers/client/timeline-client", () => ({
  timelineWorkerClient: {
    callLatest: vi.fn(
      async (_key: string, invoke: (api: TimelineWorkerApi) => Promise<unknown>) => {
        const mockApi: Partial<TimelineWorkerApi> = {
          syncTimeline: async () => ({
            ok: true,
            data: {
              executionId: "test",
              byId: {},
              orderedEventIds: [],
              byStepId: {},
              byStatus: {
                pending: [],
                ready: [],
                queued: [],
                running: [],
                success: [],
                warning: [],
                error: [],
                aborted: [],
                skipped: [],
                paused: [],
                completed: [],
                failed: [],
                retried: [],
              },
              byBranchId: {},
              byAttempt: {},
              timeBounds: { min: null, max: null },
            },
          }),
        };
        return invoke(mockApi as TimelineWorkerApi);
      },
    ),
  },
}));

vi.mock("@/workers/client/analysis-client", () => ({
  analysisWorkerClient: {
    callLatest: vi.fn(
      async (_key: string, invoke: (api: AnalysisWorkerApi) => Promise<unknown>) => {
        const mockApi: Partial<AnalysisWorkerApi> = {
          rebuildRuntimeVariables: async () => ({
            ok: true,
            data: {},
          }),
          analyzeVariables: async () => ({
            ok: true,
            data: {
              references: [],
              unresolved: [],
              aliases: [],
              reverseDependencies: {},
            },
          }),
        };
        return invoke(mockApi as AnalysisWorkerApi);
      },
    ),
    get: vi.fn(async () => ({
      rebuildRuntimeVariables: async () => ({ ok: true, data: {} }),
    })),
  },
}));

vi.mock("@/workers/client/import-client", () => ({
  importWorkerClient: {
    callLatest: vi.fn(async (_key: string, invoke: (api: ImportWorkerApi) => Promise<unknown>) => {
      const mockApi: Partial<ImportWorkerApi> = {
        parseImportSource: async () => ({
          ok: true,
          data: {
            steps: [],
            collection: { id: "test", name: "test", createdAt: "", updatedAt: "" },
          },
        }),
      };
      return invoke(mockApi as ImportWorkerApi);
    }),
  },
}));

vi.mock("shiki", () => ({
  codeToTokens: vi.fn(async (text: string) => {
    return {
      tokens: text.split("\n").map((line) => [{ content: line, color: "#000" }]),
    };
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return Object.assign(document.createElement("img"), { src, alt, ...props });
  },
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn((options) => ({
    getVirtualItems: () =>
      Array.from({ length: options.count }, (_, i) => ({
        index: i,
        key: i,
        start: i * options.estimateSize(),
        size: options.estimateSize(),
      })),
    getTotalSize: () => options.count * options.estimateSize(),
    scrollToIndex: vi.fn(),
    measureElement: (el: any) => el,
  })),
}));

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
