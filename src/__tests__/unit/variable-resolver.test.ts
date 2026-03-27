import { describe, expect, it } from "vitest";
import { resolveTemplate } from "@/features/pipeline/variable-resolver";

describe("resolveTemplate", () => {
  it("uses the latest runtime value instead of a stale cached value", () => {
    const template = "{{login.response.body.access_token}}";

    const first = resolveTemplate(template, {
      login: { response: { body: { access_token: "token-1" } } },
    });
    const second = resolveTemplate(template, {
      login: { response: { body: { access_token: "token-2" } } },
    });

    expect(first).toBe("token-1");
    expect(second).toBe("token-2");
  });
});
