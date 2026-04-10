import { describe, expect, it } from "vitest";
import {
  collectTemplateVariableRefs,
  filterTemplates,
  inferTemplateInputSchema,
} from "@/features/templates/template-utils";
import type { Pipeline, TemplateDefinition } from "@/types";

function createPipeline(overrides: Partial<Pipeline["steps"][number]> = {}): Pipeline {
  return {
    id: "pipeline-1",
    name: "Template Candidate",
    description: "Pipeline with external bindings",
    steps: [
      {
        id: "step-1",
        name: "Fetch profile",
        method: "POST",
        url: "{{base_url}}/profiles/{{tenant.slug}}",
        headers: [
          {
            key: "Authorization",
            value: "Bearer {{client_secret}}",
            enabled: true,
          },
        ],
        params: [],
        body: JSON.stringify({
          locale: "{{region_code}}",
          priorToken: "{{req1.response.body.token}}",
          webhookToken: "{{webhook1.output.token}}",
          pipelineInput: "{{input.account_id}}",
          environmentToken: "{{env.API_TOKEN}}",
        }),
        bodyType: "json",
        auth: { type: "none" },
        ...overrides,
      },
    ],
    narrativeConfig: {
      tone: "technical",
      prompt: "",
      enabled: true,
    },
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  };
}

function createTemplate(overrides: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    id: "template-1",
    name: "Auth Flow",
    category: "Authentication",
    tags: ["auth", "starter"],
    complexity: "starter",
    sourceType: "builtin",
    pipelineDefinition: createPipeline(),
    inputSchema: [],
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("template-utils", () => {
  it("collects unique template refs from nested values", () => {
    expect(
      collectTemplateVariableRefs({
        url: "{{base_url}}/users/{{tenant.slug}}",
        headers: [{ value: "Bearer {{token}}" }, { value: "Bearer {{token}}" }],
        nested: {
          list: ["{{tenant.slug}}", "{{region_code}}"],
        },
      }),
    ).toEqual(["base_url", "region_code", "tenant.slug", "token"]);
  });

  it("infers only external template inputs and excludes runtime-scoped refs", () => {
    const fields = inferTemplateInputSchema(createPipeline());

    expect(fields.map((field) => field.key)).toEqual([
      "base_url",
      "client_secret",
      "region_code",
      "tenant.slug",
    ]);
    expect(fields.find((field) => field.key === "client_secret")).toMatchObject({
      label: "Client Secret",
      required: true,
      secret: true,
    });
    expect(fields.some((field) => field.key.startsWith("req1."))).toBe(false);
    expect(fields.some((field) => field.key.startsWith("webhook1."))).toBe(false);
    expect(fields.some((field) => field.key.startsWith("env."))).toBe(false);
    expect(fields.some((field) => field.key.startsWith("input."))).toBe(false);
  });

  it("filters templates by search, category, complexity, and tag", () => {
    const templates = [
      createTemplate(),
      createTemplate({
        id: "template-2",
        name: "QA Polling",
        category: "Async Workflows",
        tags: ["qa", "polling"],
        complexity: "intermediate",
      }),
    ];

    expect(
      filterTemplates(templates, {
        search: "poll",
        category: "Async Workflows",
        complexity: "intermediate",
        tag: "qa",
      }).map((template) => template.id),
    ).toEqual(["template-2"]);
  });
});
