import type { TemplateDefinition } from "@/types";
import { createAsyncPollingPipeline, createAuthChainPipeline } from "./builtin-pipelines";

function createTemplate(
  params: Omit<TemplateDefinition, "createdAt" | "updatedAt" | "sourceType">,
) {
  const now = new Date().toISOString();
  return {
    ...params,
    sourceType: "builtin" as const,
    createdAt: now,
    updatedAt: now,
  };
}

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
  createTemplate({
    id: "builtin-auth-token-flow",
    name: "Auth Token Flow",
    description: "Fetch a token and call a protected API with chained variables.",
    category: "Authentication",
    tags: ["auth", "oauth", "token", "starter"],
    complexity: "starter",
    pipelineDefinition: createAuthChainPipeline(),
    inputSchema: [
      {
        key: "base_url",
        label: "Base URL",
        required: true,
        placeholder: "https://api.example.com",
      },
      { key: "client_id", label: "Client ID", required: true },
      { key: "client_secret", label: "Client Secret", required: true, secret: true },
      { key: "audience", label: "Audience", required: false, defaultValue: "" },
    ],
    sampleOutputs: ["access_token", "authenticated profile payload"],
    assumptions: [{ label: "Auth style", value: "OAuth client credentials" }],
  }),
  createTemplate({
    id: "builtin-async-job-polling",
    name: "Async Job Polling",
    description: "Kick off a long-running job, poll it, and fetch the resulting report.",
    category: "Async Workflows",
    tags: ["polling", "async", "jobs", "qa"],
    complexity: "intermediate",
    pipelineDefinition: createAsyncPollingPipeline(),
    inputSchema: [
      {
        key: "base_url",
        label: "Base URL",
        required: true,
        placeholder: "https://api.example.com",
      },
      { key: "job_type", label: "Job Type", required: true, defaultValue: "report" },
    ],
    sampleOutputs: ["job id", "status payload", "final report payload"],
    assumptions: [{ label: "Polling model", value: "GET /jobs/:id returns evolving status" }],
  }),
];
