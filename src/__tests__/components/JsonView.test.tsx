import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JsonView } from "@/components/ui/JsonView";
import { render } from "@/test/utils";

describe("JsonView", () => {
  it("reports match counts for exact substring search", () => {
    const onMatchChange = vi.fn();
    render(
      <JsonView
        text={JSON.stringify({ name: "Ada", nested: { title: "Ada Lovelace" } })}
        searchQuery="Ada"
        onMatchChange={onMatchChange}
      />,
    );

    expect(onMatchChange).toHaveBeenLastCalledWith(2, 0);
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("does not return fuzzy matches", () => {
    const onMatchChange = vi.fn();
    render(
      <JsonView
        text={JSON.stringify({ name: "Ada", nested: { title: "Ada Lovelace" } })}
        searchQuery="Adaa"
        onMatchChange={onMatchChange}
      />,
    );

    expect(onMatchChange).toHaveBeenLastCalledWith(0, 0);
    expect(screen.getByText("0/0")).toBeInTheDocument();
  });

  it("renders nested JSON lines without fold summaries", () => {
    render(<JsonView text={JSON.stringify({ profile: { name: "Ada", city: "London" } })} />);

    expect(screen.getByText(/profile/)).toBeInTheDocument();
    expect(screen.getByText(/city/)).toBeInTheDocument();
    expect(screen.queryByText(/1 key/)).not.toBeInTheDocument();
  });
});
