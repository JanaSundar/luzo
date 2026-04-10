import type { PipelineStep } from "@/types";
import type { StepAlias } from "@/types/pipeline-runtime";
import type { RequestRegistry, WorkflowNode } from "@/types/workflow";

const WORKFLOW_NODE_ALIAS_PREFIX: Partial<Record<WorkflowNode["kind"], string>> = {
  assert: "assert",
  condition: "if",
  delay: "delay",
  end: "end",
  forEach: "foreach",
  log: "log",
  poll: "poll",
  request: "req",
  start: "start",
  transform: "transform",
  webhookWait: "webhook",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function coinRuntimeAlias(value: string): string {
  const slug = slugify(value);
  if (!slug) return "";
  return /^[a-zA-Z_$]/.test(slug) ? slug : `_${slug}`;
}

export function buildAliasesFromSteps(steps: PipelineStep[]): StepAlias[] {
  const slugCounts = new Map<string, number>();
  const slugs = steps.map((step) => {
    const slug = coinRuntimeAlias(step.name || "");
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    return slug;
  });

  return steps.map((step, index) => ({
    stepId: step.id,
    alias: `req${index + 1}`,
    index,
    refs: [
      `req${index + 1}`,
      step.id,
      ...(slugs[index] && slugCounts.get(slugs[index]) === 1 ? [slugs[index]] : []),
    ],
  }));
}

export function buildAliasesFromWorkflowNodes(
  nodes: WorkflowNode[],
  registry?: RequestRegistry,
): StepAlias[] {
  const slugCounts = new Map<string, number>();
  const nodeAliases = new Map<string, string>();
  const kindCounts = new Map<string, number>();
  const slugs = nodes.map((node) => {
    const slug = coinRuntimeAlias(getWorkflowNodeAliasLabel(node, registry));
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    const nodeAlias = buildWorkflowNodePrimaryAlias(node, kindCounts);
    if (nodeAlias) nodeAliases.set(node.id, nodeAlias);
    return slug;
  });

  return nodes.map((node, index) => ({
    stepId: node.id,
    alias: nodeAliases.get(node.id) ?? `req${index + 1}`,
    index,
    refs: Array.from(
      new Set([
        nodeAliases.get(node.id) ?? `req${index + 1}`,
        `req${index + 1}`,
        node.id,
        ...(slugs[index] && slugCounts.get(slugs[index]) === 1 ? [slugs[index]] : []),
      ]),
    ),
  }));
}

export function buildAliasesFromNodeIds(nodeIds: string[]): StepAlias[] {
  return nodeIds.map((stepId, index) => ({
    stepId,
    alias: `req${index + 1}`,
    index,
    refs: [`req${index + 1}`, stepId],
  }));
}

function getWorkflowNodeAliasLabel(node: WorkflowNode, registry?: RequestRegistry) {
  if (node.kind === "request") {
    const request = registry?.requests[node.requestRef ?? node.id];
    if (request?.name?.trim()) return request.name;
  }

  const label = node.config && "label" in node.config ? node.config.label : "";
  return typeof label === "string" ? label : "";
}

function buildWorkflowNodePrimaryAlias(node: WorkflowNode, kindCounts: Map<string, number>) {
  if (node.kind === "request") return null;

  const prefix = WORKFLOW_NODE_ALIAS_PREFIX[node.kind] ?? (coinRuntimeAlias(node.kind) || "node");
  const nextCount = (kindCounts.get(prefix) ?? 0) + 1;
  kindCounts.set(prefix, nextCount);
  return `${prefix}${nextCount}`;
}
