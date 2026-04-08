import type { FlowEdge, HandleId } from "@luzo/flow-types";

interface EdgeAppearanceOptions {
  preview?: boolean;
  selected?: boolean;
  sourceHandleId?: HandleId;
  type?: FlowEdge["type"];
}

interface EdgeAppearance {
  accent: string;
  dasharray?: string;
  glow: string;
  markerEnd: string;
  stroke: string;
  strokeWidth: string;
}

const DOTTED_DASH = "1 8";

export function getEdgeAppearance({
  preview,
  selected,
  sourceHandleId,
  type,
}: EdgeAppearanceOptions): EdgeAppearance {
  if (sourceHandleId === "success" || sourceHandleId === "true") {
    return {
      accent: "var(--fb-edge-success-accent, rgba(34, 197, 94, 0.18))",
      dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
      glow: "var(--fb-edge-success-glow, rgba(34, 197, 94, 0.26))",
      markerEnd: "url(#flow-builder-edge-arrow-success)",
      stroke: "var(--fb-edge-success-stroke, #16a34a)",
      strokeWidth: preview ? "3.25" : "2.75",
    };
  }

  if (sourceHandleId === "fail" || sourceHandleId === "false") {
    return {
      accent: "var(--fb-edge-fail-accent, rgba(239, 68, 68, 0.18))",
      dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
      glow: "var(--fb-edge-fail-glow, rgba(239, 68, 68, 0.24))",
      markerEnd: "url(#flow-builder-edge-arrow-fail)",
      stroke: "var(--fb-edge-fail-stroke, #dc2626)",
      strokeWidth: preview ? "3.25" : "2.75",
    };
  }

  if (type === "variable") {
    return {
      accent: "var(--fb-edge-preview-accent, rgba(37, 99, 235, 0.16))",
      dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
      glow: "var(--fb-edge-preview-glow, rgba(37, 99, 235, 0.22))",
      markerEnd: "url(#flow-builder-edge-arrow-variable)",
      stroke: "var(--fb-edge-preview-stroke, #2563eb)",
      strokeWidth: preview ? "3" : "2.5",
    };
  }

  if (selected) {
    return {
      accent: "var(--fb-edge-selected-accent, rgba(37, 99, 235, 0.16))",
      dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
      glow: "var(--fb-edge-selected-glow, rgba(37, 99, 235, 0.22))",
      markerEnd: "url(#flow-builder-edge-arrow-selected)",
      stroke: "var(--fb-edge-stroke-selected, #2563eb)",
      strokeWidth: preview ? "3" : "2.75",
    };
  }

  if (type === "conditional") {
    return {
      accent: "var(--fb-edge-conditional-accent, rgba(217, 119, 6, 0.16))",
      dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
      glow: "var(--fb-edge-conditional-glow, rgba(217, 119, 6, 0.2))",
      markerEnd: "url(#flow-builder-edge-arrow-conditional)",
      stroke: "var(--fb-edge-conditional-stroke, #d97706)",
      strokeWidth: preview ? "3" : "2.5",
    };
  }

  return {
    accent: "var(--fb-edge-accent, rgba(71, 85, 105, 0.12))",
    dasharray: `var(--fb-edge-dash-pattern, ${DOTTED_DASH})`,
    glow: "var(--fb-edge-glow, rgba(71, 85, 105, 0.18))",
    markerEnd: "url(#flow-builder-edge-arrow-default)",
    stroke: preview ? "var(--fb-edge-preview-stroke, #2563eb)" : "var(--fb-edge-stroke, #475569)",
    strokeWidth: preview ? "3" : "2.5",
  };
}
