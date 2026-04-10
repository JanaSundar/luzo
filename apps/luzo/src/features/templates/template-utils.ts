import { buildWorkflowBundleFromPipeline } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { Pipeline, TemplateComplexity, TemplateDefinition, TemplateInputField } from "@/types";
import { VARIABLE_REGEX_TRIM } from "@/utils/variables";
import { isSensitiveVariableKey } from "@/utils/variableMetadata";

const RUNTIME_ROOT_PATTERNS = [
  /^(req\d+|env|loop|input)\b/,
  /^(assert|delay|end|foreach|if|log|poll|start|transform|webhook)\d+\b/,
];

export function inferTemplateInputSchema(pipeline: Pipeline): TemplateInputField[] {
  const aliases = resolveKnownWorkflowRefs(pipeline);
  const fields = new Map<string, TemplateInputField>();

  collectTemplateVariableRefs(pipeline).forEach((ref) => {
    if (aliases.has(ref) || aliases.has(getRootRef(ref)) || looksLikeRuntimeRef(ref)) {
      return;
    }

    fields.set(ref, {
      key: ref,
      label: humanizeTemplateKey(ref),
      required: true,
      secret: isSensitiveVariableKey(ref.split(".").at(-1) ?? ref),
    });
  });

  return Array.from(fields.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function collectTemplateVariableRefs(value: unknown): string[] {
  const refs = new Set<string>();

  walkTemplateStrings(value, (input) => {
    for (const match of input.matchAll(VARIABLE_REGEX_TRIM)) {
      const ref = match[1]?.trim();
      if (ref) refs.add(ref);
    }
  });

  return Array.from(refs).sort((left, right) => left.localeCompare(right));
}

export function filterTemplates(
  templates: TemplateDefinition[],
  filters: {
    search?: string;
    category?: string;
    complexity?: TemplateComplexity | "all";
    tag?: string;
  },
) {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim().toLowerCase() ?? "all";
  const complexity = filters.complexity ?? "all";
  const tag = filters.tag?.trim().toLowerCase() ?? "all";

  return templates.filter((template) => {
    if (category !== "all" && template.category.toLowerCase() !== category) return false;
    if (complexity !== "all" && template.complexity !== complexity) return false;
    if (tag !== "all" && !template.tags.some((entry) => entry.toLowerCase() === tag)) return false;

    if (!normalizedSearch) return true;
    const haystack = [
      template.name,
      template.description ?? "",
      template.category,
      template.complexity,
      ...template.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function resolveKnownWorkflowRefs(pipeline: Pipeline) {
  if (pipeline.steps.length === 0) return new Set<string>();

  const bundle = buildWorkflowBundleFromPipeline(pipeline);
  const compiled = compileExecutionPlan({
    workflow: bundle.workflow,
    registry: bundle.registry,
  });

  return new Set(compiled.aliases.flatMap((alias) => alias.refs));
}

function walkTemplateStrings(value: unknown, visit: (input: string) => void) {
  if (typeof value === "string") {
    if (value.includes("{{")) visit(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => walkTemplateStrings(entry, visit));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => walkTemplateStrings(entry, visit));
  }
}

function looksLikeRuntimeRef(ref: string) {
  return RUNTIME_ROOT_PATTERNS.some((pattern) => pattern.test(ref));
}

function getRootRef(ref: string) {
  const dotIndex = ref.indexOf(".");
  return dotIndex === -1 ? ref : ref.slice(0, dotIndex);
}

function humanizeTemplateKey(key: string) {
  return (
    key
      .split(".")
      .at(-1)
      ?.replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) || key
  );
}
