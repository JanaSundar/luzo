import type { ApiRequest, FormDataField, KeyValuePair } from "@/types";
import {
  asArray,
  asString,
  formatJsonBody,
  getRecord,
  normalizeMethod,
  parseJson,
  readDescription,
  readExample,
  readExampleValue,
  stripSearch,
  toPairs,
  toUrlEncoded,
  toUrlEncodedString,
} from "./collection-import-shared";
const EMPTY_REQUEST: ApiRequest = {
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
const OPENAPI_METHODS = new Set(["get", "post", "put", "delete", "patch", "head", "options"]);
export type ImportedEnvironment = { name: string; variables: KeyValuePair[] };
export type ImportedCollection = {
  description?: string;
  environments: ImportedEnvironment[];
  name: string;
  requests: Array<{ name: string; request: ApiRequest }>;
};

export function importPostmanCollection(input: string): ImportedCollection {
  const json = parseJson(input);
  const info = getRecord(json.info);
  const items = asArray(json.item);
  if (!info || items.length === 0) throw new Error("Paste a valid Postman collection JSON.");
  const requests = flattenPostmanItems(items).map(({ name, request }) => ({
    name,
    request: toApiRequestFromPostman(request),
  }));
  if (requests.length === 0) throw new Error("No requests found in that Postman collection.");
  const name = asString(info.name) ?? "Imported Postman Collection";
  return {
    name,
    description: readDescription(info.description),
    environments: buildPostmanEnvironments(json, name),
    requests,
  };
}

export function importOpenApiCollection(input: string): ImportedCollection {
  const json = parseJson(input);
  const info = getRecord(json.info);
  const paths = getRecord(json.paths);
  if (!info || !paths) throw new Error("Paste a valid OpenAPI or Swagger JSON.");
  const { environments, urlPrefix } = buildOpenApiEnvironmentBundle(json);
  const requests = Object.entries(paths).flatMap(([pathName, value]) =>
    toOpenApiRequests(pathName, getRecord(value), urlPrefix),
  );
  if (requests.length === 0)
    throw new Error("No operations found in that OpenAPI or Swagger document.");
  return {
    name: asString(info.title) ?? "Imported API Collection",
    description: asString(info.description) ?? undefined,
    environments,
    requests,
  };
}

function flattenPostmanItems(
  items: unknown[],
  parents: string[] = [],
): Array<{ name: string; request: Record<string, unknown> }> {
  return items.flatMap((item) => {
    const entry = getRecord(item);
    if (!entry) return [];
    const name = asString(entry.name) ?? "Request";
    const nextParents = parents.length > 0 ? [...parents, name] : [name];
    const request = getRecord(entry.request);
    if (request) return [{ name: nextParents.join(" / "), request }];
    const nestedItems = asArray(entry.item);
    return nestedItems.length > 0 ? flattenPostmanItems(nestedItems, nextParents) : [];
  });
}
function toApiRequestFromPostman(request: Record<string, unknown>): ApiRequest {
  const body = getRecord(request.body);
  const headerPairs = toPairs(asArray(request.header), "key", "value");
  const url = readPostmanUrl(request.url);
  const formDataFields = readPostmanFormData(body);
  const rawBody = asString(body?.raw);
  const urlEncodedBody = toUrlEncodedString(asArray(body?.urlencoded));
  const mode = asString(body?.mode);
  let requestBody: string | null;
  let bodyType: ApiRequest["bodyType"];

  switch (mode) {
    case "raw":
      requestBody = formatJsonBody(rawBody);
      bodyType =
        rawBody?.trim().startsWith("{") || rawBody?.trim().startsWith("[") ? "json" : "raw";
      break;
    case "urlencoded":
      requestBody = urlEncodedBody;
      bodyType = "x-www-form-urlencoded";
      break;
    default:
      requestBody = null;
      bodyType = formDataFields.length > 0 ? "form-data" : "none";
      break;
  }

  return {
    ...EMPTY_REQUEST,
    method: normalizeMethod(asString(request.method)),
    url: url.url,
    headers: headerPairs,
    params: url.params,
    body: requestBody,
    bodyType,
    formDataFields,
  };
}
function toOpenApiRequests(
  pathName: string,
  pathItem: Record<string, unknown> | null,
  urlPrefix: string,
): Array<{ name: string; request: ApiRequest }> {
  if (!pathItem) return [];
  const sharedParameters = asArray(pathItem.parameters);
  return Object.entries(pathItem).flatMap(([method, operation]) => {
    if (!OPENAPI_METHODS.has(method)) return [];
    const op = getRecord(operation);
    if (!op) return [];
    const parameters = [...sharedParameters, ...asArray(op.parameters)];
    const { headers, params } = toOpenApiParameters(parameters);
    const requestBody = toOpenApiBody(getRecord(op.requestBody));
    const name = asString(op.summary) ?? asString(op.operationId) ?? `${method} ${pathName}`;
    return [
      {
        name,
        request: {
          ...EMPTY_REQUEST,
          method: normalizeMethod(method),
          url: joinUrlPrefix(urlPrefix, pathName),
          headers,
          params,
          ...requestBody,
        },
      },
    ];
  });
}
function buildPostmanEnvironments(json: Record<string, unknown>, collectionName: string) {
  const variables = toPairs(asArray(json.variable), "key", "value");
  return variables.length > 0 ? [{ name: collectionName, variables }] : [];
}
function buildOpenApiEnvironmentBundle(json: Record<string, unknown>) {
  const title = asString(getRecord(json.info)?.title) ?? "Imported API";
  const server = getPrimaryOpenApiServer(json);
  if (!server?.url) return { urlPrefix: "", environments: [] as ImportedEnvironment[] };
  if (server.variables.length > 0) {
    return {
      urlPrefix: replaceOpenApiVars(server.url),
      environments: [{ name: title, variables: server.variables }],
    };
  }
  return {
    urlPrefix: "{{baseUrl}}",
    environments: [
      { name: title, variables: [{ key: "baseUrl", value: server.url, enabled: true }] },
    ],
  };
}
function getPrimaryOpenApiServer(json: Record<string, unknown>) {
  const firstServer = getRecord(asArray(json.servers)[0]);
  if (firstServer)
    return {
      url: asString(firstServer.url) ?? "",
      variables: readOpenApiServerVariables(firstServer),
    };
  const host = asString(json.host);
  if (!host) return null;
  const basePath = asString(json.basePath) ?? "";
  const scheme = asString(asArray(json.schemes)[0]) ?? "https";
  return { url: `${scheme}://${host}${basePath}`, variables: [] as KeyValuePair[] };
}
function readOpenApiServerVariables(server: Record<string, unknown>) {
  const variables = getRecord(server.variables);
  if (!variables) return [] as KeyValuePair[];
  return Object.entries(variables).flatMap(([key, value]) => {
    const record = getRecord(value);
    if (!record) return [];
    return [{ key, value: asString(record.default) ?? "", enabled: true }];
  });
}
function replaceOpenApiVars(url: string) {
  return url.replace(/\{([^}]+)\}/g, "{{$1}}");
}
function joinUrlPrefix(urlPrefix: string, pathName: string) {
  if (!urlPrefix) return pathName;
  return `${urlPrefix.replace(/\/+$/, "")}/${pathName.replace(/^\/+/, "")}`;
}
function toOpenApiParameters(parameters: unknown[]) {
  const headers: KeyValuePair[] = [];
  const params: KeyValuePair[] = [];
  for (const parameter of parameters) {
    const record = getRecord(parameter);
    if (!record) continue;
    const key = asString(record.name);
    if (!key) continue;
    const pair = { key, value: readExampleValue(record), enabled: true };
    if (asString(record.in) === "header") headers.push(pair);
    if (asString(record.in) === "query") params.push(pair);
  }
  return { headers, params };
}
function toOpenApiBody(requestBody: Record<string, unknown> | null) {
  const content = getRecord(requestBody?.content);
  const jsonContent = getRecord(content?.["application/json"]);
  const formContent = getRecord(content?.["application/x-www-form-urlencoded"]);
  if (jsonContent)
    return {
      body: JSON.stringify(readExample(jsonContent) ?? {}, null, 2),
      bodyType: "json" as const,
      formDataFields: [],
    };
  if (formContent) {
    const value = readExample(formContent);
    return {
      body: typeof value === "string" ? value : value ? toUrlEncoded(value) : "",
      bodyType: "x-www-form-urlencoded" as const,
      formDataFields: [],
    };
  }
  return { body: null, bodyType: "none" as const, formDataFields: [] };
}
function readPostmanUrl(input: unknown) {
  if (typeof input === "string") return { url: input, params: [] as KeyValuePair[] };
  const url = getRecord(input);
  const raw = asString(url?.raw);
  if (raw) return { url: stripSearch(raw), params: toPairs(asArray(url?.query), "key", "value") };
  return { url: "", params: toPairs(asArray(url?.query), "key", "value") };
}
function readPostmanFormData(body: Record<string, unknown> | null): FormDataField[] {
  return asArray(body?.formdata).flatMap((entry) => {
    const record = getRecord(entry);
    if (!record) return [];
    const key = asString(record.key);
    if (!key || record.disabled === true) return [];
    const type = asString(record.type) === "file" ? "file" : "text";
    return [
      {
        key,
        type,
        value: type === "text" ? (asString(record.value) ?? "") : "",
        enabled: true,
        fileName: type === "file" ? (asString(record.src) ?? "") : undefined,
      },
    ];
  });
}
