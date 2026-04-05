import { describe, expect, it } from "vitest";
import { presentTemplateSuggestion } from "@/lib/utils/templateSuggestionPresentation";

describe("presentTemplateSuggestion", () => {
  it("extracts the alias and request name for request suggestions", () => {
    expect(
      presentTemplateSuggestion({
        label: "Fetch users → body.users[0].id",
        path: "req1.response.body.users[0].id",
        sourceAlias: "req1",
        sourceLabel: "Fetch users",
        sourceMethod: "GET",
        sourceUrl: "https://api.example.com/users",
        stepId: "step-1",
        type: "body",
      }),
    ).toEqual({
      alias: "req1",
      detail: "response.body.users[0].id",
      groupLabel: "Fetch users",
      requestName: "Fetch users",
    });
  });

  it("falls back to method and url when the request still has a generic name", () => {
    expect(
      presentTemplateSuggestion({
        label: "New Request → body.users",
        path: "req2.response.body.users",
        sourceAlias: "req2",
        sourceLabel: "New Request",
        sourceMethod: "GET",
        sourceUrl: "https://dummyjson.com/users/1",
        stepId: "step-2",
        type: "body",
      }),
    ).toEqual({
      alias: "req2",
      detail: "response.body.users",
      groupLabel: "GET https://dummyjson.com/users/1",
      requestName: "GET https://dummyjson.com/users/1",
    });
  });

  it("keeps environment suggestions grouped clearly", () => {
    expect(
      presentTemplateSuggestion({
        label: "env: API_KEY",
        path: "API_KEY",
        stepId: "",
        type: "env",
      }),
    ).toEqual({
      alias: null,
      detail: "env: API_KEY",
      groupLabel: "Environment",
      requestName: null,
    });
  });
});
