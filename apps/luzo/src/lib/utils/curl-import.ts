import type { ApiRequest, AuthConfig, FormDataField, HttpMethod, KeyValuePair } from "@/types";

const HTTP_METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);

const DEFAULT_REQUEST: ApiRequest = {
  method: "GET",
  url: "",
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

function normalizeMethod(method?: string): HttpMethod {
  const normalized = method?.toUpperCase() as HttpMethod | undefined;
  return normalized && HTTP_METHODS.has(normalized) ? normalized : "GET";
}

function normalizeCurlCommand(command: string): string {
  return command
    .replace(/\\\r?\n/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function tokenizeCurl(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const char of command) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaped) current += "\\";
  if (current) tokens.push(current);
  return tokens.map((token) => token.trim()).filter(Boolean);
}

function toKeyValuePairs(record: Record<string, string>): KeyValuePair[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));
}

function parseHeaderValue(input: string): { key: string; value: string } {
  const separator = input.indexOf(":");
  if (separator === -1) {
    return { key: input.trim(), value: "" };
  }

  return {
    key: input.slice(0, separator).trim(),
    value: input.slice(separator + 1).trim(),
  };
}

function decodeBasicHeader(value: string): AuthConfig | null {
  const match = value.match(/^Basic\s+(.+)$/i);
  if (!match || typeof atob !== "function") return null;

  try {
    const encodedValue = match[1];
    if (!encodedValue) return null;
    const decoded = atob(encodedValue);
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;

    return {
      type: "basic",
      basic: {
        username: decoded.slice(0, separator),
        password: decoded.slice(separator + 1),
      },
    };
  } catch {
    return null;
  }
}

function inferAuth(headers: Record<string, string>, basicCredentials?: string): AuthConfig {
  if (basicCredentials) {
    const separator = basicCredentials.indexOf(":");
    return {
      type: "basic",
      basic: {
        username: separator === -1 ? basicCredentials : basicCredentials.slice(0, separator),
        password: separator === -1 ? "" : basicCredentials.slice(separator + 1),
      },
    };
  }

  const authorizationEntry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization",
  );
  if (!authorizationEntry) return { type: "none" };

  const [headerKey, value] = authorizationEntry;
  const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    const token = bearerMatch[1];
    if (!token) return { type: "none" };
    delete headers[headerKey];
    return {
      type: "bearer",
      bearer: { token },
    };
  }

  const basicAuth = decodeBasicHeader(value);
  if (basicAuth) {
    delete headers[headerKey];
    return basicAuth;
  }

  return { type: "none" };
}

function collectQueryParams(url: URL): KeyValuePair[] {
  const pairs: KeyValuePair[] = [];
  url.searchParams.forEach((value, key) => {
    pairs.push({ key, value, enabled: true });
  });
  return pairs;
}

function parseObjectLikeBody(body: string): Record<string, string> | null {
  const segments = body.split("&");
  if (segments.length === 0 || segments.some((segment) => !segment.includes("="))) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const segment of segments) {
    const separator = segment.indexOf("=");
    const key = decodeURIComponent(segment.slice(0, separator));
    const value = decodeURIComponent(segment.slice(separator + 1));
    result[key] = value;
  }
  return result;
}

function inferBody(
  bodySegments: string[],
  formFields: FormDataField[],
  headers: Record<string, string>,
): Pick<ApiRequest, "body" | "bodyType" | "formDataFields"> {
  const contentTypeEntry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "content-type",
  );
  const contentType = contentTypeEntry?.[1]?.toLowerCase();

  if (formFields.length > 0) {
    return {
      body: null,
      bodyType: "form-data",
      formDataFields: formFields,
    };
  }

  if (bodySegments.length === 0) {
    return {
      body: null,
      bodyType: "none",
      formDataFields: [],
    };
  }

  const body = bodySegments.join("&");

  if (contentType?.includes("application/json")) {
    try {
      return {
        body: JSON.stringify(JSON.parse(body), null, 2),
        bodyType: "json",
        formDataFields: [],
      };
    } catch {
      return {
        body,
        bodyType: "raw",
        formDataFields: [],
      };
    }
  }

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return {
      body,
      bodyType: "x-www-form-urlencoded",
      formDataFields: [],
    };
  }

  const objectLike = parseObjectLikeBody(body);
  if (objectLike && !contentType) {
    return {
      body,
      bodyType: "x-www-form-urlencoded",
      formDataFields: [],
    };
  }

  return {
    body,
    bodyType: "raw",
    formDataFields: [],
  };
}

function parseFormField(input: string): FormDataField {
  const separator = input.indexOf("=");
  const key = separator === -1 ? input : input.slice(0, separator);
  const value = separator === -1 ? "" : input.slice(separator + 1);

  if (value.startsWith("@")) {
    return {
      key,
      value: "",
      type: "file",
      enabled: true,
      fileName: value.slice(1),
    };
  }

  return {
    key,
    value,
    type: "text",
    enabled: true,
  };
}

export function importCurlToRequest(curlCommand: string): ApiRequest {
  const trimmed = normalizeCurlCommand(curlCommand);
  if (!trimmed) {
    throw new Error("Paste a cURL command to import.");
  }

  const tokens = tokenizeCurl(trimmed);
  const command = tokens[0];
  if (!command || command.toLowerCase() !== "curl") {
    throw new Error("Paste a valid cURL command to import.");
  }

  let url = "";
  let method = "GET";
  let basicCredentials: string | undefined;
  const headers: Record<string, string> = {};
  const bodySegments: string[] = [];
  const formDataFields: FormDataField[] = [];

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if (!token) continue;

    if (token === "-X" || token === "--request") {
      if (next) {
        method = next;
        index += 1;
      }
      continue;
    }

    if (token === "-H" || token === "--header") {
      if (next) {
        const header = parseHeaderValue(next);
        if (header.key) headers[header.key] = header.value;
        index += 1;
      }
      continue;
    }

    if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-urlencode"
    ) {
      if (next) {
        bodySegments.push(next);
        if (method === "GET") method = "POST";
        index += 1;
      }
      continue;
    }

    if (token === "-F" || token === "--form") {
      if (next) {
        formDataFields.push(parseFormField(next));
        if (method === "GET") method = "POST";
        index += 1;
      }
      continue;
    }

    if (token === "-u" || token === "--user") {
      if (next) {
        basicCredentials = next;
        index += 1;
      }
      continue;
    }

    if (token === "--url") {
      if (next) {
        url = next;
        index += 1;
      }
      continue;
    }

    if (
      token === "-L" ||
      token === "--location" ||
      token === "--compressed" ||
      token === "-s" ||
      token === "--silent"
    ) {
      continue;
    }

    if (!token.startsWith("-") && !url) {
      url = token;
    }
  }

  if (!url) {
    throw new Error("Unable to find a URL in that cURL command.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Unable to parse the URL from that cURL command.");
  }

  const params = collectQueryParams(parsedUrl);
  parsedUrl.search = "";

  const auth = inferAuth(headers, basicCredentials);
  const requestBody = inferBody(bodySegments, formDataFields, headers);

  return {
    ...DEFAULT_REQUEST,
    method: normalizeMethod(method),
    url: parsedUrl.toString(),
    headers: toKeyValuePairs(headers),
    params,
    auth,
    ...requestBody,
  };
}
