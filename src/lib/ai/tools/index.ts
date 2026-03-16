import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const executeApiRequest = tool(
  async ({ method, url, headers, body }) => {
    try {
      const response = await fetch(url, {
        method,
        headers: headers ? JSON.parse(headers) : {},
        body: body ?? undefined,
      });
      const responseBody = await response.text();
      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      });
    } catch (error: unknown) {
      return JSON.stringify({ error: String(error) });
    }
  },
  {
    name: "executeApiRequest",
    description: "Execute an HTTP API request and return the response",
    schema: z.object({
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
      url: z.string().describe("The full URL to request"),
      headers: z.string().optional().describe("JSON string of headers"),
      body: z.string().optional().describe("Request body as string"),
    }),
  }
);

export const parseOpenApiSpec = tool(
  async ({ spec }) => {
    try {
      const parsed = JSON.parse(spec);
      const endpoints = Object.entries(parsed.paths ?? {}).flatMap(([path, methods]) =>
        Object.keys(methods as object).map((method) => `${method.toUpperCase()} ${path}`)
      );
      return JSON.stringify({
        title: parsed.info?.title,
        version: parsed.info?.version,
        endpoints,
      });
    } catch {
      return JSON.stringify({ error: "Invalid OpenAPI spec" });
    }
  },
  {
    name: "parseOpenApiSpec",
    description: "Parse an OpenAPI specification and extract endpoint information",
    schema: z.object({
      spec: z.string().describe("The OpenAPI spec as a JSON string"),
    }),
  }
);

export const explainResponse = tool(
  async ({ status, body }) => {
    const statusInfo: Record<number, string> = {
      200: "OK - Request succeeded",
      201: "Created - Resource was created",
      204: "No Content - Success with no body",
      400: "Bad Request - Invalid input",
      401: "Unauthorized - Authentication required",
      403: "Forbidden - Insufficient permissions",
      404: "Not Found - Resource doesn't exist",
      429: "Too Many Requests - Rate limited",
      500: "Internal Server Error - Server issue",
    };

    const explanation = statusInfo[status] ?? `HTTP ${status}`;
    let bodyAnalysis = "No body";

    try {
      const parsed = JSON.parse(body);
      bodyAnalysis = `Valid JSON with ${Array.isArray(parsed) ? `${parsed.length} items` : `${Object.keys(parsed).length} fields`}`;
    } catch {
      bodyAnalysis = `Plain text: ${body.slice(0, 100)}`;
    }

    return `Status: ${explanation}\nBody: ${bodyAnalysis}`;
  },
  {
    name: "explainResponse",
    description: "Explain what an API response means",
    schema: z.object({
      status: z.number().describe("HTTP status code"),
      body: z.string().describe("Response body"),
    }),
  }
);
