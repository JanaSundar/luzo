import { describe, expect, it } from "vitest";
import { createDefaultRequestName } from "@/features/pipeline/request-names";

describe("createDefaultRequestName", () => {
  it("starts with Request 1 when no numbered request names exist", () => {
    expect(createDefaultRequestName([])).toBe("Request 1");
    expect(createDefaultRequestName(["Login", "Fetch Users"])).toBe("Request 1");
  });

  it("picks the next available request number", () => {
    expect(createDefaultRequestName(["Request 1", "Request 2"])).toBe("Request 3");
    expect(createDefaultRequestName(["Request 2", "Request 4"])).toBe("Request 1");
  });
});
