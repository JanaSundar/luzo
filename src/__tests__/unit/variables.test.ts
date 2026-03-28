import { describe, expect, it } from "vitest";
import { extractVariables, hasUnresolvedVariables, interpolateVariables } from "@/utils/variables";

describe("interpolateVariables", () => {
  it("replaces {{var}} with value from context", () => {
    const result = interpolateVariables("{{baseUrl}}/users", {
      baseUrl: "https://api.example.com",
    });
    expect(result).toBe("https://api.example.com/users");
  });

  it("replaces multiple variables in one string", () => {
    const result = interpolateVariables("{{protocol}}://{{host}}/{{path}}", {
      protocol: "https",
      host: "api.example.com",
      path: "users",
    });
    expect(result).toBe("https://api.example.com/users");
  });

  it("leaves unresolved variables as-is", () => {
    const result = interpolateVariables("{{baseUrl}}/users", {});
    expect(result).toBe("{{baseUrl}}/users");
  });

  it("handles empty string", () => {
    expect(interpolateVariables("", { key: "value" })).toBe("");
  });

  it("handles string with no variables", () => {
    expect(interpolateVariables("https://api.example.com", { key: "value" })).toBe(
      "https://api.example.com",
    );
  });

  it("replaces same variable multiple times", () => {
    const result = interpolateVariables("{{id}}/{{id}}", { id: "123" });
    expect(result).toBe("123/123");
  });
});

describe("extractVariables", () => {
  it("extracts variable names from template", () => {
    const vars = extractVariables("{{baseUrl}}/{{version}}/users");
    expect(vars).toContain("baseUrl");
    expect(vars).toContain("version");
  });

  it("returns unique variable names", () => {
    const vars = extractVariables("{{id}}/{{id}}");
    expect(vars).toHaveLength(1);
    expect(vars[0]).toBe("id");
  });

  it("returns empty array for string with no variables", () => {
    expect(extractVariables("https://api.example.com")).toEqual([]);
  });
});

describe("hasUnresolvedVariables", () => {
  it("returns true when variables are missing", () => {
    expect(hasUnresolvedVariables("{{baseUrl}}/users", {})).toBe(true);
  });

  it("returns false when all variables are resolved", () => {
    expect(
      hasUnresolvedVariables("{{baseUrl}}/users", { baseUrl: "https://api.example.com" }),
    ).toBe(false);
  });

  it("returns false for string with no variables", () => {
    expect(hasUnresolvedVariables("https://api.example.com", {})).toBe(false);
  });
});
