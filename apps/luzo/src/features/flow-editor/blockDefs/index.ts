import { createBlockRegistry } from "@luzo/flow-builder";
import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { createAiBlockDef } from "./AiBlockDef";
import { createEvaluateBlockDef } from "./EvaluateBlockDef";
import { displayBlockDef } from "./DisplayBlockDef";
import { groupBlockDef, listBlockDef, startBlockDef, textBlockDef } from "./MiscBlockDefs";
import { createRequestBlockDef } from "./RequestBlockDef";

export function createLuzoBlockRegistry(
  blockMap: Map<string, unknown>,
  options?: {
    getNodeSuggestions?: (nodeId: string) => VariableSuggestion[];
    pipeline?: Pipeline | null;
  },
) {
  return createBlockRegistry([
    startBlockDef,
    createRequestBlockDef(blockMap, options?.getNodeSuggestions),
    createEvaluateBlockDef(options?.getNodeSuggestions),
    createAiBlockDef(options?.pipeline ?? null),
    listBlockDef,
    displayBlockDef,
    textBlockDef,
    groupBlockDef,
  ]);
}
