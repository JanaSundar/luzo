import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JsonResponseViewer } from "@/components/playground/JsonResponseViewer";

describe("JsonResponseViewer", () => {
  it("fills the available response body space", () => {
    const { container } = render(
      <JsonResponseViewer text='{"name":"John"}' className="h-full w-full" />
    );

    expect(container.firstElementChild).toHaveClass("h-full", "w-full");
  });

  it("calls onMatchChange with correct counts when searching", () => {
    const onMatchChange = vi.fn();
    const text = JSON.stringify({ name: "John", city: "New York", job: "John's assistant" });

    const { rerender } = render(
      <JsonResponseViewer text={text} searchQuery="John" onMatchChange={onMatchChange} />
    );

    // Initial render with searchQuery="John"
    // matches: "John" in name, "John" in job (2 matches)
    // index should be reset to 0
    expect(onMatchChange).toHaveBeenLastCalledWith(2, 0);

    // Update search query
    rerender(<JsonResponseViewer text={text} searchQuery="York" onMatchChange={onMatchChange} />);
    expect(onMatchChange).toHaveBeenLastCalledWith(1, 0);

    // Update text
    const newText = JSON.stringify({ name: "Jane" });
    rerender(
      <JsonResponseViewer text={newText} searchQuery="John" onMatchChange={onMatchChange} />
    );
    // "John" not in {"name":"Jane"}
    expect(onMatchChange).toHaveBeenLastCalledWith(0, 0);
  });
});
