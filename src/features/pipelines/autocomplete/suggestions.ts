import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { createVariableSuggestion } from "@/utils/variableMetadata";
import { flattenObject, getByPath } from "@/features/pipeline/variable-resolver";
import { toCompilePlanInput } from "@/features/workflow/pipeline-adapters";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import type { SubflowDefinition } from "@/types/workflow";

export function getAutocompleteSuggestions(
  pipeline: Pipeline | undefined,
  currentStepId: string,
  envVars: Record<string, string> = {},
  executionContext: Record<string, unknown> = {},
  subflowDefinitions: SubflowDefinition[] = [],
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
  const compiled = compileExecutionPlan({
    ...toCompilePlanInput(pipeline),
    subflowDefinitions,
  });
  const orderIndexByNodeId = new Map(
    compiled.plan.nodes.map((node) => [node.nodeId, node.orderIndex]),
  );
  const currentOrderIndex = resolveCurrentOrderIndex(currentStepId, compiled.plan.nodes);
  if (currentOrderIndex === null) return suggestions;
  const seenPaths = new Set<string>();

  for (const alias of compiled.aliases) {
    const aliasOrderIndex = orderIndexByNodeId.get(alias.stepId);
    if (aliasOrderIndex === undefined || aliasOrderIndex >= currentOrderIndex) continue;
    const displayRef = pickDisplayRef(alias.refs);
    if (!displayRef) continue;
    const runtimeRef = alias.refs.find((ref) => executionContext[ref] !== undefined) ?? displayRef;
    const statusPath = `${displayRef}.response.status`;
    if (seenPaths.has(statusPath)) continue;
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

    const stepContext = executionContext[runtimeRef] as Record<string, unknown> | undefined;
    if (!stepContext?.response || typeof stepContext.response !== "object") {
      pushUniqueSuggestion(suggestions, seenPaths, {
        path: `${displayRef}.response.headers`,
        label: `${displayRef} → Response Headers`,
        stepId: alias.stepId,
        type: "header",
      });
      pushUniqueSuggestion(suggestions, seenPaths, {
        path: `${displayRef}.response.body`,
        label: `${displayRef} → Response Body`,
        stepId: alias.stepId,
        type: "body",
      });
      continue;
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

function resolveCurrentOrderIndex(
  currentStepId: string,
  nodes: Array<{ nodeId: string; orderIndex: number; origin?: { originNodeId?: string } }>,
) {
  const directMatch = nodes.find((node) => node.nodeId === currentStepId);
  if (directMatch) return directMatch.orderIndex;
  const subflowMatch = nodes
    .filter((node) => node.origin?.originNodeId === currentStepId)
    .sort((left, right) => left.orderIndex - right.orderIndex)[0];
  return subflowMatch?.orderIndex ?? null;
}

function pickDisplayRef(refs: string[]) {
  return (
    refs.find((ref) => isFriendlyDisplayRef(ref)) ??
    refs.find((ref) => /^req\d+$/.test(ref)) ??
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
  return Boolean(right && looksLikeUuid(left) && looksLikeUuid(right));
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
