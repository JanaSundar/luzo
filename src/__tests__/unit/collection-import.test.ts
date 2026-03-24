import { describe, expect, it } from "vitest";
import { importOpenApiCollection, importPostmanCollection } from "@/utils/collection-import";

describe("collection import", () => {
  it("parses a Postman collection into requests", () => {
    const collection = importPostmanCollection(
      JSON.stringify({
        info: { name: "Workspace API", description: "Core requests" },
        variable: [{ key: "baseUrl", value: "https://api.example.com" }],
        item: [
          {
            name: "Auth",
            item: [
              {
                name: "Login",
                request: {
                  method: "POST",
                  header: [{ key: "Content-Type", value: "application/json" }],
                  url: {
                    raw: "https://api.example.com/login?source=web",
                    query: [{ key: "source", value: "web" }],
                  },
                  body: { mode: "raw", raw: '{"email":"ada@example.com"}' },
                },
              },
            ],
          },
        ],
      }),
    );

    expect(collection.name).toBe("Workspace API");
    expect(collection.environments).toEqual([
      {
        name: "Workspace API",
        variables: [{ key: "baseUrl", value: "https://api.example.com", enabled: true }],
      },
    ]);
    expect(collection.requests).toHaveLength(1);
    expect(collection.requests[0]?.name).toBe("Auth / Login");
    expect(collection.requests[0]?.request.url).toBe("https://api.example.com/login");
    expect(collection.requests[0]?.request.bodyType).toBe("json");
  });

  it("parses an OpenAPI document into requests", () => {
    const collection = importOpenApiCollection(
      JSON.stringify({
        openapi: "3.1.0",
        info: { title: "Workspace API", description: "Generated from schema" },
        servers: [
          {
            url: "https://{region}.example.com/{version}",
            variables: {
              region: { default: "api" },
              version: { default: "v1" },
            },
          },
        ],
        paths: {
          "/users": {
            get: {
              summary: "List users",
              parameters: [{ name: "team", in: "query", example: "platform" }],
            },
          },
          "/users/{id}": {
            post: {
              operationId: "createUser",
              requestBody: {
                content: {
                  "application/json": {
                    example: { name: "Ada" },
                  },
                },
              },
            },
          },
        },
      }),
    );

    expect(collection.name).toBe("Workspace API");
    expect(collection.environments[0]?.variables).toEqual([
      { key: "region", value: "api", enabled: true },
      { key: "version", value: "v1", enabled: true },
    ]);
    expect(collection.requests).toHaveLength(2);
    expect(collection.requests[0]?.request.url).toContain(
      "https://{{region}}.example.com/{{version}}/",
    );
    expect(collection.requests[0]?.request.params).toEqual([
      { key: "team", value: "platform", enabled: true },
    ]);
    expect(collection.requests[1]?.request.body).toContain('"name": "Ada"');
  });
});
