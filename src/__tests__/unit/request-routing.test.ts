import { describe, expect, it } from "vitest";
import { resolveRequestRouteDisplay } from "@/features/pipeline/request-routing";

describe("resolveRequestRouteDisplay", () => {
  it("returns the provided fallback copy when no route target is selected", () => {
    expect(
      resolveRequestRouteDisplay(
        null,
        [],
        "Default failure",
        "The pipeline stops if this request fails.",
      ),
    ).toEqual({
      detail: "Default failure",
      label: "Default failure",
      method: null,
      subtitle: "The pipeline stops if this request fails.",
    });
  });
});
