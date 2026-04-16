import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineLayoutContent } from "@/features/pipelines/components/PipelineLayoutContent";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { render } from "@/utils/test-utils";

const pipelineRecord = {
  id: "pipeline-1",
  name: "Pipeline 1",
  steps: [],
  narrativeConfig: { tone: "technical" as const, prompt: "", enabled: true },
  createdAt: "",
  updatedAt: "",
};

const AUTO_OPEN_TIMELINE_KEY = "luzo:pipeline:auto-open-timeline";
const EXECUTION_DRAWER_SIZE_KEY = "luzo:pipeline:execution-drawer-size";

function renderSubject(overrides?: Partial<ComponentProps<typeof PipelineLayoutContent>>) {
  const props: ComponentProps<typeof PipelineLayoutContent> = {
    activePipelineId: "pipeline-1",
    activePipelineName: "Pipeline 1",
    currentView: "builder",
    executionBlockedReason: null,
    hasAIProvider: true,
    hasGeneratedReport: false,
    isExecuting: false,
    isExportingPDF: false,
    isGeneratingReport: false,
    isSavingToDb: false,
    canPersistToDb: false,
    onSetView: vi.fn(),
    onRun: vi.fn(),
    onDebug: vi.fn(),
    onStop: vi.fn(),
    onGenerateReport: vi.fn(),
    onExportReport: vi.fn(),
    snapshotsCount: 0,
    children: <div>Builder canvas</div>,
    ...overrides,
  };

  return {
    ...render(<PipelineLayoutContent {...props} />),
    props,
  };
}

describe("PipelineLayoutContent", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        removeItem: (key: string) => {
          storage.delete(key);
        },
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        get length() {
          return storage.size;
        },
      },
    });
    window.localStorage.removeItem(AUTO_OPEN_TIMELINE_KEY);
    window.localStorage.removeItem(EXECUTION_DRAWER_SIZE_KEY);
    usePipelineExecutionStore.getState().reset();
    useTimelineStore.getState().reset();
    usePipelineStore.setState({
      pipelines: [pipelineRecord],
      activePipelineId: "pipeline-1",
      currentView: "builder",
      selectedNodeIds: {},
      executing: false,
      executionResult: null,
    });
  });

  it("opens the execution drawer when run is triggered with auto-open enabled", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();

    renderSubject({ onRun });

    expect(
      screen.queryByText(/run a pipeline to see the execution timeline/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^run$/i }));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/run a pipeline to see the execution timeline/i)).toBeInTheDocument();
  });

  it("keeps the drawer closed when auto-open is disabled, but still allows manual open", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();

    renderSubject({ onRun });

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /auto-open timeline/i }));
    await user.click(screen.getByRole("button", { name: /^run$/i }));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(/run a pipeline to see the execution timeline/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("menuitem", { name: /show timeline/i }));

    expect(screen.getByText(/run a pipeline to see the execution timeline/i)).toBeInTheDocument();
  });

  it("remembers the auto-open preference across remounts", async () => {
    const user = userEvent.setup();
    const firstRun = vi.fn();
    const secondRun = vi.fn();
    const firstRender = renderSubject({ onRun: firstRun });

    await user.click(screen.getByRole("button", { name: /more actions/i }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /auto-open timeline/i }));
    firstRender.unmount();

    renderSubject({ onRun: secondRun });
    await user.click(screen.getByRole("button", { name: /more actions/i }));

    await waitFor(() => {
      expect(screen.getByRole("menuitemcheckbox", { name: /auto-open timeline/i })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    await user.click(screen.getByRole("button", { name: /^run$/i }));

    expect(secondRun).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(/run a pipeline to see the execution timeline/i),
    ).not.toBeInTheDocument();
  });
});
