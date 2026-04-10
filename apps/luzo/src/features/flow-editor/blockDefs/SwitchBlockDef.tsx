"use client";

import type { BlockDefinition, FlowNode, SwitchNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { SwitchInspector } from "../inspectors/SwitchInspector";

export function createSwitchBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "switch",
    minWidth: 304,
    handles: (node: FlowNode) => {
      const switchNode = node as SwitchNode;
      const cases = switchNode.data?.cases ?? [];
      return [
        { id: "input", position: "left", type: "target" },
        ...cases.map((c) => ({
          id: c.id,
          position: "right" as const,
          type: "source" as const,
          label: c.label,
        })),
      ];
    },
    renderInspector: (node, api) => (
      <SwitchInspector
        api={api}
        node={node as SwitchNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}
