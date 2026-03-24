import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CollectionsWorkspace } from "@/components/collections/CollectionsWorkspace";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { render } from "@/utils/test-utils";

describe("CollectionsWorkspace", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      dbUrl: "",
      dbStatus: "disconnected",
      dbError: null,
      dbLatencyMs: null,
      dbSchemaReady: false,
      dbWarnings: [],
      dbTables: [],
    });
  });

  it("shows the db-required empty state when collections are unavailable", () => {
    render(<CollectionsWorkspace />);

    expect(
      screen.getByText(/connect your database to unlock reusable collections/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open settings/i })).toBeInTheDocument();
  });
});
