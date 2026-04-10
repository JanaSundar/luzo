"use client";

import type { BlockDefinition, IfNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { IfInspector } from "../inspectors/IfInspector";

export function createIfBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "if",
    minWidth: 304,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "true", position: "right", type: "source" },
      { id: "false", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <IfInspector api={api} node={node as IfNode} suggestions={getSuggestions?.(node.id) ?? []} />
    ),
  };
}
