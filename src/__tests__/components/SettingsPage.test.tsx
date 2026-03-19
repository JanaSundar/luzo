import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SettingsPage from "@/app/settings/page";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { useProvidersConfigStore } from "@/lib/stores/useProvidersConfigStore";
import { render } from "@/test/utils";

describe("SettingsPage", () => {
  it("renders the settings workspace without the old shell card", async () => {
    useProvidersConfigStore.setState({
      providers: useProvidersConfigStore.getState().providers,
      activeProvider: "openrouter",
    });
    usePipelineDebugStore.setState(usePipelineDebugStore.getState());

    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByText(/integrations overview/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /providers/i }));
    expect(screen.getByText(/configure openrouter/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /database/i }));
    expect(screen.getByText(/configure postgresql/i)).toBeInTheDocument();
  });
});
