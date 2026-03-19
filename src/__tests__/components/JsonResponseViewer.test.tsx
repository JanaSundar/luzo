import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonResponseViewer } from "@/components/playground/JsonResponseViewer";

describe("JsonResponseViewer", () => {
  it("fills the available response body space", () => {
    const { container } = render(
      <JsonResponseViewer text='{"name":"John"}' className="h-full w-full" />
    );

    expect(container.firstElementChild).toHaveClass("h-full", "w-full");
  });
});
