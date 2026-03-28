import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JsonView } from "@/components/ui/JsonView";
import { render } from "@/utils/test-utils";

describe("JsonView", () => {
  it("reports match counts for exact substring search", async () => {
    const onMatchChange = vi.fn();
    render(
      <JsonView
        text={JSON.stringify({ name: "Ada", nested: { title: "Ada Lovelace" } })}
        searchQuery="Ada"
        onMatchChange={onMatchChange}
      />,
    );

    await vi.waitFor(() => {
      expect(onMatchChange).toHaveBeenLastCalledWith(2, 0);
    });
    expect(await screen.findByText("1/2")).toBeInTheDocument();
  });

  it("does not return fuzzy matches", async () => {
    const onMatchChange = vi.fn();
    render(
      <JsonView
        text={JSON.stringify({ name: "Ada", nested: { title: "Ada Lovelace" } })}
        searchQuery="Adaa"
        onMatchChange={onMatchChange}
      />,
    );

    await vi.waitFor(() => {
      expect(onMatchChange).toHaveBeenLastCalledWith(0, 0);
    });
    expect(await screen.findByText("0/0")).toBeInTheDocument();
  });

  it("renders nested JSON lines without fold summaries", async () => {
    render(<JsonView text={JSON.stringify({ profile: { name: "Ada", city: "London" } })} />);

    expect(await screen.findByText(/profile/)).toBeInTheDocument();
    expect(await screen.findByText(/city/)).toBeInTheDocument();
    expect(screen.queryByText(/1 key/)).not.toBeInTheDocument();
  });
});
