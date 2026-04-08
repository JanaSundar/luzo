import type { HttpMethod, KeyValuePair } from "@/types";

const HTTP_METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

export function parseJson(input: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(input);
    const record = getRecord(parsed);
    if (!record) throw new Error("invalid");
    return record;
  } catch {
    throw new Error("Paste valid JSON to import.");
  }
}

export function formatJsonBody(value: string | undefined) {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function readDescription(value: unknown) {
  if (typeof value === "string") return value;
  const record = getRecord(value);
  return asString(record?.content) ?? undefined;
}

export function readExampleValue(record: Record<string, unknown>) {
  return asString(record.example) ?? "";
}

export function readExample(content: Record<string, unknown>) {
  if ("example" in content) return content.example;
  const examples = getRecord(content.examples);
  const first = examples ? getRecord(Object.values(examples)[0]) : null;
  return first?.value;
}

export function toPairs(items: unknown[], keyName: string, valueName: string): KeyValuePair[] {
  return items.flatMap((item) => {
    const record = getRecord(item);
    if (!record) return [];
    const key = asString(record[keyName]);
    if (!key || record.disabled === true) return [];
    return [{ key, value: asString(record[valueName]) ?? "", enabled: true }];
  });
}

export function toUrlEncodedString(items: unknown[]) {
  return items
    .flatMap((item) => {
      const record = getRecord(item);
      const key = asString(record?.key);
      if (!key || record?.disabled === true) return [];
      return [`${encodeURIComponent(key)}=${encodeURIComponent(asString(record?.value) ?? "")}`];
    })
    .join("&");
}

export function toUrlEncoded(value: unknown) {
  const record = getRecord(value);
  return record
    ? Object.entries(record)
        .map(
          ([key, entry]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(entry ?? ""))}`,
        )
        .join("&")
    : "";
}

export function stripSearch(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function normalizeMethod(method: string | undefined): HttpMethod {
  const candidate = method?.toUpperCase() as HttpMethod | undefined;
  return candidate && HTTP_METHODS.has(candidate) ? candidate : "GET";
}

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
