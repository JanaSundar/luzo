import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/utils/variableMetadata";
import { flattenObject, getByPath } from "@/features/pipeline/variable-resolver";
import { toCompilePlanInput } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";

export function getAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = [];

  Object.keys(envVars).forEach((key) => {
    suggestions.push(
      createVariableSuggestion({
        path: key,
        label: `env: ${key}`,
        resolvedValue: envVars[key],
        type: "env",
        stepId: "",
      }),
    );
  });

  if (!pipeline) return suggestions;
  const compiled = compileExecutionPlan(toCompilePlanInput(pipeline));
  const effectiveNodeId = resolveEffectiveNodeId(currentStepId, compiled.plan.nodes);
  if (effectiveNodeId === null) return suggestions;
  const ancestorIds = getAncestorNodeIds(effectiveNodeId, compiled.plan.adjacency);
  const seenPaths = new Set<string>();

  // Build a kind lookup so we can emit skeleton paths for nodes with no runtime data yet.
  const nodeKindById = new Map<string, string>(
    (compiled.expandedWorkflow?.nodes ?? []).map((n: { id: string; kind: string }) => [
      n.id,
      n.kind,
    ]),
  );

  for (const alias of compiled.aliases) {
    if (!ancestorIds.has(alias.stepId)) continue;
    const displayRef = pickDisplayRef(alias.refs);
    if (!displayRef) continue;
    const runtimeRef = alias.refs.find((ref) => executionContext[ref] !== undefined) ?? displayRef;
    const stepContext = executionContext[runtimeRef] as Record<string, unknown> | undefined;

    if (!stepContext || typeof stepContext !== "object") {
      // No runtime data yet — emit skeleton paths so {{ autocomplete works before first run.
      const kind = nodeKindById.get(alias.stepId);
      if (kind === "request") {
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.response.status`,
          label: `${displayRef} → Status Code`,
          resolvedValue: undefined,
          stepId: alias.stepId,
          type: "status",
        });
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.response.body`,
          label: `${displayRef} → Body`,
          resolvedValue: undefined,
          stepId: alias.stepId,
          type: "body",
        });
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.response.headers`,
          label: `${displayRef} → Headers`,
          resolvedValue: undefined,
          stepId: alias.stepId,
          type: "header",
        });
      } else if (kind === "forEach") {
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.results`,
          label: `${displayRef} → Results`,
          resolvedValue: undefined,
          stepId: alias.stepId,
          type: "meta",
        });
      } else if (kind === "transform") {
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.output`,
          label: `${displayRef} → Output`,
          resolvedValue: undefined,
          stepId: alias.stepId,
          type: "meta",
        });
      }
      continue;
    }

    if (!stepContext?.response || typeof stepContext.response !== "object") {
      flattenObject(stepContext, displayRef, 6).forEach(({ path, value }) => {
        const shortLabel = path.replace(`${displayRef}.`, "");
        pushUniqueSuggestion(suggestions, seenPaths, {
          path,
          label: `${displayRef} → ${shortLabel}`,
          resolvedValue: value,
          stepId: alias.stepId,
          type: "meta",
        });
      });
      continue;
    }

    const statusPath = `${displayRef}.response.status`;
    if (!seenPaths.has(statusPath)) {
      seenPaths.add(statusPath);
      suggestions.push(
        createVariableSuggestion({
          path: statusPath,
          label: `${displayRef} → Status Code`,
          resolvedValue: getByPath(executionContext, `${runtimeRef}.response.status`),
          stepId: alias.stepId,
          type: "status",
        }),
      );
    }

    const response = stepContext.response as Record<string, unknown>;
    if (response.headers && typeof response.headers === "object") {
      Object.keys(response.headers as Record<string, unknown>).forEach((key) => {
        pushUniqueSuggestion(suggestions, seenPaths, {
          path: `${displayRef}.response.headers.${key}`,
          label: `${displayRef} → Header: ${key}`,
          resolvedValue: (response.headers as Record<string, unknown>)[key],
          stepId: alias.stepId,
          type: "header",
        });
      });
    }

    if (response.body === undefined) continue;

    const bodyFlat = flattenObject(response.body, `${displayRef}.response.body`, 6);
    bodyFlat.forEach(({ path, value }) => {
      const shortLabel = path.replace(`${displayRef}.response.body.`, "");
      pushUniqueSuggestion(suggestions, seenPaths, {
        path,
        label: `${displayRef} → body.${shortLabel}`,
        resolvedValue: value,
        stepId: alias.stepId,
        type: "body",
      });
    });
  }

  return suggestions;
}

function resolveEffectiveNodeId(
  currentStepId: string,
  nodes: Array<{ nodeId: string; orderIndex: number }>,
): string | null {
  const directMatch = nodes.find((node) => node.nodeId === currentStepId);
  return directMatch?.nodeId ?? null;
}

function getAncestorNodeIds(nodeId: string, adjacency: Record<string, string[]>): Set<string> {
  const ancestors = new Set<string>();
  const queue = [...(adjacency[nodeId] ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (ancestors.has(current)) continue;
    ancestors.add(current);
    for (const pred of adjacency[current] ?? []) {
      if (!ancestors.has(pred)) queue.push(pred);
    }
  }
  return ancestors;
}

function pickDisplayRef(refs: string[]) {
  return (
    refs.find((ref) => isFriendlyDisplayRef(ref) && isJavaScriptIdentifier(ref)) ??
    refs.find((ref) => /^req\d+$/.test(ref)) ??
    refs.find((ref) => isJavaScriptIdentifier(ref)) ??
    refs[0] ??
    null
  );
}

function isFriendlyDisplayRef(ref: string) {
  return !/^req\d+$/.test(ref) && !looksLikeUuid(ref) && !looksLikeExpandedNodeRef(ref);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function looksLikeExpandedNodeRef(value: string) {
  const [left, right] = value.split("::");
  return Boolean(left && right && looksLikeUuid(left) && looksLikeUuid(right));
}

function isJavaScriptIdentifier(value: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function pushUniqueSuggestion(
  suggestions: VariableSuggestion[],
  seenPaths: Set<string>,
  input: Parameters<typeof createVariableSuggestion>[0],
) {
  if (seenPaths.has(input.path)) return;
  seenPaths.add(input.path);
  suggestions.push(createVariableSuggestion(input));
}

export function filterSuggestions(
  suggestions: VariableSuggestion[],
  query: string,
): VariableSuggestion[] {
  if (!query) return suggestions;
  const normalizedQuery = query.toLowerCase();
  return suggestions.filter(
    (suggestion) =>
      suggestion.path.toLowerCase().includes(normalizedQuery) ||
      suggestion.label.toLowerCase().includes(normalizedQuery),
  );
}

/** Adapter for the flow editor: 4-param interface over getAutocompleteSuggestions. */
export function getFlowNodeAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  nodeId: string,
  envVars: Record<string, string>,
  runtimeVariables: Record<string, unknown>,
): VariableSuggestion[] {
  if (!pipeline) return [];
  return getAutocompleteSuggestions(pipeline, nodeId, envVars, runtimeVariables);
}
