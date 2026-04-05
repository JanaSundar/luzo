import type { VariableSuggestion } from "@/types/pipeline-debug";

export interface PresentedSuggestion {
  alias: string | null;
  detail: string;
  groupLabel: string;
  requestName: string | null;
}

export function presentTemplateSuggestion(suggestion: VariableSuggestion): PresentedSuggestion {
  if (suggestion.type === "env") {
    return {
      alias: null,
      detail: suggestion.label,
      groupLabel: "Environment",
      requestName: null,
    };
  }

  const alias = suggestion.sourceAlias ?? getAliasFromPath(suggestion.path);
  const { requestName, trailingLabel } = splitSuggestionLabel(suggestion.label);
  const preferredRequestName = getPreferredRequestName(suggestion, requestName);
  const detail = alias
    ? suggestion.path.slice(alias.length + 1) || trailingLabel || suggestion.path
    : trailingLabel || suggestion.path;

  return {
    alias,
    detail,
    groupLabel: preferredRequestName ?? suggestion.stepId ?? "Suggestion",
    requestName: preferredRequestName,
  };
}

function getAliasFromPath(path: string) {
  const dotIndex = path.indexOf(".");
  if (dotIndex <= 0) return null;
  return path.slice(0, dotIndex);
}

function splitSuggestionLabel(label: string) {
  const [requestName, ...rest] = label.split("→").map((part) => part.trim());
  return {
    requestName: requestName || null,
    trailingLabel: rest.join(" → ") || null,
  };
}

function getPreferredRequestName(suggestion: VariableSuggestion, fallbackName: string | null) {
  const sourceLabel = suggestion.sourceLabel?.trim();
  if (sourceLabel && sourceLabel.toLowerCase() !== "new request") {
    return sourceLabel;
  }

  if (suggestion.sourceMethod && suggestion.sourceUrl) {
    return `${suggestion.sourceMethod} ${suggestion.sourceUrl}`;
  }

  return sourceLabel || fallbackName;
}
