import { describe, expect, it } from "vitest";
import { analyzeCollectionToDraft } from "@/features/collection-to-pipeline/analyze";
import { compileDraftToPipeline } from "@/features/collection-to-pipeline/compile";
import { loadCollectionGenerationSource } from "@/features/collection-to-pipeline/normalize-source";
import type { Collection } from "@/types";

describe("collection to pipeline", () => {
  it("rewrites auth variables into pipeline-native template refs", () => {
    const collection = makeCollection([
      {
        method: "POST",
        name: "Login",
        url: "https://api.example.com/auth/token",
      },
      {
        auth: { type: "bearer", bearer: { token: "{{access_token}}" } },
        method: "GET",
        name: "Profile",
        url: "https://api.example.com/me",
      },
    ]);

    const draft = analyzeCollectionToDraft(
      loadCollectionGenerationSource({ collection, sourceType: "stored_collection" }),
    );

    expect(draft.dependencies).toHaveLength(1);
    expect(draft.steps[1]?.request.auth.bearer?.token).toBe("{{req1.response.body.access_token}}");
    expect(draft.validation.sortedStepIds).toEqual(["draft-step-1", "draft-step-2"]);
  });

  it("preserves unresolved variables instead of dropping them", () => {
    const collection = makeCollection([
      {
        method: "GET",
        name: "Get account",
        url: "https://api.example.com/accounts/{{accountId}}",
      },
    ]);

    const draft = analyzeCollectionToDraft(
      loadCollectionGenerationSource({ collection, sourceType: "stored_collection" }),
    );

    expect(draft.steps[0]?.request.url).toContain("{{accountId}}");
    expect(draft.steps[0]?.unresolved[0]?.variable).toBe("accountId");
  });

  it("normalizes uploaded Postman JSON and compiles generation metadata", () => {
    const source = loadCollectionGenerationSource({
      fileName: "workspace.json",
      sourceType: "postman_json",
      text: JSON.stringify({
        info: { name: "Workspace API" },
        item: [
          {
            name: "Users",
            item: [
              {
                name: "Create user",
                request: {
                  method: "POST",
                  url: { raw: "https://api.example.com/users" },
                },
              },
            ],
          },
        ],
      }),
    });

    const pipeline = compileDraftToPipeline(analyzeCollectionToDraft(source));

    expect(source.source.collectionName).toBe("Workspace API");
    expect(source.requests[0]?.folderPath).toEqual(["Users"]);
    expect(pipeline.generationMetadata?.source.fileName).toBe("workspace.json");
    expect(pipeline.steps[0]?.name).toBe("Create user");
  });
});

function makeCollection(
  requests: Array<{
    auth?: Collection["requests"][number]["request"]["auth"];
    method: Collection["requests"][number]["request"]["method"];
    name: string;
    url: string;
  }>,
): Collection {
  return {
    createdAt: new Date().toISOString(),
    id: "collection-1",
    name: "Auth Collection",
    requests: requests.map((request, index) => ({
      autoSave: false,
      collectionId: "collection-1",
      createdAt: new Date().toISOString(),
      id: `request-${index + 1}`,
      name: request.name,
      request: {
        auth: request.auth ?? { type: "none" },
        body: null,
        bodyType: "none",
        formDataFields: [],
        headers: [],
        method: request.method,
        params: [],
        preRequestEditorType: "visual",
        preRequestRules: [],
        preRequestScript: "",
        testEditorType: "visual",
        testRules: [],
        testScript: "",
        url: request.url,
      },
      updatedAt: new Date().toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  };
}
