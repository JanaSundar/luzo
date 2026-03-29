import { fireEvent, screen } from "@testing-library/react";
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

  it("tracks wrap-around by matched occurrence instead of matched line", async () => {
    render(<JsonView text={"Ada Ada\nAda"} searchQuery="Ada" format={false} />);

    expect(await screen.findByText("1/3")).toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: "Next match" });
    const getMarks = () => screen.getAllByText("Ada", { selector: "mark" });
    const getActiveMarkIndex = () => {
      const marks = getMarks();
      const styles = marks.map((mark) => mark.getAttribute("style"));
      const styleCounts = new Map<string | null, number>();

      for (const style of styles) {
        styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
      }

      return styles.findIndex((style) => styleCounts.get(style) === 1);
    };

    expect(getActiveMarkIndex()).toBe(0);

    fireEvent.click(nextButton);
    expect(await screen.findByText("2/3")).toBeInTheDocument();
    expect(getActiveMarkIndex()).toBe(1);

    fireEvent.click(nextButton);
    expect(await screen.findByText("3/3")).toBeInTheDocument();
    expect(getActiveMarkIndex()).toBe(2);

    fireEvent.click(nextButton);
    expect(await screen.findByText("1/3")).toBeInTheDocument();
    expect(getActiveMarkIndex()).toBe(0);
  });
});
