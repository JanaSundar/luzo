import type { Pipeline, PipelineStep } from "@/types";
import type { FlowDocument } from "@/types/workflow";
import { ensurePipelineFlowDocument } from "./canvas-flow";

const TEMPLATE_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

export function reorderPipelineSteps(
  pipeline: Pipeline,
  stepIds: string[],
): Pick<Pipeline, "flowDocument" | "steps" | "updatedAt"> {
  const oldSteps = pipeline.steps;
  const nextSteps = stepIds
    .map((stepId) => oldSteps.find((step) => step.id === stepId))
    .filter((step): step is PipelineStep => Boolean(step));
  const aliasMap = createPositionalAliasMap(oldSteps, nextSteps);
  const steps = nextSteps.map((step) => rewriteStepAliases(step, aliasMap));
  return {
    flowDocument: reorderFlowDocument({ ...pipeline, steps }),
    steps,
    updatedAt: new Date().toISOString(),
  };
}

function reorderFlowDocument(pipeline: Pipeline): FlowDocument {
  const flow = ensurePipelineFlowDocument(pipeline);
  const nodeMap = new Map(flow.nodes.map((node) => [node.id, node]));
  const reorderedRequests = pipeline.steps
    .map((step) => nodeMap.get(step.id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
  const nonRequestNodes = flow.nodes.filter((node) => node.kind !== "request");
  return {
    ...flow,
    nodes: [...nonRequestNodes, ...reorderedRequests],
    updatedAt: new Date().toISOString(),
  };
}

function createPositionalAliasMap(previous: PipelineStep[], next: PipelineStep[]) {
  const previousAliases = new Map(previous.map((step, index) => [step.id, `req${index + 1}`]));
  return new Map(
    next.map((step, index) => [
      previousAliases.get(step.id) ?? `req${index + 1}`,
      `req${index + 1}`,
    ]),
  );
}

function rewriteStepAliases(step: PipelineStep, aliasMap: Map<string, string>): PipelineStep {
  return {
    ...step,
    url: rewriteTemplateAliases(step.url, aliasMap),
    body: step.body ? rewriteTemplateAliases(step.body, aliasMap) : step.body,
    headers: step.headers.map((header) => ({
      ...header,
      key: rewriteTemplateAliases(header.key, aliasMap),
      value: rewriteTemplateAliases(header.value, aliasMap),
    })),
    params: step.params.map((param) => ({
      ...param,
      key: rewriteTemplateAliases(param.key, aliasMap),
      value: rewriteTemplateAliases(param.value, aliasMap),
    })),
    auth: rewriteAuthAliases(step.auth, aliasMap),
    mockConfig: step.mockConfig
      ? { ...step.mockConfig, body: rewriteTemplateAliases(step.mockConfig.body, aliasMap) }
      : step.mockConfig,
  };
}

function rewriteAuthAliases(stepAuth: PipelineStep["auth"], aliasMap: Map<string, string>) {
  if (stepAuth.type === "bearer" && stepAuth.bearer) {
    return {
      ...stepAuth,
      bearer: { token: rewriteTemplateAliases(stepAuth.bearer.token ?? "", aliasMap) },
    };
  }
  if (stepAuth.type === "basic" && stepAuth.basic) {
    return {
      ...stepAuth,
      basic: {
        username: rewriteTemplateAliases(stepAuth.basic.username ?? "", aliasMap),
        password: rewriteTemplateAliases(stepAuth.basic.password ?? "", aliasMap),
      },
    };
  }
  if (stepAuth.type === "api-key" && stepAuth.apiKey) {
    return {
      ...stepAuth,
      apiKey: {
        ...stepAuth.apiKey,
        key: rewriteTemplateAliases(stepAuth.apiKey.key ?? "", aliasMap),
        value: rewriteTemplateAliases(stepAuth.apiKey.value ?? "", aliasMap),
      },
    };
  }
  return stepAuth;
}

export function rewriteTemplateAliases(template: string, aliasMap: Map<string, string>) {
  if (!template) return template;
  return template.replace(TEMPLATE_REGEX, (match, expression: string) => {
    const trimmed = expression.trim();
    const nextExpression = rewriteExpressionAlias(trimmed, aliasMap);
    return nextExpression === trimmed ? match : `{{${nextExpression}}}`;
  });
}

function rewriteExpressionAlias(expression: string, aliasMap: Map<string, string>) {
  const dotIndex = expression.indexOf(".");
  const prefix = dotIndex === -1 ? expression : expression.slice(0, dotIndex);
  if (!/^req\d+$/.test(prefix)) return expression;
  const nextPrefix = aliasMap.get(prefix);
  if (!nextPrefix || nextPrefix === prefix) return expression;
  return dotIndex === -1 ? nextPrefix : `${nextPrefix}${expression.slice(dotIndex)}`;
}
