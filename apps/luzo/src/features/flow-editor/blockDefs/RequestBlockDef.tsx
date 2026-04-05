"use client";

import type { BlockDefinition, RequestNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import type { RequestBlock } from "../domain/types";
import { RequestInspector } from "../inspectors/RequestInspector";

export function createRequestBlockDef(
  blockMap: Map<string, unknown>,
  getSuggestions?: (requestId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "request",
    minWidth: 312,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "success", position: "right", type: "source", label: "Success" },
      { id: "fail", position: "right", type: "source", label: "Fail" },
    ],
    renderInspector: (node, api) => (
      <RequestInspector
        api={api}
        block={blockMap.get(node.id) as RequestBlock | undefined}
        node={node as RequestNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}
