"use client";

import { createBlockRegistry } from "@luzo/flow-builder";
import type { Pipeline } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import { createAiBlockDef } from "./AiBlockDef";
import { createIfBlockDef } from "./IfBlockDef";
import { displayBlockDef } from "./DisplayBlockDef";
import {
  delayBlockDef,
  endBlockDef,
  groupBlockDef,
  listBlockDef,
  startBlockDef,
  textBlockDef,
} from "./MiscBlockDefs";
import {
  createAssertBlockDef,
  createForEachBlockDef,
  createLogBlockDef,
  createPollBlockDef,
  createTransformBlockDef,
  createWebhookWaitBlockDef,
} from "./WorkflowBlockDefs";
import { createRequestBlockDef } from "./RequestBlockDef";
import { createSwitchBlockDef } from "./SwitchBlockDef";

export function createLuzoBlockRegistry(
  blockMap: Map<string, unknown>,
  options?: {
    getNodeSuggestions?: (nodeId: string) => VariableSuggestion[];
    getNodeRuntimeRef?: (nodeId: string) => string | null;
    pipeline?: Pipeline | null;
  },
) {
  const getSuggestions = options?.getNodeSuggestions;

  return createBlockRegistry([
    startBlockDef,
    createRequestBlockDef(blockMap, getSuggestions),
    createIfBlockDef(getSuggestions),
    createAiBlockDef(options?.pipeline ?? null),
    delayBlockDef,
    endBlockDef,
    listBlockDef,
    displayBlockDef,
    textBlockDef,
    groupBlockDef,
    createForEachBlockDef(getSuggestions),
    createTransformBlockDef(getSuggestions, options?.getNodeRuntimeRef),
    createLogBlockDef(getSuggestions),
    createAssertBlockDef(getSuggestions),
    createWebhookWaitBlockDef(options?.getNodeRuntimeRef),
    createPollBlockDef(getSuggestions),
    createSwitchBlockDef(getSuggestions),
  ]);
}
