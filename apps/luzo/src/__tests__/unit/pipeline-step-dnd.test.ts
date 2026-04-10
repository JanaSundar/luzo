import { describe, expect, it } from "vitest";
import { reorderStepIds } from "@/components/pipelines/pipelineStepDnD";

describe("reorderStepIds", () => {
  it("moves an id from earlier to later index", () => {
    expect(reorderStepIds(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an id from later to earlier index", () => {
    expect(reorderStepIds(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns the same array reference when from and to match", () => {
    const ids = ["a", "b"];
    expect(reorderStepIds(ids, 1, 1)).toBe(ids);
  });
});
