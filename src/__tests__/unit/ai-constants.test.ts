import { describe, expect, it } from "vitest";
import { DEFAULT_PROMPTS } from "@/lib/pipeline/ai-constants";

describe("DEFAULT_PROMPTS", () => {
  it("keeps technical prompt section-specific", () => {
    expect(DEFAULT_PROMPTS.technical).toContain("concise technical report");
    expect(DEFAULT_PROMPTS.technical).toContain("execution data");
    expect(DEFAULT_PROMPTS.technical).toContain("per-step issues");
    expect(DEFAULT_PROMPTS.technical).toContain("statuses, latencies, and errors");
    expect(DEFAULT_PROMPTS.technical).toContain("Avoid filler");
  });

  it("keeps executive prompt business-focused", () => {
    expect(DEFAULT_PROMPTS.executive).toContain("concise executive summary");
    expect(DEFAULT_PROMPTS.executive).toContain("execution data");
    expect(DEFAULT_PROMPTS.executive).toContain("business impact");
    expect(DEFAULT_PROMPTS.executive).toContain("overall reliability");
    expect(DEFAULT_PROMPTS.executive).toContain("avoid jargon");
  });

  it("keeps compliance prompt audit-focused", () => {
    expect(DEFAULT_PROMPTS.compliance).toContain("concise compliance review");
    expect(DEFAULT_PROMPTS.compliance).toContain("execution data");
    expect(DEFAULT_PROMPTS.compliance).toContain("auth");
    expect(DEFAULT_PROMPTS.compliance).toContain("sensitive data exposure");
    expect(DEFAULT_PROMPTS.compliance).toContain("traceability");
    expect(DEFAULT_PROMPTS.compliance).toContain("avoid speculation");
  });
});
