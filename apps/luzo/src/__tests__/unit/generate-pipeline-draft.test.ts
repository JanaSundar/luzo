import { describe, expect, it } from "vitest";
import { generatePipelineDraft } from "@/features/workflow-starter/generate-pipeline-draft";

describe("generatePipelineDraft", () => {
  it("creates a prompt-backed starter draft with request-only fallback warnings", async () => {
    const draft = await generatePipelineDraft({
      baseUrl: "https://api.example.com",
      brief:
        "Authenticate, fetch the current user profile, and keep polling every minute until the report is ready.",
      pipelineName: "Profile Monitor",
    });

    expect(draft.source.sourceType).toBe("prompt");
    expect(draft.source.label).toBe("Profile Monitor");
    expect(draft.steps.length).toBeGreaterThan(0);
    expect(draft.warnings.some((warning) => /async orchestration/i.test(warning))).toBe(true);
    expect(
      draft.steps.every((step) => step.request.url.startsWith("https://api.example.com")),
    ).toBe(true);
  });
});
