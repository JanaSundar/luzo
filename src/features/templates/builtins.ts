import { createPipelineRecord } from "@/features/pipeline/createPipelineRecord";
import type { Pipeline, TemplateDefinition } from "@/types";

function createAuthChainPipeline(): Pipeline {
  const pipeline = createPipelineRecord("Auth Token Flow");
  const authStepId = crypto.randomUUID();
  const profileStepId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    ...pipeline,
    id: crypto.randomUUID(),
    name: "Auth Token Flow",
    description: "Fetch an access token, then call an authenticated endpoint.",
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: authStepId,
        name: "Request Access Token",
        method: "POST",
        url: "{{base_url}}/oauth/token",
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        params: [],
        body: JSON.stringify(
          {
            client_id: "{{client_id}}",
            client_secret: "{{client_secret}}",
            audience: "{{audience}}",
            grant_type: "client_credentials",
          },
          null,
          2,
        ),
        bodyType: "json",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
      {
        id: profileStepId,
        name: "Fetch Profile",
        method: "GET",
        url: "{{base_url}}/me",
        headers: [
          {
            key: "Authorization",
            value: "Bearer {{request_access_token.response.body.access_token}}",
            enabled: true,
          },
        ],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
    ],
    flowDocument: {
      ...pipeline.flowDocument!,
      id: crypto.randomUUID(),
      name: "Auth Token Flow",
      createdAt: now,
      updatedAt: now,
      nodes: [
        {
          id: `${pipeline.id}:start`,
          kind: "start",
          position: { x: 0, y: 0 },
          config: { kind: "start", label: "Start" },
        },
        {
          id: authStepId,
          kind: "request",
          position: { x: 280, y: 0 },
          dataRef: authStepId,
          requestRef: authStepId,
          config: { kind: "request", label: "Request Access Token" },
        },
        {
          id: profileStepId,
          kind: "request",
          position: { x: 560, y: 0 },
          dataRef: profileStepId,
          requestRef: profileStepId,
          config: { kind: "request", label: "Fetch Profile" },
        },
      ],
      edges: [
        {
          id: `${pipeline.id}:start:${authStepId}:control`,
          source: `${pipeline.id}:start`,
          target: authStepId,
          semantics: "control",
        },
        {
          id: `${authStepId}:${profileStepId}:success`,
          source: authStepId,
          target: profileStepId,
          semantics: "success",
        },
      ],
    },
  };
}

function createAsyncPollingPipeline(): Pipeline {
  const pipeline = createPipelineRecord("Async Job Polling");
  const createId = crypto.randomUUID();
  const pollId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    ...pipeline,
    id: crypto.randomUUID(),
    name: "Async Job Polling",
    description: "Kick off a job, poll its status, then fetch the final report.",
    createdAt: now,
    updatedAt: now,
    steps: [
      {
        id: createId,
        name: "Create Job",
        method: "POST",
        url: "{{base_url}}/jobs",
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        params: [],
        body: JSON.stringify({ type: "{{job_type}}" }, null, 2),
        bodyType: "json",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
      {
        id: pollId,
        name: "Poll Job Status",
        method: "GET",
        url: "{{base_url}}/jobs/{{create_job.response.body.id}}",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
      {
        id: reportId,
        name: "Fetch Job Report",
        method: "GET",
        url: "{{base_url}}/jobs/{{create_job.response.body.id}}/report",
        headers: [],
        params: [],
        body: null,
        bodyType: "none",
        auth: { type: "none" },
        requestSource: { mode: "new" },
      },
    ],
    flowDocument: {
      ...pipeline.flowDocument!,
      id: crypto.randomUUID(),
      name: "Async Job Polling",
      createdAt: now,
      updatedAt: now,
      nodes: [
        {
          id: `${pipeline.id}:start`,
          kind: "start",
          position: { x: 0, y: 0 },
          config: { kind: "start", label: "Start" },
        },
        {
          id: createId,
          kind: "request",
          position: { x: 280, y: 0 },
          dataRef: createId,
          requestRef: createId,
          config: { kind: "request", label: "Create Job" },
        },
        {
          id: pollId,
          kind: "request",
          position: { x: 560, y: 0 },
          dataRef: pollId,
          requestRef: pollId,
          config: { kind: "request", label: "Poll Job Status" },
        },
        {
          id: reportId,
          kind: "request",
          position: { x: 840, y: 0 },
          dataRef: reportId,
          requestRef: reportId,
          config: { kind: "request", label: "Fetch Job Report" },
        },
      ],
      edges: [
        {
          id: `${pipeline.id}:start:${createId}:control`,
          source: `${pipeline.id}:start`,
          target: createId,
          semantics: "control",
        },
        {
          id: `${createId}:${pollId}:success`,
          source: createId,
          target: pollId,
          semantics: "success",
        },
        {
          id: `${pollId}:${reportId}:success`,
          source: pollId,
          target: reportId,
          semantics: "success",
        },
      ],
    },
  };
}

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
