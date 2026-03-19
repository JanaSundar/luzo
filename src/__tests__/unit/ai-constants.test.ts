import { describe, expect, it } from "vitest";
import { DEFAULT_PROMPTS } from "@/lib/pipeline/ai-constants";

describe("DEFAULT_PROMPTS", () => {
  it("keeps technical prompt section-specific", () => {
    expect(DEFAULT_PROMPTS.technical).toContain("senior backend engineer");
    expect(DEFAULT_PROMPTS.technical).toContain("Summary:");
    expect(DEFAULT_PROMPTS.technical).toContain("Metrics:");
    expect(DEFAULT_PROMPTS.technical).toContain("Step Analysis:");
    expect(DEFAULT_PROMPTS.technical).toContain("Recommendations:");
    expect(DEFAULT_PROMPTS.technical).toContain("actual data");
  });

  it("keeps executive prompt business-focused", () => {
    expect(DEFAULT_PROMPTS.executive).toContain("business-facing");
    expect(DEFAULT_PROMPTS.executive).toContain("Execution Overview:");
    expect(DEFAULT_PROMPTS.executive).toContain("Health Summary:");
    expect(DEFAULT_PROMPTS.executive).toContain("Per Request Breakdown:");
    expect(DEFAULT_PROMPTS.executive).toContain("stakeholder impact");
    expect(DEFAULT_PROMPTS.executive).toContain("confidence");
  });

  it("keeps compliance prompt audit-focused", () => {
    expect(DEFAULT_PROMPTS.compliance).toContain("audit-style");
    expect(DEFAULT_PROMPTS.compliance).toContain("Execution Overview:");
    expect(DEFAULT_PROMPTS.compliance).toContain("Health Summary:");
    expect(DEFAULT_PROMPTS.compliance).toContain("traceability");
    expect(DEFAULT_PROMPTS.compliance).toContain("compliance or security risks");
  });
});
