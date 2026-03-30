import { collectStepDependencies } from "@/features/pipeline/template-dependencies";
import { buildAliasesFromSteps } from "@/features/pipeline/step-aliases";
import type { PipelineStep } from "@/types";
import type { SubflowDefinition, SubflowNodeConfig } from "@/types/workflow";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createSubflowDefinitionFromStep(step: PipelineStep, siblingSteps: PipelineStep[]) {
  const aliases = buildAliasesFromSteps(siblingSteps);
  const dependencies = Array.from(
    new Map(
      collectStepDependencies(step, aliases).map((dependency, index) => [
        dependency.rawRef,
        {
          key: buildInputKey(dependency.rawRef, index),
          label: dependency.rawRef,
          rawRef: dependency.rawRef,
        },
      ]),
    ).values(),
  );
  const internalRequestId = crypto.randomUUID();
  const name = `${step.name || "Request"} Subflow`;
  const request = replaceRequestRefsWithInputs(step, dependencies, internalRequestId);

  const definition: SubflowDefinition = {
    id: crypto.randomUUID(),
    name,
    version: 1,
    description: `Reusable subflow created from ${step.name || "request"}`,
    workflow: {
      kind: "workflow-definition",
      version: 1,
      id: crypto.randomUUID(),
      name,
      entryNodeIds: [internalRequestId],
      requestRegistryId: `${internalRequestId}:registry`,
      nodes: [
        {
          id: internalRequestId,
          kind: "request",
          requestRef: internalRequestId,
          configRef: internalRequestId,
          config: { kind: "request", label: request.name },
        },
      ],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    registry: {
      kind: "request-registry",
      version: 1,
      id: `${internalRequestId}:registry`,
      requests: {
        [internalRequestId]: request,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    inputSchema: dependencies.map((dependency) => ({
      key: dependency.key,
      label: dependency.label,
      required: true,
    })),
    outputSchema: [{ key: "response", label: "Response", path: internalRequestId }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    definition,
    inputBindings: Object.fromEntries(
      dependencies.map((dependency) => [dependency.key, dependency.rawRef]),
    ),
    legacyAliasRefs: aliases.find((alias) => alias.stepId === step.id)?.refs ?? [step.id],
    outputAliases: {
      response: slugify(step.name || "subflow") || step.id,
    },
  };
}

export function createSubflowNodeConfig({
  definition,
  inputBindings,
  outputAliases,
  legacyAliasRefs,
}: {
  definition: SubflowDefinition;
  inputBindings?: Record<string, string>;
  outputAliases?: Record<string, string>;
  legacyAliasRefs?: string[];
}): SubflowNodeConfig {
  return {
    kind: "subflow",
    label: definition.name,
    subflowId: definition.id,
    subflowVersion: definition.version,
    inputBindings:
      inputBindings ??
      Object.fromEntries(
        definition.inputSchema.map((input) => [input.key, input.defaultValue ?? ""]),
      ),
    outputAliases:
      outputAliases ??
      Object.fromEntries(
        definition.outputSchema.map((output) => [
          output.key,
          slugify(definition.name) || definition.id,
        ]),
      ),
    legacyAliasRefs,
  };
}

function replaceRequestRefsWithInputs(
  step: PipelineStep,
  dependencies: Array<{ key: string; label: string; rawRef: string }>,
  internalRequestId: string,
) {
  const replacements = new Map(
    dependencies.map((dependency) => [dependency.rawRef, `{{input.${dependency.key}}}`]),
  );
  const replaceString = (value: string) =>
    Array.from(replacements.entries()).reduce(
      (current, [rawRef, replacement]) => current.replaceAll(`{{${rawRef}}}`, replacement),
      value,
    );

  return {
    ...clonePipelineStep(step),
    id: internalRequestId,
    name: step.name,
    url: replaceString(step.url),
    body: step.body ? replaceString(step.body) : step.body,
    headers: step.headers.map((header) => ({
      ...header,
      key: replaceString(header.key),
      value: replaceString(header.value),
    })),
    params: step.params.map((param) => ({
      ...param,
      key: replaceString(param.key),
      value: replaceString(param.value),
    })),
    auth: replaceAuthInputs(step, replaceString),
    requestSource: { mode: "detached" as const },
  };
}

function replaceAuthInputs(step: PipelineStep, replace: (value: string) => string) {
  if (step.auth.type === "bearer" && step.auth.bearer) {
    return { ...step.auth, bearer: { token: replace(step.auth.bearer.token) } };
  }
  if (step.auth.type === "basic" && step.auth.basic) {
    return {
      ...step.auth,
      basic: {
        username: replace(step.auth.basic.username),
        password: replace(step.auth.basic.password),
      },
    };
  }
  if (step.auth.type === "api-key" && step.auth.apiKey) {
    return {
      ...step.auth,
      apiKey: {
        ...step.auth.apiKey,
        key: replace(step.auth.apiKey.key),
        value: replace(step.auth.apiKey.value),
      },
    };
  }
  return cloneAuth(step.auth);
}

function buildInputKey(rawRef: string, index: number) {
  const base = rawRef.split(".").slice(-2).join("_");
  const slug = slugify(base);
  return slug ? `${slug}_${index + 1}` : `input_${index + 1}`;
}

function clonePipelineStep(step: PipelineStep): PipelineStep {
  return {
    ...step,
    headers: step.headers.map((header) => ({ ...header })),
    params: step.params.map((param) => ({ ...param })),
    formDataFields: step.formDataFields?.map(({ file: _file, ...field }) => ({ ...field })) ?? [],
    auth: cloneAuth(step.auth),
    preRequestRules: step.preRequestRules?.map((rule) => ({ ...rule })) ?? [],
    postRequestRules: step.postRequestRules?.map((rule) => ({ ...rule })) ?? [],
    testRules: step.testRules?.map((rule) => ({ ...rule })) ?? [],
    requestSource: step.requestSource ? { ...step.requestSource } : undefined,
    mockConfig: step.mockConfig ? { ...step.mockConfig } : undefined,
    pollingPolicy: step.pollingPolicy
      ? {
          ...step.pollingPolicy,
          successRules: step.pollingPolicy.successRules.map((rule) => ({ ...rule })),
          failureRules: step.pollingPolicy.failureRules?.map((rule) => ({ ...rule })) ?? [],
        }
      : undefined,
    webhookWaitPolicy: step.webhookWaitPolicy ? { ...step.webhookWaitPolicy } : undefined,
  };
}

function cloneAuth(auth: PipelineStep["auth"]): PipelineStep["auth"] {
  if (auth.type === "bearer" && auth.bearer) {
    return { ...auth, bearer: { ...auth.bearer } };
  }
  if (auth.type === "basic" && auth.basic) {
    return { ...auth, basic: { ...auth.basic } };
  }
  if (auth.type === "api-key" && auth.apiKey) {
    return { ...auth, apiKey: { ...auth.apiKey } };
  }
  if (auth.type === "oauth2" && auth.oauth2) {
    return { ...auth, oauth2: { ...auth.oauth2 } };
  }
  if (auth.type === "aws-sigv4" && auth.awsSigv4) {
    return { ...auth, awsSigv4: { ...auth.awsSigv4 } };
  }
  return { ...auth };
}
