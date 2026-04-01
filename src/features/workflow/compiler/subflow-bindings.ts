import type { RequestDefinition, SubflowDefinition } from "@/types/workflow";

export function applyInputBindingsToRequest({
  request,
  inputBindings,
  inputSchema,
}: {
  request: RequestDefinition;
  inputBindings: Record<string, string>;
  inputSchema: SubflowDefinition["inputSchema"];
}) {
  const valueByKey = Object.fromEntries(
    inputSchema.map((input) => [input.key, inputBindings[input.key] ?? input.defaultValue ?? ""]),
  );
  const replace = (value: string) =>
    value.replace(/{{\s*input\.([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => valueByKey[key] ?? "");
  const clone = cloneRequestDefinition(request);

  clone.url = replace(clone.url);
  clone.body = clone.body ? replace(clone.body) : clone.body;
  clone.headers = clone.headers.map((header) => ({
    ...header,
    key: replace(header.key),
    value: replace(header.value),
  }));
  clone.params = clone.params.map((param) => ({
    ...param,
    key: replace(param.key),
    value: replace(param.value),
  }));
  if (clone.auth.type === "bearer" && clone.auth.bearer) {
    clone.auth = { ...clone.auth, bearer: { token: replace(clone.auth.bearer.token) } };
  }
  if (clone.auth.type === "basic" && clone.auth.basic) {
    clone.auth = {
      ...clone.auth,
      basic: {
        username: replace(clone.auth.basic.username),
        password: replace(clone.auth.basic.password),
      },
    };
  }
  if (clone.auth.type === "api-key" && clone.auth.apiKey) {
    clone.auth = {
      ...clone.auth,
      apiKey: {
        ...clone.auth.apiKey,
        key: replace(clone.auth.apiKey.key),
        value: replace(clone.auth.apiKey.value),
      },
    };
  }

  return clone;
}

export function cloneRequestDefinition(request: RequestDefinition): RequestDefinition {
  return {
    ...request,
    headers: request.headers.map((header) => ({ ...header })),
    params: request.params.map((param) => ({ ...param })),
    formDataFields:
      request.formDataFields?.map(({ file: _file, ...field }) => ({ ...field })) ?? [],
    auth: cloneAuthConfig(request.auth),
    preRequestRules: request.preRequestRules?.map((rule) => ({ ...rule })) ?? [],
    postRequestRules: request.postRequestRules?.map((rule) => ({ ...rule })) ?? [],
    testRules: request.testRules?.map((rule) => ({ ...rule })) ?? [],
    pollingPolicy: request.pollingPolicy
      ? {
          ...request.pollingPolicy,
          successRules: request.pollingPolicy.successRules.map((rule) => ({ ...rule })),
          failureRules: request.pollingPolicy.failureRules?.map((rule) => ({ ...rule })) ?? [],
        }
      : undefined,
    webhookWaitPolicy: request.webhookWaitPolicy ? { ...request.webhookWaitPolicy } : undefined,
  };
}

export function cloneAuthConfig(auth: RequestDefinition["auth"]): RequestDefinition["auth"] {
  if (auth.type === "bearer" && auth.bearer) return { ...auth, bearer: { ...auth.bearer } };
  if (auth.type === "basic" && auth.basic) return { ...auth, basic: { ...auth.basic } };
  if (auth.type === "api-key" && auth.apiKey) return { ...auth, apiKey: { ...auth.apiKey } };
  if (auth.type === "oauth2" && auth.oauth2) return { ...auth, oauth2: { ...auth.oauth2 } };
  if (auth.type === "aws-sigv4" && auth.awsSigv4) {
    return { ...auth, awsSigv4: { ...auth.awsSigv4 } };
  }
  return { ...auth };
}
