import React from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PipelinesPage from "@/app/pipelines/page";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { render } from "@/utils/test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pipelines",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

describe("PipelinesPage", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      pipelines: [],
      activePipelineId: null,
      currentView: "builder",
      selectedNodeIds: {},
      executing: false,
      executionResult: null,
    });
    vi.spyOn(usePipelineStore.persist, "hasHydrated").mockReturnValue(true);
    vi.spyOn(usePipelineStore.persist, "onFinishHydration").mockReturnValue(() => {});
  });

  it("does not auto-open the removed workflow starter when there are no pipelines", () => {
    render(<PipelinesPage />);

    expect(screen.queryByRole("heading", { name: /start a workflow/i })).not.toBeInTheDocument();
  });
});
