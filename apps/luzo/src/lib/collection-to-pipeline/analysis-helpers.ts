import type { ApiRequest, PipelineGenerationStepDraft, PipelineStep } from "@/types";

const TOKEN_KEYS = new Set(["token", "access_token", "accessToken", "id_token", "refresh_token"]);
const HTTP_ACTIONS: Record<string, string> = {
  DELETE: "Delete",
  GET: "Fetch",
  HEAD: "Inspect",
  OPTIONS: "Describe",
  PATCH: "Update",
  POST: "Create",
  PUT: "Replace",
};

export function createDraftStepName(sourceName: string, request: ApiRequest) {
  const trimmed = sourceName.trim();
  if (trimmed && trimmed.length <= 42 && /[A-Za-z]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ");
  }

  const resource = titleizeResource(getPrimaryResourceKey(request.url));
  if (resource && isAuthRequest(request)) return "Authenticate";
  return resource
    ? `${HTTP_ACTIONS[request.method] ?? "Run"} ${resource}`
    : `${request.method} Request`;
}

export function toPipelineSteps(steps: PipelineGenerationStepDraft[]): PipelineStep[] {
  return steps.map((step) => ({
    ...step.request,
    id: step.id,
    name: step.generatedName,
  }));
}

export function getTemplateFields(request: ApiRequest) {
  const fields = [
    { field: "url", value: request.url },
    { field: "body", value: request.body ?? "" },
    ...request.headers.map((header, index) => ({
      field: `headers.${header.key || index}`,
      value: header.value,
    })),
    ...request.params.map((param, index) => ({
      field: `params.${param.key || index}`,
      value: param.value,
    })),
  ];

  if (request.auth.type === "bearer" && request.auth.bearer) {
    fields.push({ field: "auth.bearer.token", value: request.auth.bearer.token });
  }
  return fields;
}

export function getProducedKeys(request: ApiRequest) {
  const resource = getPrimaryResourceKey(request.url);
  const keys = new Set<string>();
  if (isAuthRequest(request)) TOKEN_KEYS.forEach((key) => keys.add(key));
  if (request.method === "POST" && resource) {
    keys.add("id");
    keys.add(`${resource}Id`);
  }
  return Array.from(keys);
}

export function getPrimaryResourceKey(url: string) {
  const strippedUrl = stripOrigin(url);
  const pathWithoutQuery = strippedUrl.split("?")[0] ?? "";
  const path = pathWithoutQuery
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .find((segment) => !segment.startsWith("{") && !segment.startsWith(":"));
  if (!path) return "";
  return singularize(path.replace(/[^a-zA-Z0-9]/g, ""));
}

export function isAuthRequest(request: ApiRequest) {
  const haystack = `${request.method} ${request.url}`.toLowerCase();
  return haystack.includes("auth") || haystack.includes("login") || haystack.includes("token");
}

export function groupStepsByDepth(stepIds: string[], adjacency: Record<string, string[]>) {
  const depth = new Map<string, number>();
  for (const stepId of stepIds) {
    const deps = adjacency[stepId] ?? [];
    depth.set(
      stepId,
      deps.length === 0 ? 0 : Math.max(...deps.map((dep) => depth.get(dep) ?? 0)) + 1,
    );
  }
  return depth;
}

function stripOrigin(url: string) {
  return url.replace(/^https?:\/\/[^/]+/i, "");
}

function singularize(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

function titleizeResource(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
