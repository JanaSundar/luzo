import { describe, expect, it } from "vitest";
import { importCurlToRequest } from "@/utils/curl-import";

describe("importCurlToRequest", () => {
  it("maps json curl commands into a JSON request", () => {
    const request = importCurlToRequest(
      `curl 'https://api.example.com/users?team=platform' -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer test-token' --data '{"name":"Ada"}'`,
    );

    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://api.example.com/users");
    expect(request.params).toEqual([{ key: "team", value: "platform", enabled: true }]);
    expect(request.bodyType).toBe("json");
    expect(request.body).toContain('"name": "Ada"');
    expect(request.auth).toEqual({ type: "bearer", bearer: { token: "test-token" } });
    expect(request.headers).toEqual([
      { key: "Content-Type", value: "application/json", enabled: true },
    ]);
  });

  it("maps multipart curl commands into form-data fields", () => {
    const request = importCurlToRequest(
      "curl 'https://api.example.com/upload' -F 'name=Ada' -F 'file=@avatar.png'",
    );

    expect(request.method).toBe("POST");
    expect(request.bodyType).toBe("form-data");
    expect(request.body).toBeNull();
    expect(request.formDataFields).toEqual([
      { key: "name", value: "Ada", type: "text", enabled: true },
      { key: "file", value: "", type: "file", enabled: true, fileName: "avatar.png" },
    ]);
  });

  it("supports multiline curl commands with line continuations", () => {
    const request =
      importCurlToRequest(`curl --location 'https://api.example.com/users?team=platform' \
--header 'Content-Type: application/json' \
--data '{"name":"Ada"}'`);

    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://api.example.com/users");
    expect(request.params).toEqual([{ key: "team", value: "platform", enabled: true }]);
    expect(request.bodyType).toBe("json");
  });

  it("supports curl commands that use --url", () => {
    const request = importCurlToRequest(
      "curl --url https://api.example.com/users -H 'Accept: application/json'",
    );

    expect(request.method).toBe("GET");
    expect(request.url).toBe("https://api.example.com/users");
    expect(request.headers).toEqual([{ key: "Accept", value: "application/json", enabled: true }]);
  });
});
