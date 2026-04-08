"use client";

import type { BlockDefinition, EvaluateNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { EvaluateInspector } from "../inspectors/BlockInspectors";

export function createEvaluateBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "evaluate",
    minWidth: 304,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "true", position: "right", type: "source", label: "True" },
      { id: "false", position: "right", type: "source", label: "False" },
    ],
    renderInspector: (node, api) => (
      <EvaluateInspector
        api={api}
        node={node as EvaluateNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}
