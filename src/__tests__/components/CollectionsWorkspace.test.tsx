import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CollectionsWorkspace } from "@/components/collections/CollectionsWorkspace";
import { useDbStore } from "@/lib/stores/useDbStore";
import { render } from "@/test/utils";

describe("CollectionsWorkspace", () => {
  beforeEach(() => {
    useDbStore.setState({
      dbUrl: "",
      status: "disconnected",
      error: null,
      latencyMs: null,
      schemaReady: false,
      warnings: [],
      tables: [],
    });
  });

  it("shows the db-required empty state when collections are unavailable", () => {
    render(<CollectionsWorkspace />);

    expect(
      screen.getByText(/connect your database to unlock reusable collections/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open settings/i })).toBeInTheDocument();
  });
});
