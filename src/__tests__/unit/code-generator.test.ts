import { describe, expect, it } from "vitest";
import { generateCode } from "@/lib/utils/code-generator";
import type { ApiRequest } from "@/types";

const BASE_REQUEST: ApiRequest = {
  method: "GET",
  url: "https://api.example.com/users",
  headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
  params: [],
  body: null,
  bodyType: "none",
  auth: { type: "none" },
};

describe("generateCode - cURL", () => {
  it("generates valid curl command", () => {
    const code = generateCode(BASE_REQUEST, { language: "curl" });
    expect(code).toContain("curl -X GET");
    expect(code).toContain("api.example.com/users");
  });

  it("includes headers in curl output", () => {
    const code = generateCode(BASE_REQUEST, { language: "curl" });
    expect(code).toContain("-H 'Content-Type: application/json'");
  });

  it("includes body for POST requests", () => {
    const request: ApiRequest = {
      ...BASE_REQUEST,
      method: "POST",
      body: '{"name":"John"}',
      bodyType: "json",
    };
    const code = generateCode(request, { language: "curl" });
    expect(code).toContain("-d");
    expect(code).toContain("John");
  });
});

describe("generateCode - JavaScript", () => {
  it("generates fetch call", () => {
    const code = generateCode(BASE_REQUEST, { language: "javascript" });
    expect(code).toContain("fetch");
    expect(code).toContain("api.example.com/users");
    expect(code).toContain("GET");
  });

  it("includes async/await", () => {
    const code = generateCode(BASE_REQUEST, { language: "javascript" });
    expect(code).toContain("await");
  });
});

describe("generateCode - TypeScript", () => {
  it("generates TypeScript fetch call", () => {
    const code = generateCode(BASE_REQUEST, { language: "typescript" });
    expect(code).toContain("fetch");
    expect(code).toContain("unknown");
  });
});

describe("generateCode - Python", () => {
  it("generates requests import", () => {
    const code = generateCode(BASE_REQUEST, { language: "python" });
    expect(code).toContain("import requests");
    expect(code).toContain("requests.get");
  });
});

describe("generateCode - bearer auth", () => {
  it("includes authorization header for bearer auth", () => {
    const request: ApiRequest = {
      ...BASE_REQUEST,
      auth: { type: "bearer", bearer: { token: "mytoken123" } },
    };
    const code = generateCode(request, { language: "curl" });
    expect(code).toContain("Bearer mytoken123");
  });
});

describe("generateCode - query params", () => {
  it("appends query params to URL", () => {
    const request: ApiRequest = {
      ...BASE_REQUEST,
      params: [{ key: "page", value: "1", enabled: true }],
    };
    const code = generateCode(request, { language: "curl" });
    expect(code).toContain("page=1");
  });

  it("ignores disabled params", () => {
    const request: ApiRequest = {
      ...BASE_REQUEST,
      params: [{ key: "page", value: "1", enabled: false }],
    };
    const code = generateCode(request, { language: "curl" });
    expect(code).not.toContain("page=1");
  });
});
