import { describe, expect, it } from "vitest";
import { buildRequestConfig } from "@/server/http/client";
import type { ApiRequest } from "@/types";

const baseRequest: ApiRequest = {
  method: "GET",
  url: "https://api.example.com",
  headers: [],
  params: [],
  body: null,
  bodyType: "none",
  formDataFields: [],
  auth: { type: "none" },
  preRequestEditorType: "visual",
  testEditorType: "visual",
  preRequestRules: [],
  testRules: [],
};

describe("buildRequestConfig bearer auth", () => {
  it("normalizes a bearer token that already includes the Bearer prefix", () => {
    const config = buildRequestConfig(
      {
        ...baseRequest,
        auth: {
          type: "bearer",
          bearer: { token: "Bearer token-123" },
        },
      },
      {},
      "https://api.example.com",
    );

    expect(config.headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("trims whitespace around resolved bearer tokens", () => {
    const config = buildRequestConfig(
      {
        ...baseRequest,
        auth: {
          type: "bearer",
          bearer: { token: "  {{req1.response.body.access_token}} \n" },
        },
      },
      {
        "req1.response.body.access_token": " token-xyz ",
      },
      "https://api.example.com",
    );

    expect(config.headers).toEqual({ Authorization: "Bearer token-xyz" });
  });
});
