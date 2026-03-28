import type { ApiRequest } from "@/types";

export interface RouteExecutionResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  preRequestResult?: { logs: string[]; error: string | null; durationMs: number };
  postRequestResult?: { logs: string[]; error: string | null; durationMs: number };
  testResult?: {
    logs: string[];
    error: string | null;
    durationMs: number;
    testResults: Array<{ name: string; passed: boolean; error?: string }>;
  };
  testExecution?: { logs: string[]; error: string | null; durationMs?: number };
  testResults?: Array<{ name: string; passed: boolean; error?: string }>;
}

export async function executeRequestThroughApiRoute(
  request: ApiRequest,
  envVariables: Record<string, string>,
  signal?: AbortSignal,
) {
  if (request.bodyType === "form-data")
    return executeFormDataRequest(request, envVariables, signal);
  return postJson<RouteExecutionResponse>(
    "/api/execute/request",
    { request, envVariables },
    signal,
  );
}

export async function executeBatchRequestsThroughApiRoute(
  requests: ApiRequest[],
  envVariables: Record<string, string>,
  signal?: AbortSignal,
) {
  if (requests.some((request) => request.bodyType === "form-data")) {
    return Promise.all(
      requests.map((request) => executeRequestThroughApiRoute(request, envVariables, signal)),
    );
  }

  const data = await postJson<{ results: RouteExecutionResponse[] }>(
    "/api/execute/request/batch",
    { requests, envVariables },
    signal,
  );
  return data.results;
}

async function executeFormDataRequest(
  request: ApiRequest,
  envVariables: Record<string, string>,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append("__config", JSON.stringify(buildFormDataConfig(request, envVariables)));
  for (const field of request.formDataFields ?? []) {
    if (!field.enabled || !field.key) continue;
    if (field.type === "file") {
      if (field.file) formData.append(field.key, field.file);
    } else {
      formData.append(field.key, field.value);
    }
  }

  const data = await postForm("/api/execute", formData, signal);
  return normalizeResponse(data);
}

function buildFormDataConfig(request: ApiRequest, envVariables: Record<string, string>) {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    params: request.params,
    auth: request.auth,
    envVariables,
    preRequestScript: request.preRequestScript,
    postRequestScript: request.postRequestScript,
    testScript: request.testScript,
  };
}

function normalizeResponse(data: RouteExecutionResponse) {
  return {
    ...data,
    testResult: data.testExecution
      ? {
          logs: data.testExecution.logs,
          error: data.testExecution.error,
          durationMs: data.testExecution.durationMs ?? 0,
          testResults: data.testResults ?? [],
        }
      : data.testResult,
  };
}

async function postJson<T extends object>(url: string, payload: unknown, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  return parseResponse<T>(response);
}

async function postForm(url: string, body: FormData, signal?: AbortSignal) {
  const response = await fetch(url, { method: "POST", body, signal });
  return parseResponse<RouteExecutionResponse>(response);
}

async function parseResponse<T extends object>(response: Response): Promise<T> {
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    throw new Error("error" in data ? (data.error ?? "Request failed") : "Request failed");
  }
  return data as T;
}
